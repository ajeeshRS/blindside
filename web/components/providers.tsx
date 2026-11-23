"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { MotionConfig } from "motion/react";
import { useEffect, useMemo, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import type { WalletError } from "@solana/wallet-adapter-base";
import { BlindsideSession } from "@/lib/blindside/session";
import { TestWalletAdapter } from "@/lib/blindside/test-wallet";
import { SOLANA_RPC_URL } from "@/lib/config";
import { useSettings } from "@/lib/settings";

function onWalletError(error: WalletError) {
  if (/reject|cancel|closed/i.test(`${error.name} ${error.message}`)) return;
  toast.error(error.message || "The wallet couldn't connect. Try again.");
}

export function Providers({ children }: { children: ReactNode }) {
  const { motion } = useSettings();
  useEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);
  // Wallet Standard wallets register themselves; the devnet test wallet is ours.
  const wallets = useMemo(() => [new TestWalletAdapter()], []);

  return (
    <MotionConfig reducedMotion={motion === "reduced" ? "always" : "user"}>
    <ConnectionProvider endpoint={SOLANA_RPC_URL} config={{ commitment: "confirmed" }}>
      {/* Wallet Standard wallets (Phantom, Solflare, Backpack, Seeker) register themselves. */}
      <WalletProvider wallets={wallets} autoConnect onError={onWalletError}>
        <BlindsideSession>{children}</BlindsideSession>
        <Toaster
          position="bottom-center"
          toastOptions={{
            className:
              "!rounded-16 !bg-bg-elevated !text-text-primary !shadow-dropdown !border-0 !text-subtle",
          }}
        />
      </WalletProvider>
    </ConnectionProvider>
    </MotionConfig>
  );
}
