import { ArrowRight, Check, Eye, Play, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { NextRoundIn, PhaseTicker } from "@/components/marketing/phase-ticker";
import { HiddenFigure, PickFigure, RevealFigure } from "@/components/marketing/step-figures";
import { MarketChart } from "@/components/play/market-chart";
import { PriceHead, RoundMeta, RoundTitle } from "@/components/play/round-clock";
import { ButtonLink } from "@/components/ui/button";
import FlutedBackdrop from "@/components/ui/fluted-backdrop";
import { Kicker } from "@/components/ui/kicker";

const STACK = [
  { name: "MagicBlock Private ER", href: "https://docs.magicblock.gg" },
  {
    name: "MagicBlock VRF",
    href: "https://docs.magicblock.gg/pages/verifiable-randomness-functions-vrfs/introduction/technical-details",
  },
  { name: "Pyth Lazer", href: "https://docs.pyth.network/lazer" },
  { name: "Solana", href: "https://solana.com" },
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
    body: "Each round closes at a random moment between 10 and 50 seconds, kept hidden inside MagicBlock's private rollup. Calls that come in too late are refunded.",
  },
  {
    figure: <RevealFigure />,
    title: "Watch the reveal",
    body: "At 80 seconds, see when it closed, where SOL went 30 seconds later, and whether you won. Then verify the close yourself.",
  },
];

const FAIR = [
  "Nobody knows when betting closes: not players, not bots, not us",
  "Calls placed after the close are refunded, never counted",
  "Nobody can reveal early: the program rejects it before 80 s",
  "Every round can be verified in your browser after the reveal",
];

const RECIPE = [
  {
    title: "Seal a secret at the open",
    body: "The keeper seeds each round inside MagicBlock's Private Ephemeral Rollup, a TEE.",
  },
  {
    title: "Mix in every early player",
    body: "Each call adds a random nonce from the player's device, so the keeper can't know the close either.",
  },
  {
    title: "Mix in MagicBlock VRF",
    body: "Requested from inside the rollup, so even a keeper whose friends call early can't work it out.",
  },
  {
    title: "Nobody can read the round",
    body: "A permission with no readers hides the account until the reveal. Try to peek on the Play page.",
  },
  {
    title: "Reveal, and let anyone check",
    body: "At 80 seconds everything goes public and the close recomputes in any browser.",
  },
];

const EXTRAS = [
  {
    icon: Eye,
    title: "Try to peek, live",
    body: "Your browser first checks the rollup is a genuine Intel TDX enclave, against Intel's certificates. Then one click sends the request a bot would make for the running round: nothing comes back. The round that just ended comes back in full.",
    cta: "Try it on a live round",
    href: "/play#peek",
  },
  {
    icon: Zap,
    title: "One-tap calls, any wallet",
    body: "Rollup transactions carry the rollup's blockhash, which wallet extensions refuse to sign. So your wallet approves a session key once on Solana, and that key signs your calls in the rollup. It can't withdraw.",
    cta: "Play with your wallet",
    href: "/play",
  },
];

const FITS = [
  "Prediction markets",
  "Short-term options",
  "Sealed-bid auctions",
  "Fair token launches",
  "Game loot drops",
];

const FAQ = [
  {
    q: "How do I win?",
    a: "Call whether SOL will be higher or lower 30 seconds after the round's secret close. If you're right, you get your stake back plus a share of everything staked on the other side.",
  },
  {
    q: "How is the pot split?",
    a: "Winners share the losing side's stakes in proportion to what they put in, and get their own stake back. Put in half of the winning side's money and you take half of the losing side's. There's no house and no fee: everything staked is paid out. The smaller side pays more, and both sides stay hidden until the reveal, so nobody can wait for better odds.",
  },
  {
    q: "Why was my call refunded?",
    a: "Either it arrived after the round's secret close, or nobody took the other side: winners are paid from the other side's stakes, so a round needs calls on both Higher and Lower. Refunds are returned in full. Calls made in the first 10 seconds always count.",
  },
  {
    q: "Is it real money?",
    a: "Not yet. Blindside runs on Solana devnet with free test funds, so you can try it without risking anything.",
  },
  {
    q: "What do I need to play?",
    a: "Nothing to install. Press Play instantly for a devnet test wallet in your browser, with free devnet SOL and 100 test USDC. You can also use Phantom, Solflare or Backpack on devnet: your wallet approves the setup once, then a session key in your browser signs your calls, so each call is one tap with no pop-up. The session key can't withdraw; only your wallet can.",
  },
];

/** Kicker, heavy display heading, short grey body. Centred by default. */
function SectionHead({
  kicker,
  title,
  body,
  align = "center",
}: {
  kicker: string;
  title: ReactNode;
  body?: ReactNode;
  align?: "center" | "left";
}) {
  const center = align === "center";
  return (
    <div className={center ? "mx-auto flex max-w-[720px] flex-col items-center text-center" : "max-w-[640px]"}>
      <Kicker>{kicker}</Kicker>
      <h2 className="text-display mt-14 text-[2.6rem] md:text-[3.75rem] xl:text-[4.2rem]">{title}</h2>
      {body && (
        <p className="mt-18 max-w-[42rem] text-[16px] leading-[1.6] text-text-secondary md:text-[19px]">
          {body}
        </p>
      )}
    </div>
  );
}

const section = "py-80 md:py-112";

export default function LandingPage() {
  return (
    <>
      {/* Hero: one idea, one screen, on a live fluted-satin backdrop that
          follows the theme (pale blue satin in light, deep blue in dark). It
          slides up under the floating nav so the backdrop fills the top. */}
      <section className="relative isolate -mt-50 overflow-hidden bg-[#e9efff] in-data-[theme=dark]:bg-[#06113a]">
        <FlutedBackdrop className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-700 data-[ready=true]:opacity-100" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,rgb(255_255_255/0.6),rgb(255_255_255/0.05))] in-data-[theme=dark]:bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,rgb(0_0_0/0.62),rgb(0_0_0/0.15))]"
        />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-[22%] bg-gradient-to-b from-transparent to-bg-primary" />
        <div className="container-page flex min-h-svh flex-col items-center justify-center pt-[clamp(96px,14vh,140px)] pb-[clamp(40px,8vh,96px)] text-center">
        <LogoMark className="size-[clamp(56px,9vh,76px)] drop-shadow-[0_14px_24px_hsl(227_100%_45%/0.35)]" />
        <h1 className="text-display mt-[clamp(20px,4vh,36px)] text-[clamp(3.1rem,min(8.6vw,10.5vh),7.2rem)]">
          Predict SOL.
          <br />
          <span className="text-text-tertiary in-data-[theme=dark]:text-white/60">Beat the bots.</span>
        </h1>
        <p className="mt-[clamp(16px,3vh,28px)] max-w-[560px] text-[17px] leading-[1.55] text-text-secondary text-pretty in-data-[theme=dark]:text-white/80 md:text-[21px]">
          90-second up/down calls where betting closes at a secret moment, so nobody can wait for
          the last second.
        </p>
        <ButtonLink
          href="/play"
          size="xl"
          className="mt-[clamp(24px,4.5vh,40px)]"
          icon={<Play className="size-16 fill-current" />}
        >
          Play now
        </ButtonLink>
        <p className="mt-14 text-[13.5px] text-text-secondary in-data-[theme=dark]:text-white/65">
          Free on Solana devnet<span className="max-sm:hidden"> · no install</span> ·{" "}
          <span className="whitespace-nowrap">
            next round in <NextRoundIn className="font-[600] text-text-primary" />
          </span>
        </p>
        </div>
      </section>

      {/* The product, live: an app window on a soft tray, just below the fold. It follows the theme. */}
      <section className="container-page pt-[clamp(48px,9vh,112px)]">
        <div className="rounded-[30px] bg-bg-soft p-10 md:p-16">
          <div className="overflow-hidden rounded-[22px] bg-bg-elevated shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)] ring-1 ring-line in-data-[theme=dark]:bg-[hsl(240_8%_5%)]">
            <div className="flex h-40 items-center gap-8 border-b border-line bg-bg-soft px-16 in-data-[theme=dark]:bg-[hsl(240_8%_9%)]">
              <span className="flex gap-6" aria-hidden>
                <span className="size-10 rounded-full bg-[#ff5f57]" />
                <span className="size-10 rounded-full bg-[#febc2e]" />
                <span className="size-10 rounded-full bg-[#28c840]" />
              </span>
              <RoundTitle className="flex-1 text-center font-code text-[12.5px] text-text-tertiary" />
              <span className="w-[42px]" aria-hidden />
            </div>
            <div className="flex items-start justify-between gap-16 px-16 pt-16 md:px-28 md:pt-24">
              <PriceHead />
              <RoundMeta />
            </div>
            <div className="relative mt-12 h-[260px] md:h-[380px] lg:h-[440px]">
              <MarketChart className="absolute inset-0" />
            </div>
            <PhaseTicker className="border-t border-line px-16 py-14 md:px-28" />
          </div>
        </div>
        <ul className="mt-24 flex flex-wrap items-center justify-center gap-8 text-[14px]">
          <li className="mr-4 text-text-tertiary">Built on</li>
          {STACK.map((x) => (
            <li key={x.name}>
              <a
                href={x.href}
                target="_blank"
                rel="noreferrer"
                className="flex h-36 items-center rounded-10 bg-bg-soft px-14 font-[600] tracking-[-0.01em] transition-colors hover:bg-bg-secondary-hover"
              >
                {x.name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section id="how-it-works" className={`container-page scroll-mt-80 ${section}`}>
        <SectionHead
          kicker="How it works"
          title="Call it. Then it closes in secret."
          body="One round every 90 seconds, on the live SOL price. Three steps, about a minute and a half."
        />
        <ol className="mt-56 grid gap-16 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col rounded-28 bg-bg-soft p-12">
              <div className="tile flex h-[148px] items-center justify-center rounded-20 px-28" aria-hidden>
                <div className="flex w-full justify-center">{step.figure}</div>
              </div>
              <div className="px-16 pt-24 pb-20">
                <span className="font-mono text-[12px] tracking-[0.04em] text-text-tertiary">
                  STEP 0{i + 1}
                </span>
                <h3 className="mt-8 text-[21px] leading-[1.2] font-[700] tracking-[-0.035em]">
                  {step.title}
                </h3>
                <p className="mt-10 text-[15.5px] leading-[1.6] text-text-secondary text-pretty">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Why it's fair: one dark spotlight card. */}
      <section className={`container-page ${section} pt-0 md:pt-0`}>
        <SectionHead
          kicker="Why it's fair"
          title="Speed stops being an edge."
          body="When betting closes at a known time, whoever sees the price first bets in the last second. Blindside hides the close inside MagicBlock's Private Ephemeral Rollup."
        />
        <div className="dark relative mt-56 rounded-32 px-28 py-36 md:px-48 md:py-48">
          <span className="absolute top-24 right-24 rounded-8 bg-bg-brand px-10 py-4 text-[12px] font-[600] text-white md:top-32 md:right-32">
            Blockworks Intel · May 2026
          </span>
          <div className="grid gap-16 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end lg:gap-40">
            <p className="pt-24 font-display text-[76px] leading-none md:pt-0 md:text-[120px]">$11.4M</p>
            <p className="max-w-[460px] text-[16px] leading-[1.6] text-text-secondary lg:pb-12">
              made by 19 high-volume addresses in Polymarket&apos;s 15-minute crypto markets. Every
              one was profitable, while the average active trader lost money.
            </p>
          </div>
          <ul className="mt-36 grid gap-x-32 gap-y-16 border-t border-line pt-28 sm:grid-cols-2">
            {FAIR.map((f) => (
              <li key={f} className="flex gap-10 text-[15.5px] leading-[1.5]">
                <Check className="mt-2 size-18 shrink-0 text-accent" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-36 flex flex-wrap items-center gap-16">
            <ButtonLink href="/fair" size="md" icon={<ArrowRight className="size-16" />}>
              How it&apos;s kept fair
            </ButtonLink>
            <span className="text-[14px] text-text-tertiary">
              Every guarantee, and the code that enforces it.
            </span>
          </div>
        </div>
      </section>

      {/* The pitch: the sealed close is a building block, the game is its first app. */}
      <section className={`container-page ${section} pt-0 md:pt-0`}>
        <SectionHead
          kicker="Under the hood"
          title="A sealed close, for any fast market."
          body="Blindside is the first app built on it. Anywhere bots win by acting last, the same pattern takes the last second away."
        />
        <div className="mt-56 grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <ol className="flex flex-col gap-10">
            {RECIPE.map((x, i) => (
              <li key={x.title} className="flex gap-16 rounded-20 bg-bg-soft p-20">
                <span className="font-display text-[30px] leading-none text-text-tertiary">{i + 1}</span>
                <div>
                  <h3 className="text-[17px] leading-[1.3] font-[700] tracking-[-0.03em]">{x.title}</h3>
                  <p className="mt-4 text-[14.5px] leading-[1.55] text-text-secondary">{x.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-16">
            <div className="dark flex flex-1 flex-col overflow-hidden rounded-28">
              <div className="flex h-40 items-center gap-8 bg-[hsl(240_8%_10%)] px-16">
                <span className="flex gap-6" aria-hidden>
                  <span className="size-10 rounded-full bg-[#ff5f57]" />
                  <span className="size-10 rounded-full bg-[#febc2e]" />
                  <span className="size-10 rounded-full bg-[#28c840]" />
                </span>
                <span className="flex-1 text-center font-code text-[12.5px] text-text-tertiary">
                  packages/client/src/verify.ts
                </span>
                <span className="w-[42px]" aria-hidden />
              </div>
              <pre className="flex-1 overflow-x-auto p-20 font-code text-[13px] leading-[1.7] text-text-secondary md:p-24 md:text-[14px]">
                <span className="text-accent">import</span>
                {" { recomputeOffset } "}
                <span className="text-accent">from</span>
                {' "@blindside/client";\n\n'}
                <span className="text-text-tertiary">{"// After the reveal, all of this is public.\n"}</span>
                <span className="text-accent">const</span>
                {" close = recomputeOffset(\n  secret,      "}
                <span className="text-text-tertiary">{"// sealed by the keeper at the open\n"}</span>
                {"  earlyCalls,  "}
                <span className="text-text-tertiary">{"// each player's nonce\n"}</span>
                {"  vrf,         "}
                <span className="text-text-tertiary">{"// MagicBlock VRF\n"}</span>
                {");\n\n"}
                <span className="text-text-primary">{"close === round.offsetS; "}</span>
                <span className="text-text-tertiary">{"// true, so nobody chose it"}</span>
              </pre>
            </div>
            <div className="rounded-20 bg-bg-soft p-20">
              <p className="text-label text-text-secondary">The same pattern fits</p>
              <ul className="mt-10 flex flex-wrap gap-8">
                {FITS.map((f) => (
                  <li key={f} className="tile rounded-8 px-10 py-6 text-[13.5px] font-[600]">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-16 grid gap-16 md:grid-cols-2">
          {EXTRAS.map(({ icon: Icon, ...x }) => (
            <a
              key={x.title}
              href={x.href}
              className="group flex flex-col rounded-28 bg-bg-soft p-28 transition-colors hover:bg-bg-secondary-hover"
            >
              <span className="tile flex size-44 items-center justify-center rounded-12 text-accent">
                <Icon className="size-20" aria-hidden />
              </span>
              <h3 className="mt-20 text-[21px] leading-[1.2] font-[700] tracking-[-0.035em]">{x.title}</h3>
              <p className="mt-8 text-[15.5px] leading-[1.6] text-text-secondary">{x.body}</p>
              <span className="mt-16 inline-flex items-center gap-6 text-[14.5px] font-[600]">
                {x.cta}
                <ArrowRight className="size-15 transition-transform group-hover:translate-x-2" aria-hidden />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={`container-page scroll-mt-80 ${section} pt-0 md:pt-0`}>
        <SectionHead kicker="FAQ" title="Questions, answered." />
        <div className="mx-auto mt-56 flex max-w-[760px] flex-col gap-10">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-20 bg-bg-soft px-20 md:px-24">
              <summary className="flex cursor-pointer list-none items-center gap-14 py-18 [&::-webkit-details-marker]:hidden">
                <span className="flex-1 text-[17px] leading-[1.4] font-[600] tracking-[-0.02em]">
                  {f.q}
                </span>
                <span
                  aria-hidden
                  className="tile flex size-32 shrink-0 items-center justify-center rounded-10 text-[18px] leading-none transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-22 pr-40 text-[15.5px] leading-[1.6] text-text-secondary">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final call to action */}
      <section className="container-page pt-24 pb-96 text-center md:pb-128">
        <h2 className="text-display mx-auto max-w-[820px] text-[2.8rem] md:text-[4.6rem]">
          Ready for the next round?
        </h2>
        <p className="mx-auto mt-18 max-w-[480px] text-[17px] leading-[1.6] text-text-secondary md:text-[19px]">
          It opens in <NextRoundIn className="font-[600] text-text-primary" />. Make your call and
          watch the secret close revealed.
        </p>
        <ButtonLink href="/play" size="xl" className="mt-32" icon={<Play className="size-16 fill-current" />}>
          Play now
        </ButtonLink>
      </section>
    </>
  );
}
