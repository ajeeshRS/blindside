import type { Metadata } from "next";
import { PageHeader } from "@/components/app/app-shell";
import { HistoryForWallet } from "@/components/app/history-for-wallet";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <>
      <PageHeader
        kicker="Your calls"
        title="History"
        description="Every call you've made, with its outcome and a link to the round's proof."
      />
      <HistoryForWallet />
    </>
  );
}
