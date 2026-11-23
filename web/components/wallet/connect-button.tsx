"use client";

import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { Check, Copy, ExternalLink, LogOut, Wallet as WalletIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { devnetExplorerUrl } from "@/lib/config";
import { cn } from "@/lib/cn";
import { shortAddress } from "@/lib/format";

const SUGGESTED = [
  { name: "Phantom", url: "https://phantom.com/download" },
  { name: "Solflare", url: "https://solflare.com/download" },
  { name: "Backpack", url: "https://backpack.app/download" },
];

export function ConnectButton({ size = "sm", className }: { size?: "sm" | "md"; className?: string }) {
  const { publicKey, connecting, wallet } = useWallet();
  const [open, setOpen] = useState(false);

  if (publicKey) return <AccountMenu className={className} />;

  return (
    <>
      <Button
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        disabled={connecting}
        icon={<WalletIcon className="size-16" />}
      >
        {connecting ? `Connecting${wallet ? ` to ${wallet.adapter.name}` : ""}…` : "Connect wallet"}
      </Button>
      <WalletModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function WalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { wallets, select } = useWallet();
  const detected = wallets.filter(
    (w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable,
  );

  // With autoConnect on, selecting a wallet starts the connection.
  function choose(name: WalletName) {
    select(name);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect a wallet"
      description="Blindside runs on Solana devnet. You'll sign once to play without pop-ups."
    >
      {detected.length > 0 ? (
        <ul className="flex flex-col gap-8">
          {detected.map((w) => (
            <li key={w.adapter.name}>
              <button
                onClick={() => choose(w.adapter.name)}
                className="flex h-56 w-full items-center gap-12 rounded-10 px-14 text-left shadow-[inset_0_0_0_1px_hsl(var(--border-secondary-hover))] transition-colors hover:bg-bg-secondary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={w.adapter.icon} alt="" className="size-28 rounded-6" />
                <span className="flex-1 text-[15px] font-[600]">{w.adapter.name}</span>
                <span className="text-label text-text-up">Detected</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div>
          <p className="mb-16 text-[14px] leading-[20px] text-text-secondary">
            No Solana wallet found in this browser. Install one, then come back to this page.
          </p>
          <ul className="flex flex-col gap-8">
            {SUGGESTED.map((w) => (
              <li key={w.name}>
                <a
                  href={w.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-52 items-center justify-between rounded-10 px-14 text-[15px] font-[600] shadow-[inset_0_0_0_1px_hsl(var(--border-secondary-hover))] transition-colors hover:bg-bg-secondary"
                >
                  Get {w.name}
                  <ExternalLink className="size-16 text-text-tertiary" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

function AccountMenu({ className }: { className?: string }) {
  const { publicKey, wallet, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!publicKey) return null;
  const address = publicKey.toBase58();

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy the address");
    }
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-36 items-center gap-8 rounded-10 pl-6 pr-12 font-mono text-[13px] shadow-[inset_0_0_0_1px_hsl(var(--border-secondary-hover))] transition-colors hover:bg-bg-secondary"
      >
        {wallet && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={wallet.adapter.icon} alt="" className="size-24 rounded-6" />
        )}
        <span className="tabular">{shortAddress(address)}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-[240px] rounded-12 bg-bg-elevated p-6 shadow-dropdown shadow-hairline"
        >
          <p className="px-10 pb-6 pt-6 text-label text-text-tertiary">
            Connected with {wallet?.adapter.name} on devnet
          </p>
          <MenuItem onClick={copy} icon={copied ? <Check className="size-16" /> : <Copy className="size-16" />}>
            {copied ? "Copied" : "Copy address"}
          </MenuItem>
          <MenuItem
            href={devnetExplorerUrl(address)}
            icon={<ExternalLink className="size-16" />}
          >
            View on Explorer
          </MenuItem>
          <MenuItem
            onClick={() => {
              setOpen(false);
              void disconnect();
            }}
            icon={<LogOut className="size-16" />}
          >
            Disconnect
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  children,
  icon,
  onClick,
  href,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const cls =
    "flex h-36 w-full items-center gap-10 rounded-8 px-10 text-[14px] font-[600] text-text-primary transition-colors hover:bg-bg-secondary";
  if (href)
    return (
      <a role="menuitem" href={href} target="_blank" rel="noreferrer" className={cls}>
        {icon}
        {children}
      </a>
    );
  return (
    <button role="menuitem" onClick={onClick} className={cls}>
      {icon}
      {children}
    </button>
  );
}
