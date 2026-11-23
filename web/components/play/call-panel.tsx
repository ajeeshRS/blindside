"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { ConnectButton } from "@/components/wallet/connect-button";
import { STAKES_USDC } from "@/lib/config";
import { cn } from "@/lib/cn";
import { roundAvailability } from "@/lib/round";

export function CallPanel() {
  const { publicKey } = useWallet();
  const [stake, setStake] = useState<number>(STAKES_USDC[1]);
  const availability = roundAvailability();
  const canCall = availability.available && Boolean(publicKey);

  return (
    <Panel label="Your call">
      <div className="p-16 md:p-20">
        <p className="text-[18px] leading-[24px] font-[652] tracking-[-0.2px]">
          Higher or lower in 30 seconds?
        </p>

        <fieldset className="mt-16">
          <legend className="mb-8 text-label text-text-tertiary">Stake (USDC)</legend>
          <div className="grid grid-cols-4 gap-6">
            {STAKES_USDC.map((s) => (
              <button
                key={s}
                onClick={() => setStake(s)}
                aria-pressed={stake === s}
                className={cn(
                  "h-40 rounded-8 font-mono text-[15px] tabular transition-colors",
                  stake === s
                    ? "bg-bg-brand text-text-on-color"
                    : "text-text-primary shadow-[inset_0_0_0_1px_hsl(var(--border-secondary-hover))] hover:bg-bg-secondary",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-12 grid grid-cols-2 gap-8">
          <Button
            variant="up"
            className="h-56 rounded-12 text-[16px] font-[600]"
            disabled={!canCall}
            icon={<ArrowUp className="size-20" strokeWidth={2.6} />}
            aria-describedby="call-note"
          >
            Higher
          </Button>
          <Button
            variant="down"
            className="h-56 rounded-12 text-[16px] font-[600]"
            disabled={!canCall}
            icon={<ArrowDown className="size-20" strokeWidth={2.6} />}
            aria-describedby="call-note"
          >
            Lower
          </Button>
        </div>

        {availability.available && !publicKey ? (
          <div className="mt-12">
            <ConnectButton className="w-full" />
          </div>
        ) : null}

        <p id="call-note" className="mt-12 text-[13px] leading-[19px] text-text-tertiary">
          {!availability.available
            ? "Calls open once rounds go live on devnet."
            : "Calls are final. A call that lands after the secret close is refunded."}
        </p>
      </div>
    </Panel>
  );
}
