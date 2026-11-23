"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { priceFeed } from "@/lib/price-feed";
import { scheduleAt } from "@/lib/schedule";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/cn";

/*
 * The hero object: this round as a physical slab, seen from above at an
 * isometric angle. The line on it is the real SOL/USD feed; everything past
 * "now" is hatched over, because nobody knows where the close lands.
 * Two empty slabs underneath stand for the rounds that come next.
 */

const W = 520;
const H = 320;
const PLOT = { x: 28, y: 92, w: 300, h: 140 };

/** Seconds of history on the slab. */
const WINDOW_MS = 60_000;
/** Smallest vertical span, as a share of price (~4 cents at $70), so tiny wiggles stay small. */
const MIN_SPAN = 0.0006;

function useLine() {
  useSyncExternalStore(
    priceFeed.subscribe,
    () => Math.floor(priceFeed.getSnapshot().version / 2),
    () => 0,
  );
  const ticks = priceFeed.getTicks();
  if (ticks.length < 2) return null;
  const last = ticks[ticks.length - 1];
  const from = last.t - WINDOW_MS;
  const recent = ticks.filter((t) => t.t >= from);
  if (recent.length < 2) return null;
  const prices = recent.map((t) => t.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const span = Math.max(hi - lo, last.price * MIN_SPAN);
  const min = (lo + hi) / 2 - span / 2;
  // Plot by time, not by tick index, so bursts of ticks don't squash together.
  const t0 = recent[0].t;
  const tSpan = Math.max(last.t - t0, 1);
  const pts = recent.map((t) => [
    PLOT.x + ((t.t - t0) / tSpan) * PLOT.w,
    PLOT.y + PLOT.h - ((t.price - min) / span) * PLOT.h,
  ]);
  return {
    d: pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" "),
    end: pts[pts.length - 1],
    price: prices[prices.length - 1],
  };
}

/** Thickness: a few stacked layers under a face read as a solid edge. */
function Edge({ depth = 8 }: { depth?: number }) {
  return (
    <>
      {Array.from({ length: depth }, (_, i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-[14px] bg-[hsl(0_0%_84%)] in-data-[theme=dark]:bg-[hsl(0_0%_18%)]"
          style={{ transform: `translateZ(${-(i + 1)}px)` }}
        />
      ))}
    </>
  );
}

function GhostSlab({ z }: { z: number }) {
  return (
    <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: `translateZ(${z}px)` }}>
      <Edge depth={6} />
      <div className="absolute inset-0 rounded-[14px] bg-bg-primary shadow-[inset_0_0_0_1px_hsl(var(--border-secondary))]">
        <div className="absolute inset-x-28 top-28 h-10 w-120 rounded-[2px] bg-bg-secondary" />
        <div className="bg-hatch absolute inset-x-28 bottom-28 top-60 rounded-8 opacity-60" />
      </div>
    </div>
  );
}

/** Projected size of the whole stack (slab + ghosts + float), at scale 1. */
const BOX = { w: 620, h: 400 };
/** The ghost slabs hang below the top one; lift the stack so it sits centered. */
const LIFT = 36;

/** Scale the stack down to whatever space the layout gives it. */
function useFit() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(Math.max(0.3, Math.min(1, width / BOX.w, height / BOX.h)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, scale };
}

export function RoundSlab({ className }: { className?: string }) {
  const { ref, scale } = useFit();
  const now = useNow();
  const line = useLine();
  const round = now ? scheduleAt(now).round : null;

  return (
    <div ref={ref} aria-hidden className={cn("pointer-events-none relative select-none", className)}>
      {/* Floor shadow */}
      <div className="absolute left-1/2 top-[58%] h-[46%] w-[78%] -translate-x-1/2 rounded-[50%] bg-[hsl(var(--text-primary)/0.08)] blur-3xl" />

      <div className="absolute left-1/2 top-1/2" style={{ width: W, height: H, marginLeft: -W / 2, marginTop: -H / 2 - LIFT, transform: `scale(${scale})`, transformOrigin: `50% calc(50% + ${LIFT}px)` }}>
        <div className="relative size-full [transform-style:preserve-3d] [transform:rotateX(56deg)_rotateZ(-38deg)]">
          <GhostSlab z={-84} />
          <GhostSlab z={-42} />

          {/* This round */}
          <div className="slab-float absolute inset-0 [transform-style:preserve-3d]">
            <Edge />
            <div className="absolute inset-0 overflow-hidden rounded-[14px] bg-bg-primary shadow-[inset_0_0_0_1px_hsl(var(--border-secondary-hover))]">
              <div className="bg-blueprint absolute inset-0 opacity-70" />

              {/* Header */}
              <div className="absolute inset-x-28 top-24 flex items-center justify-between font-mono text-[13px] tracking-[0.06em] text-text-tertiary">
                <span>SOL/USD</span>
                <span className="tabular">{round ? `ROUND ${round.toLocaleString("en-US")}` : "ROUND —"}</span>
              </div>
              <div className="absolute left-28 top-48 font-mono text-[26px] font-medium tabular tracking-[-0.02em] text-text-primary">
                {line ? `$${line.price.toFixed(2)}` : "$—"}
              </div>

              {/* The hidden part of the round */}
              <div
                className="absolute inset-y-0 rounded-r-[14px] bg-[hsl(var(--brand-50)/0.06)]"
                style={{ left: PLOT.x + PLOT.w + 10, right: 0 }}
              >
                <div className="bg-hatch hatch-drift absolute inset-0 opacity-90" />
                <div className="absolute inset-x-0 top-[47%] text-center font-mono text-[12px] tracking-[0.14em] text-text-brand">
                  CLOSE HIDDEN
                </div>
              </div>

              <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full">
                {/* Now */}
                <line
                  x1={PLOT.x + PLOT.w + 10}
                  x2={PLOT.x + PLOT.w + 10}
                  y1={24}
                  y2={H - 24}
                  className="stroke-text-primary"
                  strokeWidth={1.5}
                  strokeDasharray="3 4"
                />
                {line ? (
                  <>
                    <path
                      d={line.d}
                      fill="none"
                      className="stroke-[hsl(var(--chart-line))]"
                      strokeWidth={3}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <circle cx={line.end[0]} cy={line.end[1]} r={6} className="fill-[hsl(var(--chart-line))]" />
                  </>
                ) : (
                  <path
                    d={`M${PLOT.x} ${PLOT.y + PLOT.h / 2} H${PLOT.x + PLOT.w}`}
                    className="stroke-text-tertiary"
                    strokeWidth={2}
                    strokeDasharray="2 6"
                  />
                )}
              </svg>

              {/* Calls */}
              <div className="absolute bottom-24 left-28 flex gap-8 font-mono text-[13px] tracking-[0.06em]">
                <span className="rounded-[6px] bg-bg-up-soft px-10 py-4 text-text-up">▲ UP</span>
                <span className="rounded-[6px] bg-bg-down-soft px-10 py-4 text-text-down">▼ DOWN</span>
              </div>
              <div className="absolute bottom-28 left-[calc(28px+300px+10px)] -translate-x-1/2 rounded-4 bg-bg-inverse px-6 py-2 font-mono text-[11px] tracking-[0.1em] text-text-inverse">
                NOW
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
