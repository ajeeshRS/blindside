"use client";

import { Images } from "lucide-react";
import { WalletGate } from "@/components/app/wallet-gate";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export function PrintsForWallet() {
  return (
    <WalletGate
      title="Connect to see your prints"
      body="Prints live in your wallet. Connect it to see the ones you've earned."
    >
      {(_, short) => (
        <EmptyState
          icon={<Images className="size-20" />}
          title="No prints yet"
          body={`${short} hasn't won a rare round yet. Prints come from a close in the last second, a move over 1%, or five wins in a row.`}
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
