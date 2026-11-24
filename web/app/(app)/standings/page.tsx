import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/app/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Surface } from "@/components/ui/surface";

export const metadata: Metadata = { title: "Standings" };

const COLUMNS = [
  { name: "Net result", body: "USDC won minus USDC lost across the season's staked rounds." },
  { name: "Longest streak", body: "Most correct calls in a row, staked or free." },
  { name: "Rarest print", body: "The rarest print earned this season." },
];

export default function StandingsPage() {
  return (
    <>
      <PageHeader
        kicker="Compete"
        title="Standings"
        description="A weekly season table. Over 30-second moves it shows how the season went, not who is most skilled."
      />
      <EmptyState
        icon={<Trophy className="size-20" />}
        title="Standings are coming soon"
        body="Rounds are live, but the season table isn't built yet. It will fill in from revealed rounds, which anyone can already verify on the History page."
        action={
          <ButtonLink href="/play" size="sm">
            Play a round
          </ButtonLink>
        }
      />
      <div className="mt-48">
        <SectionTitle index="Columns">What the table shows</SectionTitle>
        <Surface className="grid md:grid-cols-3">
          {COLUMNS.map((c, i) => (
            <div
              key={c.name}
              className="border-border-secondary p-20 not-last:border-b md:not-last:border-r md:not-last:border-b-0"
            >
              <span className="text-label text-text-tertiary">0{i + 1}</span>
              <h3 className="mt-6 text-[17px] leading-[23px] font-[652]">{c.name}</h3>
              <p className="mt-4 text-[14px] leading-[21px] text-text-secondary">{c.body}</p>
            </div>
          ))}
        </Surface>
      </div>
    </>
  );
}
