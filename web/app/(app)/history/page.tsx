import type { Metadata } from "next";
import { PageHeader } from "@/components/app/app-shell";
import { HistoryView } from "@/components/app/history-view";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <>
      <PageHeader
        kicker="Your calls"
        title="History"
        description="Every call you've made from this browser, how it went, and the proof. Anyone can verify a round's secret close."
      />
      <HistoryView />
    </>
  );
}
