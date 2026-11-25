"use client";

import { SIDE } from "@blindside/client";
import { ArrowDown, ArrowUp, BadgeCheck, Loader2 } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import type { MyCall } from "@/lib/blindside/my-calls";
import { payoutFor, useRoundResult } from "@/lib/blindside/results";
import { cn } from "@/lib/cn";

const price = (n: number | null) => (n === null ? "—" : `$${n.toFixed(4)}`);
const usdc = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/** Your latest call's round, once it has been revealed. */
export function RoundResultCard({ call }: { call: MyCall }) {
  const r = useRoundResult(call.round);

  if (!r) {
    return (
      <Panel label={`Round ${call.round.toLocaleString("en-US")}`}>
        <p className="flex items-center gap-8 px-16 py-14 text-[13px] text-text-tertiary md:px-20">
          <Loader2 className="size-14 animate-spin" aria-hidden />
          The result appears at the reveal.
        </p>
      </Panel>
    );
  }

  const mine = r.calls.find((c) => c.player === call.wallet);
  const late = mine?.late ?? false;
  const back = payoutFor(r, call.side, call.amount, late);
  const net = back - call.amount;
  // A late call is the more specific reason, so it wins over a one-sided void.
  const oneSided = r.outcome === "void" && r.voidCode === 6 && !late;
  const headline = late
    ? `Refunded: your call landed after the secret close (0:${String(r.closeS).padStart(2, "0")})`
    : r.outcome === "void"
      ? oneSided
        ? "Refunded: nobody took the other side"
        : "Refunded"
        : net > 0
          ? `You won +${usdc(net)} USDC`
          : "Not this time";

  return (
    <Panel
      label={`Round ${r.round.toLocaleString("en-US")}`}
      meta={
        <span
          className={cn(
            "font-mono text-[12px]",
            r.outcome === "up" ? "text-text-up" : r.outcome === "down" ? "text-text-down" : "text-text-tertiary",
          )}
        >
          {r.outcome === "up" ? "▲ Higher won" : r.outcome === "down" ? "▼ Lower won" : "Void"}
        </span>
      }
    >
      <div className="px-16 py-14 md:px-20">
        <p
          className={cn(
            "text-[18px] leading-[24px] font-[700] tracking-[-0.03em]",
            net > 0 && "text-text-up",
          )}
        >
          {headline}
        </p>
        <p className="mt-4 text-[13px] leading-[19px] text-text-secondary">
          You called{" "}
          {call.side === SIDE.up ? (
            <ArrowUp className="inline size-13 align-[-2px] text-text-up" aria-hidden />
          ) : (
            <ArrowDown className="inline size-13 align-[-2px] text-text-down" aria-hidden />
          )}{" "}
          {call.side === SIDE.up ? "Higher" : "Lower"} with {call.amount} USDC
          {back > 0 && r.outcome !== "void" && !late ? ` · got back ${usdc(back)}` : ""}
          {r.outcome === "void" && r.voidReason && !oneSided && !late ? ` · ${r.voidReason}` : ""}
        </p>
        {oneSided && (
          <p className="mt-4 text-[12px] leading-[17px] text-text-tertiary">
            Winners are paid from the other side&apos;s stakes, so a round needs calls on both
            Higher and Lower. Everyone got their stake back.
          </p>
        )}

        <dl className="mt-12 grid grid-cols-2 gap-x-12 gap-y-8 border-t border-dashed border-border-secondary-hover pt-12 text-[13px]">
          <div>
            <dt className="text-label text-text-tertiary">Secret close</dt>
            <dd className="mt-2 flex items-center gap-4 font-mono tabular">
              0:{String(r.closeS).padStart(2, "0")}
              {r.verified && (
                <BadgeCheck className="size-14 text-text-up" aria-label="Recomputed from public data" />
              )}
            </dd>
          </div>
          <div>
            <dt className="text-label text-text-tertiary">Pools (up / down)</dt>
            <dd className="mt-2 font-mono tabular">
              {usdc(r.upPool)} / {usdc(r.downPool)}
            </dd>
          </div>
          <div>
            <dt className="text-label text-text-tertiary">Start (at close)</dt>
            <dd className="mt-2 font-mono tabular">{price(r.strike)}</dd>
          </div>
          <div>
            <dt className="text-label text-text-tertiary">30 s later</dt>
            <dd className="mt-2 font-mono tabular">{price(r.settle)}</dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
}
