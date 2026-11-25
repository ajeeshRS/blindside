"use client";

import { Fragment } from "react";
import { ROUND } from "@/lib/config";
import { cn } from "@/lib/cn";
import { formatCountdown, scheduleAt } from "@/lib/schedule";
import { useNow } from "@/lib/use-now";

/*
 * The live round, as a strip of three words: where the current round is in
 * its 90 seconds, read from the same wall-clock schedule the program uses.
 */
const STEPS = [
  { key: "open", label: "Calls open", until: ROUND.closeLatest },
  { key: "closed", label: "Calls closed", until: ROUND.revealAt },
  { key: "revealed", label: "Revealed", until: ROUND.cycle },
] as const;

export function PhaseTicker({ className }: { className?: string }) {
  const now = useNow();
  const s = now ? scheduleAt(now) : null;
  const active = s
    ? s.t < ROUND.closeLatest
      ? 0
      : s.t < ROUND.revealAt
        ? 1
        : 2
    : -1;
  const left = s ? s.roundStart + STEPS[Math.max(active, 0)].until * 1000 - now : 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-14 gap-y-6 text-label text-text-tertiary",
        className,
      )}
    >
      {STEPS.map((step, i) => (
        <Fragment key={step.key}>
          {i > 0 && <span className="size-[5px] bg-current opacity-40 max-sm:hidden" aria-hidden />}
          <span className={cn("transition-colors", i === active && "text-text-primary")}>
            {step.label}
            {i === active && (
              <span className="ml-6 font-mono text-accent tabular sm:ml-8">{formatCountdown(left)}</span>
            )}
          </span>
        </Fragment>
      ))}
      <span className="ml-auto max-sm:hidden">
        Round {s ? s.round.toLocaleString("en-US") : "—"}
      </span>
    </div>
  );
}

/** "Next round in 0:42": time until the next 90-second round opens. */
export function NextRoundIn({ className }: { className?: string }) {
  const now = useNow();
  const s = now ? scheduleAt(now) : null;
  return (
    <span className={cn("tabular", className)}>
      {s ? formatCountdown(s.roundStart + ROUND.cycle * 1000 - now) : "—:—"}
    </span>
  );
}
