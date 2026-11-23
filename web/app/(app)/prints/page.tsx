import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader, SectionTitle } from "@/components/app/app-shell";
import { PrintsForWallet } from "@/components/app/prints-for-wallet";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Prints" };

/* Small drawings of what each set means. They show the rule, not a real round. */
function LastSecondFigure() {
  return (
    <div className="w-full max-w-[200px]">
      <div className="relative h-10 rounded-4 bg-bg-secondary">
        <div className="bg-hatch absolute inset-y-0 left-[11%] w-[44%] bg-[hsl(var(--brand-50)/0.1)]" />
        <div className="absolute -inset-y-6 left-[55%] w-2 -translate-x-1/2 rounded-full bg-text-primary" />
      </div>
      <div className="mt-8 flex justify-between font-mono text-[10px] text-text-tertiary">
        <span>10s</span>
        <span className="text-text-primary">49.9s</span>
      </div>
    </div>
  );
}

function BigMoverFigure() {
  return (
    <svg viewBox="0 0 200 80" className="w-full max-w-[200px]">
      <path d="M4 60 L60 56 L90 58" fill="none" className="stroke-text-tertiary" strokeWidth={2} strokeLinecap="round" />
      <path d="M90 58 L120 40 L150 24 L196 10" fill="none" className="stroke-[hsl(var(--chart-line))]" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <line x1={90} x2={90} y1={4} y2={76} className="stroke-text-tertiary" strokeDasharray="3 4" />
      <text x={196} y={30} textAnchor="end" className="fill-text-up font-mono text-[11px]">+1%</text>
    </svg>
  );
}

function StreakFigure() {
  return (
    <div className="flex gap-6">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="flex size-28 items-center justify-center rounded-6 bg-bg-up-soft font-mono text-[12px] text-text-up">
          ✓
        </span>
      ))}
    </div>
  );
}

const SETS: { title: string; body: string; figure: ReactNode }[] = [
  {
    title: "Last-second close",
    body: "Win a round whose hidden close landed in its final second.",
    figure: <LastSecondFigure />,
  },
  {
    title: "Big mover",
    body: "Win a round where SOL moved more than 1% in its 30 seconds.",
    figure: <BigMoverFigure />,
  },
  {
    title: "Five in a row",
    body: "Win five staked rounds in a row.",
    figure: <StreakFigure />,
  },
];

export default function PrintsPage() {
  return (
    <>
      <PageHeader
        kicker="Collect"
        title="Prints"
        description="Rare rounds leave you a print: the round's real chart, the moment it closed, and its proof. Only staked wins earn prints."
      />
      <PrintsForWallet />

      <div className="mt-48">
        <SectionTitle
          index="Sets"
          description="What counts is decided by what actually happened in the round. Nothing is rolled at random."
        >
          Three ways to earn a print
        </SectionTitle>
        <ul className="grid gap-12 md:grid-cols-3 md:gap-16">
          {SETS.map((s, i) => (
            <li key={s.title}>
              <Surface className="flex h-full flex-col">
                <div className="relative flex h-[128px] items-center justify-center border-b border-dashed border-border-secondary-hover px-24">
                  <div
                    aria-hidden
                    className="bg-blueprint absolute inset-0 [mask-image:radial-gradient(closest-side,black_30%,transparent)]"
                  />
                  <div className="relative flex w-full justify-center" aria-hidden>
                    {s.figure}
                  </div>
                </div>
                <div className="p-20">
                  <span className="text-label text-text-tertiary">0{i + 1}</span>
                  <h3 className="mt-6 text-[17px] leading-[23px] font-[652]">{s.title}</h3>
                  <p className="mt-4 text-[14px] leading-[21px] text-text-secondary">{s.body}</p>
                </div>
              </Surface>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
