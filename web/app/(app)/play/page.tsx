import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PhaseTicker } from "@/components/marketing/phase-ticker";
import { CallPanel } from "@/components/play/call-panel";
import { PeekPanel } from "@/components/play/peek";
import { MarketChart } from "@/components/play/market-chart";
import { PriceHead, RoundMeta } from "@/components/play/round-clock";
import { ButtonLink } from "@/components/ui/button";
import { roundAvailability } from "@/lib/round";

export const metadata: Metadata = { title: "Play" };

/*
 * The Play screen holds only what a player needs right now: the price, whether
 * calls are open, the chart, and the call. Schedule and feed details live on
 * the Fair page.
 */
export default function PlayPage() {
  const availability = roundAvailability();

  return (
    <div className="flex flex-col gap-16">
      {!availability.available && (
        <p className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-full border border-dashed border-border-secondary-hover px-16 py-8 text-[13px] leading-[19px] text-text-secondary">
          <span className="text-label text-text-warning">Preview</span>
          The price is live. Rounds open once the Blindside program is on devnet.
        </p>
      )}

      <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Phones: chart, then your call, then the peek. Desktop: call panel on the right. */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="frame overflow-hidden">
            <div className="flex items-start justify-between gap-16 px-16 pt-16 md:px-24 md:pt-24">
              <PriceHead />
              <RoundMeta />
            </div>
            <div className="relative mt-12 h-[240px] sm:h-[300px] md:h-[360px] lg:h-[clamp(280px,calc(100svh-380px),500px)]">
              <div aria-hidden className="bg-blueprint absolute inset-0 opacity-70" />
              <MarketChart className="absolute inset-0" />
            </div>
            <PhaseTicker className="border-t border-line px-16 py-12 md:px-24" />
          </div>
        </div>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <PeekPanel />
        </div>

        <div className="flex flex-col gap-12 max-lg:row-start-2 lg:sticky lg:top-84 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <CallPanel />
          <ButtonLink
            href="/fair"
            variant="ghost"
            size="sm"
            className="self-start"
            icon={<ArrowRight className="size-14" />}
          >
            How a round works
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
