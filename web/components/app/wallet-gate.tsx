"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ConnectButton } from "@/components/wallet/connect-button";
import { shortAddress } from "@/lib/format";

/** Renders children with the connected address, or a connect prompt. */
export function WalletGate({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: (address: string, short: string) => ReactNode;
}) {
  const { publicKey } = useWallet();
  if (!publicKey) {
    return (
      <EmptyState
        icon={<Wallet className="size-20" />}
        title={title}
        body={body}
        action={<ConnectButton size="sm" />}
      />
    );
  }
  const address = publicKey.toBase58();
  return <>{children(address, shortAddress(address))}</>;
}
