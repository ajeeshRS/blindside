import type { Metadata } from "next";
import { PageHeader, SectionTitle } from "@/components/app/app-shell";
import { FeedHealth } from "@/components/market/feed-health";
import { RoundSchedule } from "@/components/play/round-schedule";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = { title: "How it's fair" };

const SECTIONS = [
  {
    title: "Nobody can predict the close, not even us",
    body: "At 10 seconds the close is fixed somewhere between 10 and 50 seconds. It's mixed from our secret, a random value from every player who called so far, and MagicBlock VRF randomness. We never see players' values or the VRF value, players never see our secret, and the VRF oracle sees neither. After the reveal, anyone can recompute it.",
  },
  {
    title: "The starting price is set at the close",
    body: "When the hidden close arrives, the live SOL price becomes the round's starting price. The result is the price 30 seconds later. Every call that counts was made before its starting price existed.",
  },
  {
    title: "Late calls are refunded, not rejected",
    body: "Rejecting a late call would tell you the close had passed. So every call is accepted, and the ones that landed after the close are refunded in full at the reveal.",
  },
  {
    title: "Pools stay hidden until the reveal",
    body: "Nobody can see how much is on up or down while a round runs, so there's no last-second odds sniping. The split is shown when the round is revealed.",
  },
  {
    title: "The timing of the close can't leak",
    body: "The program records the price on every oracle update, at the same steady rate whatever the close time is. From outside, the moment the starting price is taken looks like every other update.",
  },
];

const TRUST = [
  {
    who: "Players and bots",
    sees: "Nothing about the close or the pools until the reveal.",
  },
  {
    who: "The keeper (us)",
    sees: "Our own secret, but not players' random values or the MagicBlock VRF value, so we can't work out the close.",
  },
  {
    who: "Anyone with physical access to the enclave machines",
    sees: "Research such as TEE.fail (Oct 2025) shows Intel TDX memory can be read with physical access. Stakes are small and a hidden close is only worth one round.",
  },
  {
    who: "Our admin key",
    sees: "No round data. Round accounts have no readers, and program upgrades get locked before mainnet.",
  },
];

const FALLBACKS = [
  "If the price feed stalls at the close or at settlement, the round is voided and every call is refunded.",
  "If no price was recorded within 250 ms of the close, the round is voided and every call is refunded.",
  "A round counts as paid only after the payout is confirmed on Solana.",
  "If only one side has calls, everyone is refunded.",
];

export default function FairPage() {
  return (
    <div className="max-w-[960px]">
      <PageHeader
        kicker="Fairness"
        title="How it's fair"
        description="What's hidden, who could see it, and what happens when something goes wrong, in plain words."
      />

      <Surface>
        <ol>
          {SECTIONS.map((s, i) => (
            <li
              key={s.title}
              className="flex gap-16 border-border-secondary px-20 py-18 not-last:border-b md:gap-24 md:px-24"
            >
              <span className="mt-2 text-label text-text-tertiary">0{i + 1}</span>
              <div>
                <h2 className="text-[17px] leading-[23px] font-[652]">{s.title}</h2>
                <p className="mt-4 text-[15px] leading-[22px] text-text-secondary">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Surface>

      <div className="mt-48">
        <SectionTitle index="Live">The round clock and the price feed</SectionTitle>
        <div className="grid gap-16 md:grid-cols-2">
          <RoundSchedule />
          <FeedHealth />
        </div>
      </div>

      <div className="mt-48">
        <SectionTitle index="Trust">Who could see the close</SectionTitle>
        <Surface>
          <dl>
            {TRUST.map((t) => (
              <div
                key={t.who}
                className="grid gap-4 border-border-secondary px-20 py-16 not-last:border-b md:grid-cols-[260px_1fr] md:gap-24 md:px-24"
              >
                <dt className="text-[15px] leading-[22px] font-[600]">{t.who}</dt>
                <dd className="text-[15px] leading-[22px] text-text-secondary">{t.sees}</dd>
              </div>
            ))}
          </dl>
        </Surface>
      </div>

      <div className="mt-48">
        <SectionTitle index="Fallbacks">When something goes wrong</SectionTitle>
        <Surface>
          <ul>
            {FALLBACKS.map((f) => (
              <li
                key={f}
                className="flex gap-12 border-border-secondary px-20 py-14 text-[15px] leading-[22px] not-last:border-b md:px-24"
              >
                <span className="mt-8 size-6 shrink-0 rounded-[2px] bg-text-primary" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </Surface>
      </div>

      <p className="mt-32 text-label text-text-tertiary">
        Devnet build with test USDC. Every price, transaction and proof is real; the funds have no
        value.
      </p>
    </div>
  );
}
