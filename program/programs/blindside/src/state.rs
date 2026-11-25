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
/// (Used by the VRF version; kept so reason codes stay stable.)
pub const VOID_NO_RANDOMNESS: u8 = 1;
pub const VOID_STALE_PRICE: u8 = 2;
pub const VOID_MISSED_TICK: u8 = 3;
pub const VOID_NO_PRICE: u8 = 4;
pub const VOID_TIE: u8 = 5;
pub const VOID_ONE_SIDED: u8 = 6;

/// One call in a round. Zero-copy layout: 80 bytes, no implicit padding.
#[zero_copy]
#[derive(Default, Debug, PartialEq)]
pub struct CallEntry {
    pub player: Pubkey,
    /// Random value from the player's device. Calls made before the close is
    /// fixed (10 s) are mixed into it, so the keeper can't predict it either.
    pub nonce: [u8; 32],
    /// Stake in test-USDC base units.
    pub amount: u64,
    /// UP or DOWN.
    pub side: u8,
    /// 1 if it landed after the secret close: refunded at the reveal, never counted.
    pub late: u8,
    /// 1 once paid out.
    pub claimed: u8,
    pub _pad: [u8; 5],
}

/// One reusable round slot (round % SLOTS). Lives in the Private Ephemeral
/// Rollup with a permission that has no readers until the reveal, so the
/// close time, the starting price and the pools stay hidden while it runs.
///
/// Zero-copy (read in place) because it's ~4 KB, over Solana's 4 KB stack
/// frame. Wide fields first so the layout has no implicit padding.
#[account(zero_copy)]
#[derive(Debug)]
pub struct Slot {
    pub round: u64,
    /// Starting price (raw feed units, 1e-8 USD) and when it was recorded.
    pub strike: i64,
    pub strike_ts: i64,
    /// Result price, recorded 30 s after the strike.
    pub settle: i64,
    pub settle_ts: i64,
    /// Counted (on-time) stakes per side.
    pub up_pool: u64,
    pub down_pool: u64,
    /// The keeper's secret for this round, set at open. Public after the reveal.
    pub secret: [u8; 32],
    /// Running hash: H(secret), then H(prev ‖ player ‖ nonce) per early call.
    pub entropy: [u8; 32],
    /// MagicBlock VRF randomness for this round (if it arrived before 10 s).
    /// Public after the reveal.
    pub vrf: [u8; 32],
    pub calls: [CallEntry; MAX_CALLS],
    pub index: u8,
    pub bump: u8,
    pub status: u8,
    /// Seconds after the round start when calls stop counting (10..=50).
    /// Zero until it is fixed at 10 s.
    pub offset_s: u8,
    /// 1 once the close is fixed.
    pub seeded: u8,
    /// How many calls (in order) were mixed into the close.
    pub seed_calls: u8,
    /// UP, DOWN, VOID or PENDING.
    pub outcome: u8,
    pub void_reason: u8,
    pub call_count: u8,
    pub claimed_count: u8,
    /// 1 once VRF randomness arrived in time and was stored.
    pub vrf_ready: u8,
    pub _pad: [u8; 5],
}

impl Slot {
    pub const SIZE: usize = core::mem::size_of::<Slot>();

    /// Clear the round fields in place, keeping `index` and `bump`.
    pub fn reset(&mut self) {
        let (index, bump) = (self.index, self.bump);
        // Zero in place: building a fresh Slot would put ~4 KB on the stack.
        bytemuck::bytes_of_mut(self).fill(0);
        self.index = index;
        self.bump = bump;
    }

    /// An empty slot (on chain the account starts zeroed, which is the same).
    pub fn new(index: u8, bump: u8) -> Self {
        let mut s: Slot = bytemuck::Zeroable::zeroed();
        s.index = index;
        s.bump = bump;
        s
    }
}

/// A temporary key a player's wallet authorised to make calls and leave on
/// its behalf, so wallets never have to sign rollup transactions (which
/// carry a rollup blockhash some wallets can't place). Lives on Solana; the
/// rollup reads it. It can't withdraw: funds only leave via the wallet.
#[account]
#[derive(InitSpace)]
pub struct Session {
    pub owner: Pubkey,
    pub key: Pubkey,
    pub expires_at: i64,
    pub bump: u8,
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

/// The keeper role. Only this key can open rounds (it seeds each round's
/// secret). Kept apart from the admin, which is also the upgrade authority,
/// so the key that lives on an always-on server can't touch the program.
#[account]
#[derive(InitSpace)]
pub struct KeeperRole {
    pub keeper: Pubkey,
    pub bump: u8,
}

/// Faucet rate limit, one per wallet.
#[account]
#[derive(InitSpace)]
pub struct Drip {
    pub last_ts: i64,
    pub bump: u8,
}
