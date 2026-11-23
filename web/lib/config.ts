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

/** Blindside program. Rounds stay closed until this is set. */
export const BLINDSIDE_PROGRAM_ID = process.env.NEXT_PUBLIC_BLINDSIDE_PROGRAM_ID
  ? new PublicKey(process.env.NEXT_PUBLIC_BLINDSIDE_PROGRAM_ID)
  : null;

/** Fixed 90-second round cycle (seconds from round open). */
export const ROUND = {
  cycle: 90,
  sureUntil: 10,
  closeLatest: 50,
  revealAt: 80,
  resultUntil: 90,
  holdAfterClose: 30,
} as const;

export const STAKES_USDC = [1, 5, 10, 25] as const;

export function erExplorerUrl(address: string) {
  const custom = encodeURIComponent(ER_HTTP_URL);
  return `https://explorer.solana.com/address/${address}?cluster=custom&customUrl=${custom}`;
}

export function devnetExplorerUrl(address: string) {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}
