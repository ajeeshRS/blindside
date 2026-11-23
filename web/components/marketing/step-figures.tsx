import { cn } from "@/lib/cn";

/*
 * Small diagrams for the "How it works" steps. They draw the round's real
 * schedule (0–10 s always counts, close hidden in 10–50 s, reveal at 80 s,
 * next round at 90 s); they show no prices, because none are known here.
 */

const CYCLE = 90;
const pct = (s: number) => `${(s / CYCLE) * 100}%`;

function Ticks({ marks }: { marks: { at: number; label: string }[] }) {
  return (
    <div className="relative mt-8 h-14 font-mono text-[10px] leading-[14px] text-text-tertiary">
      {marks.map(({ at, label }) => (
        <span
          key={label}
          className={cn(
            "absolute top-0 whitespace-nowrap",
            at === 0 ? "left-0" : at === CYCLE ? "right-0" : "-translate-x-1/2",
          )}
          style={at === 0 || at === CYCLE ? undefined : { left: pct(at) }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

const secs = (...xs: number[]) => xs.map((at) => ({ at, label: `${at}s` }));

/** Step 1: two calls, one picked. */
export function PickFigure() {
  return (
    <div className="flex items-center gap-10 font-mono text-[13px] tracking-[0.04em]">
      <span className="flex h-40 items-center gap-6 rounded-10 bg-bg-up-soft px-16 text-text-up shadow-[0_0_0_2px_hsl(var(--bg-primary)),0_0_0_3.5px_hsl(var(--text-up))]">
        ▲ UP
      </span>
      <span className="flex h-40 items-center gap-6 rounded-10 bg-bg-down-soft px-16 text-text-down opacity-60">
        ▼ DOWN
      </span>
    </div>
  );
}

/** Step 2: the close lands somewhere in the hatched window. Nobody knows where. */
export function HiddenFigure() {
  return (
    <div className="w-full max-w-[260px]">
      <div className="relative h-24 overflow-hidden rounded-[6px] bg-bg-secondary">
        <div className="absolute inset-y-0 left-0 bg-bg-brand" style={{ width: pct(10) }} />
        <div
          className="bg-hatch hatch-drift absolute inset-y-0 bg-[hsl(var(--brand-50)/0.08)]"
          style={{ left: pct(10), width: pct(40) }}
        />
      </div>
      <div className="relative">
        <span
          className="absolute -top-44 -translate-x-1/2 rounded-4 bg-bg-inverse px-6 py-2 font-mono text-[11px] text-text-inverse"
          style={{ left: pct(30) }}
        >
          ?
        </span>
      </div>
      <Ticks marks={secs(10, 50, 90)} />
    </div>
  );
}

/** Step 3: the close is revealed; the result is the price 30 s later. */
export function RevealFigure() {
  const close = 27;
  return (
    <div className="w-full max-w-[260px]">
      <div className="relative mb-6 h-16 font-mono text-[10px] text-text-tertiary">
        <div
          className="absolute top-6 h-8 border-x border-t border-text-tertiary"
          style={{ left: pct(close), width: pct(30) }}
        />
        <span className="absolute -top-6 -translate-x-1/2 bg-bg-primary px-4" style={{ left: pct(close + 15) }}>
          +30s
        </span>
      </div>
      <div className="relative h-24 rounded-[6px] bg-bg-secondary">
        <div
          className="absolute inset-y-0 rounded-l-[6px] bg-bg-brand"
          style={{ left: 0, width: pct(close) }}
        />
        <div
          className="absolute -inset-y-4 w-2 -translate-x-1/2 rounded-full bg-text-primary"
          style={{ left: pct(close) }}
        />
        <div
          className="absolute -inset-y-4 w-2 -translate-x-1/2 rounded-full bg-text-up"
          style={{ left: pct(close + 30) }}
        />
      </div>
      <Ticks
        marks={[
          { at: close, label: "close" },
          { at: close + 30, label: "result" },
          { at: CYCLE, label: "90s" },
        ]}
      />
    </div>
  );
}
