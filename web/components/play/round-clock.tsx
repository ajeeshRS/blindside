"use client";

import { ArrowDownRight, ArrowUpRight, EyeOff } from "lucide-react";
import { LiveDot } from "@/components/ui/pill";
import { ROUND } from "@/lib/config";
import { cn } from "@/lib/cn";
import { formatPct, formatUsd } from "@/lib/format";
import { trend, usePriceFeed } from "@/lib/price-feed";
import { PHASES } from "@/lib/round";
import { formatCountdown, scheduleAt } from "@/lib/schedule";
import { useNow } from "@/lib/use-now";
import { useThrottled } from "@/lib/use-throttled";

/*
 * Round clock pieces for the Play page. All of it comes from the wall-clock
 * 90-second schedule the program follows (round = floor(unix_ms / 90 000)),
 * plus the live feed — nothing here is invented.
 */

/** Live SOL price in mono, with the change over the last 90 s. */
export function PriceHead() {
  const feed = usePriceFeed();
  const price = useThrottled(feed.last?.price ?? null, 250);
  // The same 30 s momentum the chart line is coloured by, so they always agree.
  const t = feed.last ? trend() : null;
  // Same rule as the line: no colour once the hidden-close window starts.
  const now = useNow();
  const colored = Boolean(now) && scheduleAt(now).phase === "sure";
  const status = feed.status === "live" ? "live" : feed.status === "stale" ? "stale" : "off";
  const agrees =
    colored && t && t.pct !== null && (t.dir === "up" ? t.pct >= 0 : t.dir === "down" ? t.pct <= 0 : false);

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-8 text-label text-text-secondary">
        <LiveDot status={status} />
        SOL price
        {feed.status === "stale" && <span className="text-text-warning">· paused</span>}
      </div>
      <div className="mt-6 flex flex-wrap items-baseline gap-x-12 gap-y-2">
        <span className="font-display text-[40px] leading-[42px] md:text-[52px] md:leading-[54px]">
          {price === null ? <span className="text-text-tertiary">$—</span> : formatUsd(price, 3)}
        </span>
        {t && t.pct !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-2 font-mono text-[13px] tabular transition-colors duration-300",
              agrees && t.dir === "up" && "text-text-up",
              agrees && t.dir === "down" && "text-text-down",
              !agrees && "text-text-secondary",
            )}
            title="Change over the last 30 seconds, the same horizon as a call"
          >
            {t.pct >= 0 ? (
              <ArrowUpRight className="size-14" aria-hidden />
            ) : (
              <ArrowDownRight className="size-14" aria-hidden />
            )}
            {formatPct(t.pct, 3)}
            <span className="text-text-tertiary">{Math.max(1, Math.round(t.spanMs / 1000))}s</span>
          </span>
        )}
      </div>
    </div>
  );
}

/** Plain status for the round: can I call, and how long until the next thing. */
const STATUS: Record<
  (typeof PHASES)[number]["key"],
  { title: string; until: string; open: boolean }
> = {
  sure: { title: "Calls open", until: "Closes secretly by", open: true },
  maybe: { title: "Calls open", until: "Closes secretly by", open: true },
  developing: { title: "Calls closed", until: "Result in", open: false },
  reveal: { title: "Revealing", until: "Next round in", open: false },
};

export function RoundMeta() {
  const now = useNow();
  const s = now ? scheduleAt(now) : null;
  const st = s ? STATUS[s.phase] : null;
  // While calls are open, count to the latest possible close (50 s).
  const target = s
    ? st?.open
      ? s.roundStart + ROUND.closeLatest * 1000
      : s.countdownTo
    : 0;
  return (
    <div className="text-right">
      <p className="flex items-center justify-end gap-6 text-label whitespace-nowrap">
        <span
          className={cn("size-6 rounded-full", st?.open ? "bg-bg-up" : "bg-text-tertiary")}
          aria-hidden
        />
        <span className={st?.open ? "text-text-up" : "text-text-secondary"}>
          {st?.title ?? "Round clock"}
        </span>
      </p>
      <p className="mt-4 text-[12px] text-text-tertiary max-sm:hidden">{st?.until ?? ""}</p>
      <p
        className="font-display text-[38px] leading-[40px] md:text-[48px] md:leading-[50px]"
        role="timer"
        aria-label={st ? `${st.until} ${formatCountdown(target - now)}` : undefined}
      >
        {s ? formatCountdown(target - now) : "0:00"}
      </p>
    </div>
  );
}

/** "Now" tag on the chart's solid now line (uses --now-x from LiveChart). */
export function NowTag() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-8 left-[max(22px,var(--now-x))] -translate-x-1/2 rounded-4 bg-bg-inverse px-6 py-2 font-mono text-[10px] tracking-[0.1em] text-text-inverse"
    >
      NOW
    </span>
  );
}

/** Label centred on the shaded hidden-close window (uses --band-c). */
export function HiddenTag() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-8 left-[max(68px,var(--band-c))] flex -translate-x-1/2 items-center gap-6 whitespace-nowrap rounded-4 bg-bg-brand px-8 py-4 font-mono text-[11px] tracking-[0.08em] text-text-on-color"
    >
      <EyeOff className="size-12" />
      CLOSE HIDDEN
    </span>
  );
}

/** Window title for the product shot: the live round number. */
export function RoundTitle({ className }: { className?: string }) {
  const now = useNow();
  const s = now ? scheduleAt(now) : null;
  return (
    <span className={className}>
      blindside — round {s ? s.round.toLocaleString("en-US") : "…"} · SOL/USD
    </span>
  );
}
