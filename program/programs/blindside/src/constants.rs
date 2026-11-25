use anchor_lang::prelude::*;

/// MagicBlock devnet TEE (Private Ephemeral Rollup) validator, `devnet-tee.magicblock.app`.
pub const TEE_VALIDATOR: Pubkey = pubkey!("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo");
/// MagicBlock permission (access control) program.
pub const PERMISSION_PROGRAM: Pubkey = pubkey!("ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1");
/// Pyth Lazer price program on MagicBlock rollups, and its SOL/USD feed.
pub const PRICE_PROGRAM: Pubkey = pubkey!("PriCems5tHihc6UDXDjzjeawomAwBduWMGAi8ZUjppd");
pub const SOL_USD_FEED: Pubkey = pubkey!("ENYwebBThHzmzwPLAQvCucUTsjyfBSZdD9ViXksS4jPu");

pub const CONFIG_SEED: &[u8] = b"config";
pub const MINT_SEED: &[u8] = b"mint";
pub const VAULT_SEED: &[u8] = b"vault";
/// v3 slots (secret + nonces + VRF close). Earlier "slot" and "round_slot"
/// accounts are abandoned on devnet.
pub const SLOT_SEED: &[u8] = b"round_slot_vrf";
pub const PLAYER_SEED: &[u8] = b"player";
pub const DRIP_SEED: &[u8] = b"drip";
/// Who may open rounds (a hot key on the keeper server, separate from the
/// admin / upgrade authority).
pub const KEEPER_SEED: &[u8] = b"keeper";
/// A player's session key record (on Solana, read by the rollup).
pub const SESSION_SEED: &[u8] = b"session";
/// Longest a session key may stay valid.
pub const MAX_SESSION_S: i64 = 7 * 24 * 60 * 60;

// ---- The round clock (seconds). Must match web/lib/config.ts `ROUND`. ----
/// Rounds start on wall-clock multiples of 90 s: round = floor(unix / 90).
pub const CYCLE_S: i64 = 90;
/// The secret close lands on a whole second in [10 s, 50 s] after the start.
/// It is fixed at 10 s from the keeper's secret, every nonce received so far,
/// and MagicBlock VRF randomness if it arrived in time.
pub const CLOSE_MIN_S: i64 = 10;
pub const CLOSE_MAX_S: i64 = 50;
/// The result is the price 30 s after the close.
pub const HOLD_S: i64 = 30;
/// Everything becomes public at 80 s.
pub const REVEAL_S: i64 = 80;
/// A round can be opened up to this long before it starts.
pub const OPEN_LEAD_S: i64 = 60;
/// ...and no later than this long after it starts.
pub const OPEN_GRACE_S: i64 = 5;
/// A price older than this (vs the rollup clock) is stale.
pub const STALE_S: i64 = 3;
/// If the price wasn't recorded within this long of the close (or of
/// close + 30 s), the round is voided rather than settled on a late price.
pub const MAX_TICK_GAP_S: i64 = 2;

// ---- Rounds and stakes ----
/// Rounds reuse this many slot accounts (round % SLOTS).
pub const SLOTS: u64 = 8;
/// Calls a single round can hold.
pub const MAX_CALLS: usize = 48;
/// Test USDC has 6 decimals.
pub const DECIMALS: u8 = 6;
pub const ONE_USDC: u64 = 1_000_000;
/// Per-call stake limits.
pub const MIN_STAKE: u64 = ONE_USDC;
pub const MAX_STAKE: u64 = 25 * ONE_USDC;

// ---- Test USDC faucet ----
pub const FAUCET_AMOUNT: u64 = 100 * ONE_USDC;
pub const FAUCET_COOLDOWN_S: i64 = 60 * 60;

// ---- Permission member flags (MagicBlock access control) ----
pub const TX_LOGS_FLAG: u8 = 1 << 1;
pub const TX_BALANCES_FLAG: u8 = 1 << 2;
pub const TX_MESSAGE_FLAG: u8 = 1 << 3;
