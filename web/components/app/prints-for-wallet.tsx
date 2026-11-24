"use client";

import { Images } from "lucide-react";
import { WalletGate } from "@/components/app/wallet-gate";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function PrintsForWallet() {
  return (
    <WalletGate
      title="Connect to see your prints"
      body="Prints aren't minted yet. Once they are, the ones you earn will show up here for the wallet you connect."
    >
      {(_, short) => (
        <EmptyState
          icon={<Images className="size-20" />}
          title="Prints are coming soon"
          body={`Nothing is minted yet for ${short}. When prints launch, they'll come from a close in the last second, a move over 1%, or five wins in a row.`}
          action={
            <ButtonLink href="/play" size="sm">
              Go to play
            </ButtonLink>
          }
        />
      )}
    </WalletGate>
  );
}
