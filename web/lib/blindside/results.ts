"use client";

import {
  createProgram,
  keypairSigner,
  keypairWallet,
  OUTCOME,
  readSlot,
  recomputeOffset,
  ROUND,
  roundStart,
  slotIndex,
  STATUS,
  teeConnection,
  teeLogin,
  VOID_REASON,
  type BlindsideProgram,
  type SlotAccount,
} from "@blindside/client";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import { getArchived, saveRound } from "./archive";

/**
 * Reading a revealed round needs a login to the private rollup, but not a
 * wallet: an anonymous throwaway key, made in the browser, is enough. Anyone
 * can see results and verify the close.
 */
let reader: Promise<BlindsideProgram> | null = null;
export function getReader() {
  if (!reader) {
    reader = (async () => {
      const kp = Keypair.generate();
      const { token } = await teeLogin(keypairSigner(kp));
      return createProgram(teeConnection(token), keypairWallet(kp));
    })().catch((e) => {
      reader = null;
      throw e;
    });
  }
  return reader;
}

/** A revealed round as plain data (safe to cache in the browser). */
export type RoundResult = {
  round: number;
  /** Seconds after the start when the round secretly closed. */
  closeS: number;
  /** Close recomputed from the public secret and nonces matches the program's. */
  verified: boolean;
  strike: number | null;
  settle: number | null;
  /** Unix seconds the prices were recorded (0 if not). */
  strikeTs: number;
  settleTs: number;
  outcome: "up" | "down" | "void";
  voidCode: number;
  voidReason: string;
  upPool: number;
  downPool: number;
  /** The keeper's secret and how many calls were mixed in: everything needed to verify. */
  secret: string;
  seedCalls: number;
  /** MagicBlock VRF randomness mixed into the close (hex), or null if it didn't arrive in time. */
  vrf: string | null;
  calls: {
    player: string;
    side: number;
    amount: number;
    late: boolean;
    claimed: boolean;
    nonce: string;
  }[];
};

const hex = (bytes: ArrayLike<number>) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
export const fromHex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));

export function toResult(slot: SlotAccount): RoundResult {
  const calls = slot.calls.slice(0, slot.callCount);
  return {
    round: slot.round.toNumber(),
    closeS: slot.offsetS,
    verified:
      recomputeOffset(slot.secret, calls.slice(0, slot.seedCalls), slot.vrfReady ? slot.vrf : null) ===
      slot.offsetS,
    strike: slot.strikeTs.toNumber() ? slot.strike.toNumber() / 1e8 : null,
    settle: slot.settleTs.toNumber() ? slot.settle.toNumber() / 1e8 : null,
    strikeTs: slot.strikeTs.toNumber(),
    settleTs: slot.settleTs.toNumber(),
    outcome: slot.outcome === OUTCOME.up ? "up" : slot.outcome === OUTCOME.down ? "down" : "void",
    voidCode: slot.voidReason,
    voidReason: VOID_REASON[slot.voidReason] ?? "",
    upPool: slot.upPool.toNumber() / 1e6,
    downPool: slot.downPool.toNumber() / 1e6,
    secret: hex(slot.secret),
    seedCalls: slot.seedCalls,
    vrf: slot.vrfReady ? hex(slot.vrf) : null,
    calls: calls.map((c) => ({
      player: c.player.toBase58(),
      side: c.side,
      amount: c.amount.toNumber() / 1e6,
      late: c.late === 1,
      claimed: c.claimed === 1,
      nonce: hex(c.nonce),
    })),
  };
}

/** Recompute a result's close from its public data, in this browser. */
export function verifyClose(r: RoundResult) {
  return recomputeOffset(
    fromHex(r.secret),
    r.calls.slice(0, r.seedCalls).map((c) => ({ player: new PublicKey(c.player), nonce: fromHex(c.nonce) })),
    r.vrf ? fromHex(r.vrf) : null,
  );
}

/** A round's revealed result: from this browser's archive, else from chain (and archived). */
export async function fetchResult(round: number): Promise<RoundResult | null> {
  const cached = getArchived(round);
  if (cached) return cached;
  const r = await getReader();
  const slot = await readSlot(r, slotIndex(round));
  if (!slot || slot.round.toNumber() !== round || slot.status !== STATUS.revealed) return null;
  const result = toResult(slot);
  saveRound(result);
  return result;
}

/** Every revealed round still on chain (the last ~12 minutes), newest first. */
export async function fetchRecentRounds(): Promise<RoundResult[]> {
  const r = await getReader();
  const slots = await Promise.all(
    Array.from({ length: ROUND.slots }, (_, i) => readSlot(r, i).catch(() => null)),
  );
  const results = slots
    .filter((s): s is SlotAccount => Boolean(s && s.status === STATUS.revealed))
    .map(toResult)
    .sort((a, b) => b.round - a.round);
  results.forEach(saveRound);
  return results;
}

/** Poll for a round's result from its reveal time. */
export function useRoundResult(round: number | null) {
  const [result, setResult] = useState<RoundResult | null>(null);
  useEffect(() => {
    setResult(round === null ? null : getArchived(round));
    if (round === null) return;
    let stop = Boolean(getArchived(round));
    const tick = async () => {
      if (Date.now() < (roundStart(round) + ROUND.reveal) * 1000) return;
      const r = await fetchResult(round).catch(() => null);
      if (!stop && r) {
        setResult(r);
        stop = true;
      }
    };
    void tick();
    const id = setInterval(() => !stop && void tick(), 2000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [round]);
  return result;
}

/** What a call paid back, mirroring the program's payout rule. */
export function payoutFor(r: RoundResult, side: number, amount: number, late: boolean) {
  if (r.outcome === "void" || late) return amount;
  const win = (r.outcome === "up" ? 1 : 2) === side;
  if (!win) return 0;
  const [w, l] = r.outcome === "up" ? [r.upPool, r.downPool] : [r.downPool, r.upPool];
  return amount + (w > 0 ? (amount * l) / w : 0);
}
