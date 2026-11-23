import { ROUND as CLIENT_ROUND } from "@blindside/client";
import { PublicKey } from "@solana/web3.js";

/** MagicBlock Ephemeral Rollup (devnet, Asia) — serves the Pyth Lazer price feeds. */
export const ER_HTTP_URL =
  process.env.NEXT_PUBLIC_ER_HTTP_URL ?? "https://devnet-as.magicblock.app";
export const ER_WS_URL =
  process.env.NEXT_PUBLIC_ER_WS_URL ?? "wss://devnet-as.magicblock.app";

/** Solana devnet base layer, used for the wallet connection. */
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

/** MagicBlock pricing oracle program and the SOL/USD Pyth Lazer feed (ID 6). */
export const ORACLE_PROGRAM_ID = new PublicKey(
  "PriCems5tHihc6UDXDjzjeawomAwBduWMGAi8ZUjppd",
);
export const SOL_USD_FEED = new PublicKey(
  "ENYwebBThHzmzwPLAQvCucUTsjyfBSZdD9ViXksS4jPu",
);

/** Set NEXT_PUBLIC_ROUNDS_PAUSED=1 to show the live price with calls closed. */
export const ROUNDS_PAUSED = process.env.NEXT_PUBLIC_ROUNDS_PAUSED === "1";

/**
 * Fixed 90-second round cycle (seconds from round open), from the shared
 * client so the web app, keeper and program can't disagree.
 */
export const ROUND = {
  cycle: CLIENT_ROUND.cycle,
  sureUntil: CLIENT_ROUND.closeMin,
  closeLatest: CLIENT_ROUND.closeMax,
  revealAt: CLIENT_ROUND.reveal,
  resultUntil: CLIENT_ROUND.cycle,
  holdAfterClose: CLIENT_ROUND.hold,
} as const;

export const STAKES_USDC = [1, 5, 10, 25] as const;

export function erExplorerUrl(address: string) {
  const custom = encodeURIComponent(ER_HTTP_URL);
  return `https://explorer.solana.com/address/${address}?cluster=custom&customUrl=${custom}`;
}

export function devnetExplorerUrl(address: string) {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}
