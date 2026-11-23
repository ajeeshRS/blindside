"use client";

import { ExternalLink, History } from "lucide-react";
import { useState } from "react";
import { WalletGate } from "@/components/app/wallet-gate";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { devnetExplorerUrl } from "@/lib/config";
import { cn } from "@/lib/cn";

const FILTERS = ["All", "Won", "Lost", "Refunded", "Voided"] as const;

export function HistoryForWallet() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  return (
    <WalletGate
      title="Connect to see your calls"
      body="Your history is read from the chain for the wallet you connect."
    >
      {(address, short) => (
        <>
          <div className="mb-16 flex flex-wrap items-center justify-between gap-12">
            <div role="tablist" aria-label="Filter calls" className="flex flex-wrap gap-6">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "h-32 rounded-8 px-12 font-mono text-[12px] transition-colors",
                    filter === f
                      ? "bg-bg-brand text-text-on-color"
                      : "text-text-secondary shadow-[inset_0_0_0_1px_hsl(var(--border-secondary-hover))] hover:bg-bg-secondary hover:text-text-primary",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <a
              href={devnetExplorerUrl(address)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-6 text-label text-text-secondary hover:text-text-primary"
            >
              {short} on Explorer <ExternalLink className="size-14" />
            </a>
          </div>
          <EmptyState
            icon={<History className="size-20" />}
            title={filter === "All" ? "No calls yet" : `No ${filter.toLowerCase()} calls`}
            body="Calls you make show up here as soon as they land, and update when the round is revealed."
            action={
              <ButtonLink href="/play" size="sm">
                Make a call
              </ButtonLink>
            }
          />
        </>
      )}
    </WalletGate>
  );
}
