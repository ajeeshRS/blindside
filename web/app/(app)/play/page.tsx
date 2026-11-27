import type { Metadata } from "next";
import { PhaseTicker } from "@/components/marketing/phase-ticker";
import { CallPanel } from "@/components/play/call-panel";
import { MarketChart } from "@/components/play/market-chart";
import { PeekPanel } from "@/components/play/peek";
import { MarketBar, PositionsPanel, RoundsTapePanel, TerminalPanel } from "@/components/play/terminal";
import { roundAvailability } from "@/lib/round";

export const metadata: Metadata = { title: "Play" };

/*
 * Play as a trading terminal. On desktop it is drawn at 90% (CSS zoom, for a
 * denser terminal) and is exactly one screen tall: the
 * chart takes the free space, and the tables and proof scroll inside their
 * own panels, so the page never grows. On phones it stacks.
 */
export default function PlayPage() {
  const availability = roundAvailability();

  return (
    <div className="flex flex-col gap-10 lg:h-[calc((100svh-112px)/0.9)] lg:min-h-[640px] lg:[zoom:0.9]">
      {!availability.available && (
        <p className="rounded-12 border border-dashed border-border-secondary-hover px-16 py-8 text-[13px] leading-[19px] text-text-secondary">
          <span className="mr-8 font-[600] text-text-warning">Preview</span>
          The price is live. Rounds open once the Blindside program is on devnet.
        </p>
      )}

      <MarketBar />

      <div className="grid gap-10 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-h-0 flex-col gap-10 max-lg:contents">
          <TerminalPanel
            className="max-lg:order-1 lg:min-h-0 lg:flex-1"
            bodyClassName="flex flex-col"
            title="SOL/USD · this round"
            meta={
              <span className="inline-flex items-center gap-6">
                <span className="bg-hatch inline-block h-10 w-14 rounded-[3px] bg-[hsl(var(--brand-50)/0.18)]" aria-hidden />
                Hidden close window
              </span>
            }
          >
            <div className="relative h-[280px] sm:h-[340px] lg:h-auto lg:min-h-0 lg:flex-1">
              <MarketChart className="absolute inset-0" />
            </div>
            <PhaseTicker className="border-t border-line px-14 py-8" />
          </TerminalPanel>

          {/* Phones: chart, ticket and proof, then these tables. */}
          <div className="grid gap-10 max-lg:order-3 md:grid-cols-2 lg:h-[212px] lg:shrink-0">
            <PositionsPanel className="max-lg:max-h-[260px]" />
            <RoundsTapePanel className="max-lg:max-h-[260px]" />
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-10 max-lg:order-2">
          <CallPanel />
          <PeekPanel className="lg:min-h-0 lg:flex-1" />
        </div>
      </div>
    </div>
  );
}
