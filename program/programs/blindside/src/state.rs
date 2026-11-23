use anchor_lang::prelude::*;

use crate::constants::MAX_CALLS;

/// Program-wide settings. Base layer, never delegated.
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    /// Test USDC mint (authority: this config PDA).
    pub mint: Pubkey,
    /// Token account holding every player's deposits (authority: this config PDA).
    pub vault: Pubkey,
    pub bump: u8,
}

/// Round status.
pub const STATUS_EMPTY: u8 = 0;
pub const STATUS_OPEN: u8 = 1;
pub const STATUS_REVEALED: u8 = 2;

/// Call side / round outcome.
pub const UP: u8 = 1;
pub const DOWN: u8 = 2;
pub const PENDING: u8 = 0;
pub const VOID: u8 = 3;

/// Why a round was voided (everyone refunded).
pub const VOID_NONE: u8 = 0;
pub const VOID_NO_RANDOMNESS: u8 = 1;
pub const VOID_STALE_PRICE: u8 = 2;
pub const VOID_MISSED_TICK: u8 = 3;
pub const VOID_NO_PRICE: u8 = 4;
pub const VOID_TIE: u8 = 5;
pub const VOID_ONE_SIDED: u8 = 6;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, InitSpace, Debug, PartialEq)]
pub struct CallEntry {
    pub player: Pubkey,
    /// Stake in test-USDC base units.
    pub amount: u64,
    /// UP or DOWN.
    pub side: u8,
    /// Landed after the secret close: refunded at the reveal, never counted.
    pub late: bool,
    pub claimed: bool,
}

/// One reusable round slot (round % SLOTS). Lives in the Private Ephemeral
/// Rollup with a permission that has no readers until the reveal, so the
/// close time, the starting price and the pools stay hidden while it runs.
#[account]
#[derive(InitSpace, Debug)]
pub struct Slot {
    pub index: u8,
    pub bump: u8,
    pub round: u64,
    pub status: u8,
    /// Seconds after the round start when calls stop counting (10..=50).
    pub offset_s: u8,
    pub vrf_ready: bool,
    /// UP, DOWN, VOID or PENDING.
    pub outcome: u8,
    pub void_reason: u8,
    /// Starting price (raw feed units, 1e-8 USD) and when it was recorded.
    pub strike: i64,
    pub strike_ts: i64,
    /// Result price, recorded 30 s after the strike.
    pub settle: i64,
    pub settle_ts: i64,
    /// Counted (on-time) stakes per side.
    pub up_pool: u64,
    pub down_pool: u64,
    pub call_count: u8,
    pub claimed_count: u8,
    pub calls: [CallEntry; MAX_CALLS],
}

impl Slot {
    /// Clear the round fields in place, keeping `index` and `bump`.
    pub fn reset(&mut self) {
        self.round = 0;
        self.status = STATUS_EMPTY;
        self.offset_s = 0;
        self.vrf_ready = false;
        self.outcome = PENDING;
        self.void_reason = VOID_NONE;
        self.strike = 0;
        self.strike_ts = 0;
        self.settle = 0;
        self.settle_ts = 0;
        self.up_pool = 0;
        self.down_pool = 0;
        self.call_count = 0;
        self.claimed_count = 0;
        for c in self.calls.iter_mut() {
            *c = CallEntry::default();
        }
    }

    /// An empty slot (used by tests; on chain the account starts zeroed).
    pub fn new(index: u8, bump: u8) -> Self {
        Slot {
            index,
            bump,
            round: 0,
            status: STATUS_EMPTY,
            offset_s: 0,
            vrf_ready: false,
            outcome: PENDING,
            void_reason: VOID_NONE,
            strike: 0,
            strike_ts: 0,
            settle: 0,
            settle_ts: 0,
            up_pool: 0,
            down_pool: 0,
            call_count: 0,
            claimed_count: 0,
            calls: [CallEntry::default(); MAX_CALLS],
        }
    }
}

/// A player's in-game balance. Delegated to the private rollup while
/// playing; only the player can read it.
#[account]
#[derive(InitSpace)]
pub struct Player {
    pub owner: Pubkey,
    /// Test-USDC base units available to stake.
    pub balance: u64,
    /// Calls not yet paid out. Funds can't leave the rollup while > 0.
    pub pending: u8,
    pub bump: u8,
}

/// Faucet rate limit, one per wallet.
#[account]
#[derive(InitSpace)]
pub struct Drip {
    pub last_ts: i64,
    pub bump: u8,
}
