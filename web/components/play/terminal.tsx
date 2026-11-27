"use client";

import { SIDE } from "@blindside/client";
import { ROUND } from "@/lib/config";
import { ArrowDownRight, ArrowUpRight, Loader2, ShieldCheck, ShieldX } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { statusOf } from "@/components/app/history-view";
import { LiveDot } from "@/components/ui/pill";
import { getArchiveList, getArchived, getNoArchive, subscribeArchive } from "@/lib/blindside/archive";
import { useTeeAttestation } from "@/lib/blindside/attest";
import { getCalls, getNoCalls, subscribeCalls } from "@/lib/blindside/my-calls";
import { fetchRecentRounds, type RoundResult } from "@/lib/blindside/results";
import { useSession } from "@/lib/blindside/session";
import { cn } from "@/lib/cn";
import { formatPct, formatUsd } from "@/lib/format";
import { trend, usePriceFeed } from "@/lib/price-feed";
import { formatCountdown, scheduleAt } from "@/lib/schedule";
import { useNow } from "@/lib/use-now";
import { useThrottled } from "@/lib/use-throttled";

/*
 * Play as a trading terminal: flat bordered panels, tabular numbers, and only
 * what a player acts on. Every value here is live: the feed, the wall-clock
 * round schedule, this browser's calls, revealed rounds read from the rollup,
 * and the TEE attestation.
 */

export function TerminalPanel({
  title,
  meta,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col overflow-hidden rounded-12 border border-line bg-bg-elevated in-data-[theme=dark]:bg-[hsl(240_8%_5%)]", className)}>
      <header className="flex h-40 shrink-0 items-center justify-between gap-12 border-b border-line px-14">
        <h2 className="text-[12.5px] font-[600] tracking-[-0.01em] text-text-secondary">{title}</h2>
        {meta && <div className="flex items-center gap-8 text-[12px] text-text-tertiary">{meta}</div>}
      </header>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

function Stat({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col justify-center gap-2 px-10 py-10 sm:px-14 md:px-16", className)}>
      <span className="truncate text-[11.5px] leading-[14px] text-text-tertiary">{label}</span>
      <span className="truncate font-code text-[13px] leading-[18px] font-[500] tabular-nums sm:text-[14px]">{children}</span>
    </div>
  );
}

const PHASE: Record<string, { label: string; until: string; open: boolean }> = {
  sure: { label: "Calls open", until: "closes by", open: true },
  maybe: { label: "Calls open", until: "closes by", open: true },
  developing: { label: "Calls closed", until: "result in", open: false },
  reveal: { label: "Revealing", until: "next in", open: false },
};

/** Live market strip: price, 30 s change, round, phase, feed and enclave status. */
export function MarketBar() {
  const feed = usePriceFeed();
  const price = useThrottled(feed.last?.price ?? null, 250);
  const now = useNow();
  const s = now ? scheduleAt(now) : null;
  const t = feed.last ? trend() : null;
  const colored = s?.phase === "sure";
  const agrees =
    colored && t && t.pct !== null && (t.dir === "up" ? t.pct >= 0 : t.dir === "down" ? t.pct <= 0 : false);
  const phase = s ? PHASE[s.phase] : null;
  const target = s ? (phase?.open ? s.roundStart + ROUND.closeLatest * 1000 : s.countdownTo) : 0;
  const attest = useTeeAttestation();
  const feedStatus = feed.status === "live" ? "live" : feed.status === "stale" ? "stale" : "off";

  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-12 border border-line bg-bg-elevated in-data-[theme=dark]:bg-[hsl(240_8%_5%)] lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))] [&>*]:border-line max-lg:[&>*:first-child]:border-b lg:[&>*:not(:last-child)]:border-r">
      <div className="col-span-3 flex min-w-0 items-center gap-12 px-14 py-10 md:px-16 lg:col-span-1">
        <div className="min-w-0">
          <p className="flex items-center gap-6 text-[11.5px] leading-[14px] text-text-tertiary">
            <LiveDot status={feedStatus} />
            SOL / USD · Pyth Lazer
          </p>
          <p className="font-display text-[30px] leading-[34px] tabular-nums">
            {price === null ? <span className="text-text-tertiary">$—</span> : formatUsd(price, 3)}
          </p>
        </div>
      </div>
      <Stat label="30 s change">
        {t && t.pct !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-2",
              agrees && t.dir === "up" && "text-text-up",
              agrees && t.dir === "down" && "text-text-down",
            )}
          >
            {t.pct >= 0 ? <ArrowUpRight className="size-14" aria-hidden /> : <ArrowDownRight className="size-14" aria-hidden />}
            {formatPct(t.pct, 3)}
          </span>
        ) : (
          "—"
        )}
      </Stat>
      <Stat label="Round">{s ? `#${s.round.toLocaleString("en-US")}` : "—"}</Stat>
      <Stat label={phase ? `${phase.label} · ${phase.until}` : "Round clock"}>
        <span className={cn(phase?.open && "text-text-up")}>{s ? formatCountdown(target - now) : "0:00"}</span>
      </Stat>
            <Stat label="Private rollup" className="max-lg:hidden">
        <span
          className={cn(
            "inline-flex items-center gap-6",
            attest.status === "ok" && "text-text-up",
            attest.status === "failed" && "text-text-down",
          )}
          title="Intel TDX attestation, verified in this browser against Intel's certificates"
        >
          {attest.status === "checking" ? (
            <Loader2 className="size-13 animate-spin" aria-hidden />
          ) : attest.status === "ok" ? (
            <ShieldCheck className="size-14" aria-hidden />
          ) : (
            <ShieldX className="size-14" aria-hidden />
          )}
          {attest.status === "checking" ? "Attesting…" : attest.status === "ok" ? "TDX attested" : "Not verified"}
        </span>
      </Stat>
    </div>
  );
}

const usdc = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const closeAt = (s: number) => `0:${String(s).padStart(2, "0")}`;

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table className="w-full table-fixed text-[13px]">
      <colgroup>
        <col className="w-[24%]" />
        <col className="w-[24%]" />
        <col className="w-[26%]" />
        <col className="w-[26%]" />
      </colgroup>
      <thead>
        <tr className="text-left text-[11.5px] text-text-tertiary">
          {head.map((h, i) => (
            <th key={h} className={cn("h-32 px-14 font-[500]", i === head.length - 1 && "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="font-code tabular-nums [&>tr]:border-t [&>tr]:border-line [&_td]:h-34 [&_td]:px-14 [&_td]:whitespace-nowrap [&_td:last-child]:text-right">
        {children}
      </tbody>
    </table>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-14 py-18 text-[13px] leading-[1.5] text-text-tertiary">{children}</p>;
}

/** This wallet's latest calls and how they settled. */
export function PositionsPanel({ className }: { className?: string }) {
  const { publicKey } = useSession();
  const address = publicKey?.toBase58() ?? null;
  const now = useNow();
  const calls = useSyncExternalStore(subscribeCalls, getCalls, getNoCalls);
  useSyncExternalStore(subscribeArchive, getArchiveList, getNoArchive);
  const mine = useMemo(() => (address ? calls.filter((c) => c.wallet === address).slice(0, 6) : []), [calls, address]);

  return (
    <TerminalPanel
      className={className}
      bodyClassName="overflow-y-auto"
      title="Your calls"
      meta={
        <Link href="/history" className="font-[500] text-text-secondary hover:text-text-primary">
          History →
        </Link>
      }
    >
      {!address ? (
        <Empty>Connect a wallet or press Play instantly to make your first call.</Empty>
      ) : mine.length === 0 ? (
        <Empty>No calls yet. Calls in the first 10 seconds always count.</Empty>
      ) : (
        <Table head={["Round", "Side", "Stake", "Result"]}>
          {mine.map((c) => {
            const r = getArchived(c.round);
            const { status, net } = statusOf(c, r, now);
            const live = now && Math.floor(now / 90_000) === c.round;
            return (
              <tr key={`${c.round}-${c.sig}`}>
                <td className="truncate">#{String(c.round).slice(-5)}</td>
                <td className={c.side === SIDE.up ? "text-text-up" : "text-text-down"}>
                  {c.side === SIDE.up ? "▲ Higher" : "▼ Lower"}
                </td>
                <td>{usdc(c.amount)}</td>
                <td
                  title={
                    status === "refunded" && r
                      ? r.calls.find((x) => x.player === c.wallet)?.late
                        ? `Your call landed after the secret close (${closeAt(r.closeS)}), so it was refunded`
                        : r.outcome === "void" && r.voidCode === 6
                          ? "Nobody took the other side, so everyone got their stake back"
                          : `Round voided: ${r.voidReason || "refunded in full"}`
                      : undefined
                  }
                  className={cn(
                    status === "won" && "text-text-up",
                    status === "lost" && "text-text-down",
                    (status === "refunded" || status === "pending" || status === "missing") && "text-text-tertiary",
                  )}
                >
                  {status === "won"
                    ? `+${usdc(net)}`
                    : status === "lost"
                      ? `−${usdc(c.amount)}`
                      : status === "refunded"
                        ? "Refunded"
                        : status === "pending"
                          ? live
                            ? "Sealed"
                            : "Settling"
                          : "—"}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </TerminalPanel>
  );
}

/** Revealed rounds still on chain, read from the rollup: the public tape. */
export function RoundsTapePanel({ className }: { className?: string }) {
  const [rounds, setRounds] = useState<RoundResult[] | null>(null);
  useEffect(() => {
    let stop = false;
    const load = () =>
      fetchRecentRounds()
        .then((r) => !stop && setRounds(r))
        .catch(() => !stop && setRounds((x) => x ?? []));
    void load();
    const id = setInterval(load, 20_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  return (
    <TerminalPanel
      className={className}
      bodyClassName="overflow-y-auto"
      title="Last rounds"
      meta={<span>revealed · verifiable</span>}
    >
      {rounds === null ? (
        <Empty>
          <span className="inline-flex items-center gap-8">
            <Loader2 className="size-13 animate-spin" aria-hidden /> Reading the rollup…
          </span>
        </Empty>
      ) : rounds.length === 0 ? (
        <Empty>No revealed rounds right now.</Empty>
      ) : (
        <Table head={["Round", "Close", "Move", "Result"]}>
          {rounds.slice(0, 6).map((r) => {
            const pct = r.strike && r.settle !== null ? ((r.settle - r.strike) / r.strike) * 100 : null;
            return (
              <tr key={r.round}>
                <td className="truncate">#{String(r.round).slice(-5)}</td>
                <td>
                  {closeAt(r.closeS)}
                  {r.verified && <span className="ml-4 text-text-up">✓</span>}
                </td>
                <td className={cn(pct !== null && (pct >= 0 ? "text-text-up" : "text-text-down"))}>
                  {pct === null ? "—" : `${pct >= 0 ? "+" : ""}${pct.toFixed(3)}%`}
                </td>
                <td
                  className={cn(
                    r.outcome === "up" && "text-text-up",
                    r.outcome === "down" && "text-text-down",
                    r.outcome === "void" && "text-text-tertiary",
                  )}
                >
                  {r.outcome === "up" ? "Higher" : r.outcome === "down" ? "Lower" : r.calls.length ? "Refund" : "Empty"}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </TerminalPanel>
  );
}
