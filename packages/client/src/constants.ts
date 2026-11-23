import { PublicKey } from "@solana/web3.js";
import idl from "./idl/blindside.json";

/** The deployed Blindside program (from the IDL). */
export const PROGRAM_ID = new PublicKey(idl.address);

export const BASE_RPC = "https://api.devnet.solana.com";
/** MagicBlock's Private Ephemeral Rollup (TEE) on devnet. */
export const TEE_RPC = "https://devnet-tee.magicblock.app";
export const TEE_WS = "wss://devnet-tee.magicblock.app";
/** Pyth Lazer SOL/USD feed on MagicBlock rollups (price: i64 at 73, 1e-8 USD). */
export const SOL_USD_FEED = new PublicKey("ENYwebBThHzmzwPLAQvCucUTsjyfBSZdD9ViXksS4jPu");

/**
 * The round clock, in seconds. Single source of truth for the web app, the
 * keeper and the tests; must match programs/blindside/src/constants.rs.
 */
export const ROUND = {
  /** Rounds start on wall-clock multiples of this: round = floor(unix / 90). */
  cycle: 90,
  /** Calls before this always count (the close can't be earlier). */
  closeMin: 10,
  /** The close is at the latest here; calls are accepted until then. */
  closeMax: 50,
  /** The result is the price this long after the close. */
  hold: 30,
  /** Everything becomes public here. */
  reveal: 80,
  /** How early a round can be opened. */
  openLead: 60,
  /** Reusable round slots on chain (round % slots). */
  slots: 8,
} as const;

export const DECIMALS = 6;
export const ONE_USDC = 1_000_000;
export const MIN_STAKE_USDC = 1;
export const MAX_STAKE_USDC = 25;
export const FAUCET_USDC = 100;

export const SIDE = { up: 1, down: 2 } as const;
export const STATUS = { empty: 0, open: 1, revealed: 2 } as const;
export const OUTCOME = { pending: 0, up: 1, down: 2, void: 3 } as const;
export const VOID_REASON: Record<number, string> = {
  0: "",
  1: "No randomness arrived in time",
  2: "The price feed was stale",
  3: "A price wasn't recorded on time",
  4: "No price was recorded",
  5: "The price didn't move",
  6: "Only one side had calls",
};
