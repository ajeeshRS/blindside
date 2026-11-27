"use client";

import { slotIndex, slotPda, STATUS, type SlotAccount } from "@blindside/client";
import { Eye, Loader2, Lock, LockOpen, ShieldCheck, ShieldX } from "lucide-react";
import { TerminalPanel } from "./terminal";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { recheckAttestation, useTeeAttestation } from "@/lib/blindside/attest";
import { getReader, toResult, type RoundResult } from "@/lib/blindside/results";
import { scheduleAt } from "@/lib/schedule";

/*
 * "Try to peek": make the exact request a bot would make for a round, from
 * this browser, against MagicBlock's private rollup, and show the real answer.
 * A running round's account has a permission with no readers, so the rollup
 * answers as if it didn't exist (`value: null`). A revealed round is public.
 * Nothing here is mocked: both answers come straight from the RPC.
 */

type Peek = {
  round: number;
  address: string;
  /** Seconds into its round when the request was made (current round only). */
  at: number | null;
  ms: number;
  sealed: boolean;
  result: RoundResult | null;
};

async function peekAt(round: number, at: number | null): Promise<Peek> {
  const reader = await getReader();
  const address = slotPda(slotIndex(round));
  const t0 = performance.now();
  const info = await reader.provider.connection.getAccountInfo(address);
  const ms = Math.round(performance.now() - t0);
  let result: RoundResult | null = null;
  if (info) {
    const slot = reader.coder.accounts.decode("slot", info.data) as SlotAccount;
    // The slot is reused every 8 rounds: only count it if it's this round, revealed.
    if (slot.round.toNumber() === round && slot.status === STATUS.revealed) result = toResult(slot);
  }
  return { round, address: address.toBase58(), at, ms, sealed: !result, result };
}

const mmss = (s: number) => `0:${String(s).padStart(2, "0")}`;

export function PeekPanel({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peeks, setPeeks] = useState<{ now: Peek; before: Peek } | null>(null);
  const attest = useTeeAttestation();

  // Arriving from the landing page's "Try it on a live round" link.
  useEffect(() => {
    if (window.location.hash !== "#peek") return;
    const id = setTimeout(() => document.getElementById("peek")?.scrollIntoView({ behavior: "smooth", block: "start" }), 1200);
    return () => clearTimeout(id);
  }, []);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const s = scheduleAt(Date.now());
      // The running round, and the same request for the one before it: proof
      // the request works, because that round is revealed and comes back in full.
      const [now, before] = await Promise.all([peekAt(s.round, s.t), peekAt(s.round - 1, null)]);
      setPeeks({ now, before });
    } catch (e) {
      setError((e as Error).message || "The private rollup didn't answer. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <TerminalPanel
      className={cn("scroll-mt-88", className)}
      title={<span id="peek">Proof</span>}
      meta={
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex h-26 items-center gap-6 rounded-8 bg-bg-inverse px-10 text-[12px] font-[600] text-text-inverse transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-13 animate-spin" aria-hidden /> : <Eye className="size-13" aria-hidden />}
          {peeks ? "Peek again" : "Try to peek"}
        </button>
      }
      bodyClassName="overflow-y-auto"
    >
      <ul className="text-[13px] [&>li]:flex [&>li]:min-h-38 [&>li]:items-center [&>li]:gap-10 [&>li]:px-14 [&>li:not(:first-child)]:border-t [&>li]:border-line" aria-live="polite">
        <li title="Your browser sent the rollup a random challenge; it answered with a hardware quote signed by the CPU, checked here against Intel's certificates.">
          {attest.status === "checking" ? (
            <Loader2 className="size-14 shrink-0 animate-spin text-text-tertiary" aria-hidden />
          ) : attest.status === "ok" ? (
            <ShieldCheck className="size-14 shrink-0 text-text-up" aria-hidden />
          ) : (
            <ShieldX className="size-14 shrink-0 text-text-down" aria-hidden />
          )}
          <span className="min-w-0 flex-1 truncate">Intel TDX enclave</span>
          <span
            className={cn(
              "shrink-0 font-code text-[12px]",
              attest.status === "ok" ? "text-text-up" : attest.status === "failed" ? "text-text-down" : "text-text-tertiary",
            )}
          >
            {attest.status === "checking" ? "checking…" : attest.status === "ok" ? `attested · ${(attest.ms / 1000).toFixed(1)} s` : (
              <button className="underline underline-offset-4" onClick={recheckAttestation}>
                not verified · retry
              </button>
            )}
          </span>
        </li>
        {!peeks && !error && (
          <li className="text-text-tertiary">
            <Eye className="size-14 shrink-0" aria-hidden />
            Ask the rollup for this round, like a bot would.
          </li>
        )}
        {error && <li className="text-text-down">{error.slice(0, 90)}</li>}
        {peeks && <PeekRow peek={peeks.now} current />}
        {peeks && peeks.now.sealed && <PeekRow peek={peeks.before} />}
      </ul>
    </TerminalPanel>
  );
}

/** One request, one line: which round, and what the rollup really answered. */
function PeekRow({ peek: p, current }: { peek: Peek; current?: boolean }) {
  return (
    <li title={`getAccountInfo(${p.address}) · ${p.ms} ms`}>
      {p.sealed ? (
        <Lock className="size-14 shrink-0 text-text-primary" aria-hidden />
      ) : (
        <LockOpen className="size-14 shrink-0 text-text-up" aria-hidden />
      )}
      <span className="min-w-0 flex-1 truncate">
        {current ? "Live" : "Last"}{" "}
        <span className="font-code text-text-tertiary">#{p.round.toLocaleString("en-US")}</span>
      </span>
      <span className={cn("shrink-0 font-code text-[12px]", p.sealed ? "text-text-primary" : "text-text-up")}>
        {p.sealed
          ? "null · sealed"
          : p.result
            ? `readable · ${mmss(p.result.closeS)}${p.result.verified ? " ✓" : ""}`
            : "readable"}
      </span>
    </li>
  );
}
