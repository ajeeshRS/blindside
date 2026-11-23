import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { LiveChart } from "@/components/market/live-chart";
import { CallPanel } from "@/components/play/call-panel";
import { HiddenTag, NowTag, PriceHead, RoundMeta } from "@/components/play/round-clock";
import { Panel } from "@/components/ui/panel";
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
        <p className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-10 border border-dashed border-border-secondary-hover px-14 py-10 text-[13px] leading-[19px] text-text-secondary">
          <span className="text-label text-text-warning">Preview</span>
          The price is live. Rounds open once the Blindside program is on devnet.
        </p>
      )}

      <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          <div className="flex items-start justify-between gap-16 px-16 pt-16 md:px-20 md:pt-20">
            <PriceHead />
            <RoundMeta />
          </div>
          <div className="relative mt-12 h-[240px] sm:h-[300px] md:h-[360px] lg:h-[clamp(280px,calc(100svh-330px),500px)]">
            <LiveChart className="absolute inset-0" windowSeconds={90} closeWindow lineWidth={2}>
              <HiddenTag />
              <NowTag />
            </LiveChart>
          </div>
        </Panel>

        <div className="flex flex-col gap-12 lg:sticky lg:top-84 lg:self-start">
          <CallPanel />
          <Link
            href="/fair"
            className="group inline-flex items-center gap-6 self-start px-4 text-[14px] font-[600] text-text-brand"
          >
            How a round works
            <ArrowRight className="size-14 transition-transform group-hover:translate-x-2" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
