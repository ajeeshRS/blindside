"use client";

import { Connection, type AccountInfo } from "@solana/web3.js";
import { useSyncExternalStore } from "react";
import { ER_HTTP_URL, ER_WS_URL, ORACLE_PROGRAM_ID, SOL_USD_FEED } from "./config";

/**
 * Live SOL/USD from MagicBlock's pricing oracle (Pyth Lazer, pushed to the
 * Ephemeral Rollup every 50–200 ms). One shared subscription for the whole app.
 *
 * Account layout (134 bytes): discriminator (8) · write authority (32) ·
 * verification level (1) · feed id (32) · price i64 @73 · conf u64 @81 ·
 * exponent i32 @89 · publish time i64 @93 · …
 */

export type Tick = {
  /** Local receive time (ms since epoch). */
  t: number;
  price: number;
  conf: number;
  /** Publisher timestamp (seconds since epoch). */
  publishTime: number;
};

export type FeedStatus = "idle" | "connecting" | "live" | "stale" | "error";

export type FeedSnapshot = {
  status: FeedStatus;
  transport: "websocket" | "polling" | null;
  last: Tick | null;
  /** Measured updates per second over the last 5 s. */
  updatesPerSecond: number;
  error: string | null;
  version: number;
};

const WINDOW_MS = 120_000;
const STALE_AFTER_MS = 3_000;
const POLL_IF_SILENT_MS = 1_200;
const POLL_EVERY_MS = 400;

export function decodePriceFeed(data: Uint8Array) {
  if (data.length < 101) throw new Error("Price feed account is too small");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const raw = view.getBigInt64(73, true);
  const conf = view.getBigUint64(81, true);
  // MagicBlock's devnet feed stores the exponent's magnitude (8 for SOL/USD,
  // i.e. 10^-8); accept either sign.
  const storedExponent = view.getInt32(89, true);
  const exponent = -Math.abs(storedExponent);
  const publishTime = Number(view.getBigInt64(93, true));
  if (exponent < -18) throw new Error("Unexpected price feed layout");
  const scale = 10 ** exponent;
  const price = Number(raw) * scale;
  if (!(price > 0 && price < 10_000_000)) throw new Error("Price feed returned an implausible price");
  return { price, conf: Number(conf) * scale, publishTime };
}

class PriceFeedStore {
  private ticks: Tick[] = [];
  private listeners = new Set<() => void>();
  private snapshot: FeedSnapshot = {
    status: "idle",
    transport: null,
    last: null,
    updatesPerSecond: 0,
    error: null,
    version: 0,
  };
  private connection: Connection | null = null;
  private subscriptionId: number | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private lastReceive = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    if (!this.connection) this.start();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stopTimer = setTimeout(() => this.stop(), 5_000);
      }
    };
  };

  getSnapshot = () => this.snapshot;

  getServerSnapshot = () => SERVER_SNAPSHOT;

  /** Ticks inside the rolling window, oldest first. Read-only. */
  getTicks = (): readonly Tick[] => this.ticks;

  private emit(patch: Partial<FeedSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch, version: this.snapshot.version + 1 };
    this.listeners.forEach((l) => l());
  }

  private start() {
    this.emit({ status: "connecting", error: null });
    this.connection = new Connection(ER_HTTP_URL, {
      wsEndpoint: ER_WS_URL,
      commitment: "processed",
    });
    try {
      this.subscriptionId = this.connection.onAccountChange(
        SOL_USD_FEED,
        (info) => this.ingest(info, "websocket"),
        { commitment: "processed" },
      );
    } catch {
      this.subscriptionId = null;
    }
    void this.poll();
    this.pollTimer = setInterval(() => {
      const silentFor = Date.now() - this.lastReceive;
      if (silentFor > POLL_IF_SILENT_MS) void this.poll();
      if (this.lastReceive && silentFor > STALE_AFTER_MS && this.snapshot.status === "live") {
        this.emit({ status: "stale" });
      }
    }, POLL_EVERY_MS);
  }

  private stop() {
    if (this.connection && this.subscriptionId !== null) {
      void this.connection.removeAccountChangeListener(this.subscriptionId).catch(() => {});
    }
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.connection = null;
    this.subscriptionId = null;
    this.pollTimer = null;
    this.emit({ status: "idle", transport: null });
  }

  private async poll() {
    const connection = this.connection;
    if (!connection) return;
    try {
      const info = await connection.getAccountInfo(SOL_USD_FEED, "processed");
      if (!info) throw new Error("SOL/USD feed account not found on the rollup");
      this.ingest(info, "polling");
    } catch (err) {
      if (!this.snapshot.last) {
        this.emit({
          status: "error",
          error: err instanceof Error ? err.message : "Couldn't reach the price feed",
        });
      }
    }
  }

  private ingest(info: AccountInfo<Buffer>, transport: "websocket" | "polling") {
    if (!info.owner.equals(ORACLE_PROGRAM_ID)) {
      this.emit({ status: "error", error: "Price feed is owned by an unexpected program" });
      return;
    }
    let decoded: ReturnType<typeof decodePriceFeed>;
    try {
      decoded = decodePriceFeed(info.data);
    } catch (err) {
      this.emit({ status: "error", error: err instanceof Error ? err.message : "Bad feed data" });
      return;
    }
    const now = Date.now();
    const prev = this.ticks[this.ticks.length - 1];
    this.lastReceive = now;
    if (prev && prev.price === decoded.price && prev.conf === decoded.conf && now - prev.t < 1_000) {
      if (this.snapshot.status !== "live") this.emit({ status: "live", transport });
      return;
    }
    const tick: Tick = { t: now, ...decoded };
    this.ticks.push(tick);
    const cutoff = now - WINDOW_MS;
    let drop = 0;
    while (drop < this.ticks.length && this.ticks[drop].t < cutoff) drop++;
    if (drop) this.ticks.splice(0, drop);

    const recent = this.ticks.filter((x) => x.t > now - 5_000).length;
    this.emit({
      status: "live",
      transport,
      last: tick,
      updatesPerSecond: recent / 5,
      error: null,
    });
  }
}

const SERVER_SNAPSHOT: FeedSnapshot = {
  status: "idle",
  transport: null,
  last: null,
  updatesPerSecond: 0,
  error: null,
  version: 0,
};

export const priceFeed = new PriceFeedStore();

export function usePriceFeed() {
  return useSyncExternalStore(
    priceFeed.subscribe,
    priceFeed.getSnapshot,
    priceFeed.getServerSnapshot,
  );
}

/** Price change over the last `windowMs`, from ticks we've seen this session. */
export function changeOver(windowMs: number) {
  const ticks = priceFeed.getTicks();
  if (ticks.length < 2) return null;
  const last = ticks[ticks.length - 1];
  const target = last.t - windowMs;
  let first = ticks[0];
  for (const tick of ticks) {
    if (tick.t >= target) {
      first = tick;
      break;
    }
  }
  if (first === last) return null;
  return {
    from: first.price,
    to: last.price,
    pct: ((last.price - first.price) / first.price) * 100,
    spanMs: last.t - first.t,
  };
}
