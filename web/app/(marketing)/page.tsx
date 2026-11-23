import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { RoundSlab } from "@/components/marketing/round-slab";
import { HiddenFigure, PickFigure, RevealFigure } from "@/components/marketing/step-figures";

const STATS = [
  { value: "90s", label: "Per round" },
  { value: "10–50s", label: "Secret close" },
  { value: "30s", label: "To settle" },
];

const STEPS = [
  {
    figure: <PickFigure />,
    title: "Pick up or down",
    body: "Will SOL be higher or lower in 30 seconds? Make your call on the live price.",
  },
  {
    figure: <HiddenFigure />,
    title: "Betting closes in secret",
    body: "Each round closes at a random moment between 10 and 50 seconds. Calls that come in too late are refunded.",
  },
  {
    figure: <RevealFigure />,
    title: "Watch the reveal",
    body: "At 80 seconds, see when it closed, where SOL went 30 seconds later, and whether you won.",
  },
];

const FAIR = [
  "Nobody knows when betting closes — not players, not bots, not us",
  "Calls placed after the close are refunded, never counted",
  "Every round comes with a proof you can check yourself",
];

const FAQ = [
  {
    q: "How do I win?",
    a: "Call whether SOL will be higher or lower 30 seconds after the round's secret close. If you're right, you share the pot with everyone else who called it right.",
  },
  {
    q: "Why does betting close at a secret time?",
    a: "In normal fast markets, whoever sees the price first can bet in the last second, when the result is almost certain. That's mostly bots. A secret close removes that advantage, so it's your call against the market, not against someone faster.",
  },
  {
    q: "Why was my call refunded?",
    a: "It arrived after the round's secret close. Refunds are returned in full. Calls made in the first 10 seconds of a round always count.",
  },
  {
    q: "Is it real money?",
    a: "Not yet. Blindside runs on Solana devnet with free test funds, so you can try it without risking anything.",
  },
  {
    q: "What do I need to play?",
    a: "A Solana wallet such as Phantom, Solflare or Backpack. You sign once, then make calls without pop-ups.",
  },
];

const muted = "text-[hsl(0_0%_64%)] in-data-[theme=dark]:text-[hsl(0_0%_42%)]";

/** Mono kicker in a crop-mark frame, then a two-tone heading. */
function SectionHead({
  index,
  kicker,
  title,
  rest,
  center,
}: {
  index: string;
  kicker: string;
  title: ReactNode;
  rest?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={center ? "flex flex-col items-center text-center" : undefined}>
      <p className="frame inline-flex gap-8 px-12 py-6 text-label text-text-secondary">
        <span className="text-text-tertiary">{index}</span>
        {kicker}
      </p>
      <h2 className="mt-16 text-[30px] leading-[1.08] font-[652] tracking-[-0.8px] text-balance md:text-[38px] md:tracking-[-1.1px]">
        {title}
        {rest ? <span className={muted}> {rest}</span> : null}
      </h2>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* Hero: one screen tall. The slab takes whatever height is left. */}
      <section className="overflow-x-clip">
        <div className="container-page flex flex-col items-center pt-32 pb-20 text-center md:pt-40 lg:h-[calc(100svh-60px)] lg:min-h-[520px] short:pt-24 short:pb-16">
          <p className="frame inline-flex items-center gap-8 px-14 py-6 text-label text-text-secondary">
            <span className="relative flex size-6" aria-hidden>
              <span className="live-ping absolute inset-0 rounded-full bg-bg-up" />
              <span className="relative size-6 rounded-full bg-bg-up" />
            </span>
            Live SOL price<span className="max-sm:hidden"> · A new round every 90s</span>
          </p>
          <h1 className="mt-20 text-[38px] leading-[1.04] font-[652] tracking-[-1px] md:text-[48px] md:tracking-[-1.4px] xl:text-[58px] xl:tracking-[-1.8px] short:mt-16 short:text-[50px]!">
            <span className="block">Predict SOL.</span>
            <span className="block text-balance text-[hsl(0_0%_64%)] in-data-[theme=dark]:text-[hsl(0_0%_42%)]">
              Beat the market, not the bots<span className="text-text-primary">.</span>
            </span>
          </h1>
          <p className="mt-16 max-w-[540px] text-[16px] leading-[24px] text-text-secondary text-balance md:text-[17px] md:leading-[26px] short:mt-12">
            Call whether SOL goes up or down in the next 30 seconds. Betting closes at a secret
            moment, so nobody can wait for the last second.
          </p>
          <div className="mt-24 flex flex-wrap justify-center gap-8 short:mt-20">
            <ButtonLink href="/play" className="h-44 px-18 text-[15px]">
              Play now
            </ButtonLink>
            <ButtonLink href="#how-it-works" variant="secondary" className="h-44 px-18 text-[15px]">
              How it works
            </ButtonLink>
          </div>

          {/* The round, on its own patch of blueprint paper. */}
          <div className="relative mt-32 mb-12 h-[200px] w-full sm:h-[340px] lg:mt-40 lg:h-auto lg:min-h-[150px] lg:flex-1 short:mt-32">
            <div
              aria-hidden
              className="bg-blueprint absolute inset-0 [mask-image:radial-gradient(closest-side,black_40%,transparent)]"
            />
            <RoundSlab className="absolute inset-0" />
          </div>

          <dl className="grid w-full max-w-[640px] grid-cols-3 gap-8 md:gap-14">
            {STATS.map((s) => (
              <div key={s.label} className="frame flex flex-col items-center gap-2 px-8 py-10">
                <dt className="order-2 text-label text-text-tertiary max-md:text-[11px]">
                  {s.label}
                </dt>
                <dd className="font-mono text-[18px] font-medium tabular tracking-[-0.02em] md:text-[19px]">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-60 border-t border-border-secondary">
        <div className="container-page py-64 md:py-88">
          <SectionHead
            index="01"
            kicker="How it works"
            title="Three steps."
            rest="One round every 90 seconds."
            center
          />
          <ol className="mt-40 grid gap-12 md:grid-cols-3 md:gap-16">
            {STEPS.map((step, i) => (
              <li key={step.title} className="frame flex flex-col border-x border-border-secondary">
                <div className="relative flex h-[148px] items-center justify-center border-b border-dashed border-border-secondary-hover px-24">
                  <div
                    aria-hidden
                    className="bg-blueprint absolute inset-0 [mask-image:radial-gradient(closest-side,black_30%,transparent)]"
                  />
                  <div className="relative flex w-full justify-center" aria-hidden>
                    {step.figure}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-20 md:p-24">
                  <span className="text-label text-text-tertiary">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-8 text-[18px] leading-[24px] font-[652] tracking-[-0.2px]">
                    {step.title}
                  </h3>
                  <p className="mt-6 text-[15px] leading-[22px] text-text-secondary">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why it's fair */}
      <section className="border-t border-border-secondary">
        <div className="container-page grid gap-40 py-64 md:py-88 lg:grid-cols-2 lg:gap-64">
          <div className="flex flex-col">
            <SectionHead
              index="02"
              kicker="Why it's fair"
              title="Fast markets are usually won by bots."
              rest="This one isn't."
            />
            <p className="mt-16 max-w-[480px] text-[16px] leading-[24px] text-text-secondary">
              When betting closes at a known time, whoever sees the price first can bet in the
              last second. Blindside hides the close, so speed stops being an edge.
            </p>
            <Link
              href="/fair"
              className="group mt-20 inline-flex items-center gap-6 self-start text-[15px] font-[600] text-text-brand"
            >
              Read how it&apos;s kept fair
              <ArrowRight
                className="size-16 transition-transform group-hover:translate-x-2"
                aria-hidden
              />
            </Link>
          </div>

          <div className="flex flex-col gap-12">
            <figure className="frame border-x border-border-secondary px-20 py-20 md:px-24">
              <div className="font-mono text-[36px] leading-none font-medium tracking-[-0.03em] md:text-[44px]">
                $11.4M
              </div>
              <figcaption className="mt-12 text-[15px] leading-[22px] text-text-secondary">
                made by 19 high-volume addresses in Polymarket&apos;s 15-minute crypto markets.
                Every one was profitable, while the average active trader lost money.
                <span className="mt-10 block text-label text-text-tertiary">
                  Blockworks Intel · May 2026
                </span>
              </figcaption>
            </figure>
            <ul className="flex flex-col">
              {FAIR.map((f, i) => (
                <li
                  key={f}
                  className="flex items-start gap-12 border-b border-border-secondary py-14 text-[15px] leading-[22px] font-[600] last:border-b-0"
                >
                  <span className="mt-2 text-label text-text-tertiary">0{i + 1}</span>
                  <span className="flex-1">{f}</span>
                  <Check className="mt-2 size-18 shrink-0 text-text-up" aria-hidden />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-60 border-t border-border-secondary">
        <div className="container-page grid gap-32 py-64 md:py-88 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-64">
          <div className="lg:sticky lg:top-100 lg:self-start">
            <SectionHead index="03" kicker="FAQ" title="Questions," rest="answered." />
          </div>
          <div className="border-t border-border-secondary">
            {FAQ.map((f, i) => (
              <details key={f.q} className="group border-b border-border-secondary">
                <summary className="flex cursor-pointer list-none items-center gap-14 py-18 [&::-webkit-details-marker]:hidden">
                  <span className="text-label text-text-tertiary">0{i + 1}</span>
                  <span className="flex-1 text-[16px] leading-[22px] font-[600] md:text-[17px]">
                    {f.q}
                  </span>
                  <span
                    aria-hidden
                    className="flex size-28 shrink-0 items-center justify-center rounded-8 border border-border-secondary-hover font-mono text-[16px] leading-none text-text-secondary transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-20 pl-[34px] pr-40 text-[15px] leading-[23px] text-text-secondary">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Closing: a dark card lit from below by a blue glow. */}
      <section className="container-page pb-64 md:pb-96">
        <div className="dark relative overflow-hidden rounded-24 bg-[hsl(0_0%_3%)]! shadow-[inset_0_0_0_1px_hsl(0_0%_100%/8%)]">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_52%_100%_at_56%_118%,hsl(225_100%_52%)_0%,hsl(225_96%_46%/0.9)_28%,hsl(226_92%_40%/0.45)_52%,hsl(228_90%_30%/0.12)_68%,transparent_80%)]"
          />
          <div className="relative grid gap-32 px-24 py-56 md:px-48 md:py-72 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center lg:gap-48 lg:px-64 lg:py-88">
            <h2 className="text-[40px] leading-[0.98] font-[700] tracking-[-1.6px] text-balance md:text-[56px] md:tracking-[-2.4px] xl:text-[68px] xl:tracking-[-3px]">
              Ready for the next round?
            </h2>
            <div>
              <p className="max-w-[420px] text-[16px] leading-[26px] text-text-secondary md:text-[17px] md:leading-[28px]">
                A new one starts every 90 seconds. Make your call, and see the secret close
                revealed. Free to try on Solana devnet.
              </p>
              <div className="mt-24 flex flex-wrap gap-10">
                <ButtonLink href="/play" className="h-44 px-18 text-[15px]">
                  Play now
                  <ArrowRight className="size-16" aria-hidden />
                </ButtonLink>
                <ButtonLink href="/fair" variant="secondary" className="h-44 px-18 text-[15px]">
                  How it&apos;s kept fair
                </ButtonLink>
              </div>
              <p className="mt-28 text-label text-text-tertiary">
                Built on MagicBlock · Prices from Pyth
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
