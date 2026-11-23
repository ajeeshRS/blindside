import { Panel } from "@/components/ui/panel";
import { ROUND } from "@/lib/config";
import { cn } from "@/lib/cn";
import { PHASES } from "@/lib/round";

const TONES: Record<(typeof PHASES)[number]["key"], string> = {
  sure: "bg-bg-brand",
  maybe: "bg-hatch bg-[hsl(var(--brand-50)/0.12)]",
  developing: "bg-bg-tertiary",
  reveal: "bg-bg-inverse",
};

/** The fixed 90-second cycle every round follows. */
export function RoundSchedule() {
  return (
    <Panel label="How every round runs" meta={<span className="text-label text-text-tertiary">90s cycle</span>}>
      <div className="px-16 pt-16 pb-8 md:px-20">
      <div className="flex h-10 gap-2 overflow-hidden rounded-4" aria-hidden>
        {PHASES.map((p) => (
          <div
            key={p.key}
            className={cn("h-full", TONES[p.key])}
            style={{ width: `${((p.to - p.from) / ROUND.cycle) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-6 flex justify-between font-mono text-[11px] tabular text-text-tertiary" aria-hidden>
        <span>0s</span>
        <span>{ROUND.cycle}s</span>
      </div>
      <ol className="mt-8 flex flex-col divide-y divide-border-secondary">
        {PHASES.map((p) => (
          <li key={p.key} className="flex gap-12 py-10">
            <span className={cn("mt-5 size-10 shrink-0 rounded-[3px]", TONES[p.key])} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-12">
                <span className="text-[14px] leading-[20px] font-[600]">{p.title}</span>
                <span className="font-mono text-[11px] tabular text-text-tertiary">
                  {p.from}–{p.to}s
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-[19px] text-text-secondary">{p.body}</p>
            </div>
          </li>
        ))}
      </ol>
      </div>
    </Panel>
  );
}
