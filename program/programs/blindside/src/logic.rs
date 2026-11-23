//! The round rules as plain functions over a `Slot`, so they can be tested
//! without a validator. Instruction handlers do account plumbing and call
//! into these.
//!
//! Privacy rule for everything here: while a round runs, no handler may
//! behave differently (succeed vs fail, touch different accounts) depending
//! on the hidden close. Calls are always accepted inside the public 0–50 s
//! window, and `tick` always succeeds.
//!
//! How the close is chosen (no single party controls it):
//!   entropy₀ = H("blindside" ‖ secret)            secret: set by the keeper at open
//!   entropyᵢ = H(entropyᵢ₋₁ ‖ playerᵢ ‖ nonceᵢ)    each call before the close is fixed
//!   close    = 10 + u64(entropy at 10 s) mod 41   fixed by the first tick at ≥ 10 s
//! The keeper doesn't see players' nonces and players don't see the secret, so
//! nobody can predict the close. After the reveal, the secret and every nonce
//! are public and anyone can recompute it (`recompute_offset`).

use anchor_lang::prelude::*;
use solana_sha256_hasher::hashv;

use crate::constants::*;
use crate::errors::BlindsideError;
use crate::state::*;

pub fn round_start(round: u64) -> i64 {
    (round as i64) * CYCLE_S
}

pub fn slot_index(round: u64) -> u8 {
    (round % SLOTS) as u8
}

/// Close offset in whole seconds, uniform over [CLOSE_MIN_S, CLOSE_MAX_S].
pub fn close_offset(entropy: &[u8; 32]) -> u8 {
    let r = u64::from_le_bytes(entropy[0..8].try_into().unwrap());
    let span = (CLOSE_MAX_S - CLOSE_MIN_S + 1) as u64;
    (CLOSE_MIN_S as u64 + r % span) as u8
}

pub fn initial_entropy(secret: &[u8; 32]) -> [u8; 32] {
    hashv(&[b"blindside", secret]).to_bytes()
}

pub fn mix(entropy: &[u8; 32], player: &Pubkey, nonce: &[u8; 32]) -> [u8; 32] {
    hashv(&[entropy, player.as_ref(), nonce]).to_bytes()
}

/// Recompute a revealed round's close from its public secret and calls.
pub fn recompute_offset(secret: &[u8; 32], calls: &[CallEntry]) -> u8 {
    let e = calls
        .iter()
        .fold(initial_entropy(secret), |e, c| mix(&e, &c.player, &c.nonce));
    close_offset(&e)
}

/// Read price (1e-8 USD) and publish time (unix s) from a Pyth Lazer feed
/// account on a MagicBlock rollup.
pub fn read_feed(data: &[u8]) -> Option<(i64, i64)> {
    if data.len() < 101 {
        return None;
    }
    let price = i64::from_le_bytes(data[73..81].try_into().ok()?);
    let publish = i64::from_le_bytes(data[93..101].try_into().ok()?);
    Some((price, publish))
}

/// Start a new round in this slot with the keeper's secret.
pub fn open(slot: &mut Slot, round: u64, now: i64, secret: [u8; 32]) -> Result<()> {
    require!(slot.index == slot_index(round), BlindsideError::WrongSlot);
    let start = round_start(round);
    require!(
        now >= start - OPEN_LEAD_S && now < start + OPEN_GRACE_S,
        BlindsideError::OpenWindowClosed
    );
    let finished = slot.status == STATUS_EMPTY
        || (slot.status == STATUS_REVEALED && slot.claimed_count == slot.call_count);
    require!(finished, BlindsideError::SlotBusy);
    require!(round > slot.round || slot.status == STATUS_EMPTY, BlindsideError::RoundNotNewer);

    slot.reset();
    slot.round = round;
    slot.status = STATUS_OPEN;
    slot.secret = secret;
    slot.entropy = initial_entropy(&secret);
    Ok(())
}

fn void(slot: &mut Slot, reason: u8) {
    slot.outcome = VOID;
    slot.void_reason = reason;
}

/// Called at a steady rate by anyone. Records the starting price at the
/// first tick at/after the hidden close, and the result 30 s later. Never
/// fails, so its transactions look the same whatever the close time is.
pub fn tick(slot: &mut Slot, now: i64, price: i64, publish: i64) {
    if slot.status != STATUS_OPEN || slot.outcome == VOID {
        return;
    }
    let start = round_start(slot.round);
    if slot.seeded == 0 {
        if now < start + CLOSE_MIN_S {
            return;
        }
        // Fix the close from the secret and every call so far.
        slot.offset_s = close_offset(&slot.entropy);
        slot.seed_calls = slot.call_count;
        slot.seeded = 1;
    }
    let stale = price <= 0 || now - publish > STALE_S;

    if slot.strike_ts == 0 {
        let close_at = start + slot.offset_s as i64;
        if now < close_at {
            return;
        }
        if now > close_at + MAX_TICK_GAP_S {
            void(slot, VOID_MISSED_TICK);
        } else if stale {
            void(slot, VOID_STALE_PRICE);
        } else {
            slot.strike = price;
            slot.strike_ts = now;
        }
        return;
    }

    if slot.settle_ts == 0 {
        let settle_at = slot.strike_ts + HOLD_S;
        if now < settle_at {
            return;
        }
        if now > settle_at + MAX_TICK_GAP_S {
            void(slot, VOID_MISSED_TICK);
        } else if stale {
            void(slot, VOID_STALE_PRICE);
        } else {
            slot.settle = price;
            slot.settle_ts = now;
        }
    }
}

/// Record a call. Calls are accepted the same way all through the public
/// 0–50 s window; whether one landed after the hidden close is stored
/// privately and only matters at the reveal.
pub fn place_call(
    slot: &mut Slot,
    round: u64,
    now: i64,
    player: Pubkey,
    side: u8,
    amount: u64,
    nonce: [u8; 32],
) -> Result<()> {
    require!(
        slot.status == STATUS_OPEN && slot.round == round,
        BlindsideError::RoundNotOpen
    );
    let start = round_start(round);
    require!(now >= start && now < start + CLOSE_MAX_S, BlindsideError::CallsClosed);
    require!(side == UP || side == DOWN, BlindsideError::BadSide);
    require!(
        (MIN_STAKE..=MAX_STAKE).contains(&amount),
        BlindsideError::BadStake
    );
    let n = slot.call_count as usize;
    require!(
        !slot.calls[..n].iter().any(|c| c.player == player),
        BlindsideError::AlreadyCalled
    );
    require!(n < MAX_CALLS, BlindsideError::RoundFull);

    let late = slot.strike_ts != 0;
    slot.calls[n] = CallEntry {
        player,
        nonce,
        amount,
        side,
        late: late as u8,
        claimed: 0,
        _pad: [0; 5],
    };
    if slot.seeded == 0 {
        slot.entropy = mix(&slot.entropy, &player, &nonce);
    }
    slot.call_count += 1;
    if !late {
        if side == UP {
            slot.up_pool = slot.up_pool.checked_add(amount).ok_or(BlindsideError::Overflow)?;
        } else {
            slot.down_pool = slot.down_pool.checked_add(amount).ok_or(BlindsideError::Overflow)?;
        }
    }
    Ok(())
}

/// Decide the outcome and make the round public. Only at/after 80 s.
pub fn reveal(slot: &mut Slot, now: i64) -> Result<()> {
    require!(slot.status == STATUS_OPEN, BlindsideError::RoundNotOpen);
    require!(
        now >= round_start(slot.round) + REVEAL_S,
        BlindsideError::RevealTooEarly
    );
    if slot.outcome != VOID {
        if slot.strike_ts == 0 || slot.settle_ts == 0 {
            void(slot, VOID_NO_PRICE);
        } else if slot.settle == slot.strike {
            void(slot, VOID_TIE);
        } else {
            let side = if slot.settle > slot.strike { UP } else { DOWN };
            let (win, lose) = pools(slot, side);
            if win == 0 || lose == 0 {
                void(slot, VOID_ONE_SIDED);
            } else {
                slot.outcome = side;
            }
        }
    }
    slot.status = STATUS_REVEALED;
    Ok(())
}

fn pools(slot: &Slot, side: u8) -> (u64, u64) {
    if side == UP {
        (slot.up_pool, slot.down_pool)
    } else {
        (slot.down_pool, slot.up_pool)
    }
}

/// What a call pays back once the round is revealed.
pub fn payout(slot: &Slot, call: &CallEntry) -> u64 {
    if slot.outcome == VOID || call.late != 0 {
        return call.amount;
    }
    if call.side != slot.outcome {
        return 0;
    }
    let (win, lose) = pools(slot, call.side);
    // Pro-rata share of the losing pool. Rounds down; dust stays in the vault.
    let share = (call.amount as u128 * lose as u128 / win as u128) as u64;
    call.amount + share
}

/// Mark a player's call paid and return the amount to credit.
pub fn claim(slot: &mut Slot, player: Pubkey) -> Result<u64> {
    require!(slot.status == STATUS_REVEALED, BlindsideError::NotRevealed);
    let n = slot.call_count as usize;
    let i = slot.calls[..n]
        .iter()
        .position(|c| c.player == player)
        .ok_or(BlindsideError::NoCall)?;
    require!(slot.calls[i].claimed == 0, BlindsideError::AlreadyClaimed);
    let amount = payout(slot, &slot.calls[i]);
    slot.calls[i].claimed = 1;
    slot.claimed_count += 1;
    Ok(amount)
}

#[cfg(test)]
mod tests {
    use super::*;

    const ROUND: u64 = 19_947_000; // slot 0 (19_947_000 % 8 == 0)
    fn start() -> i64 {
        round_start(ROUND)
    }
    fn key(n: u8) -> Pubkey {
        Pubkey::new_from_array([n; 32])
    }
    const SECRET: [u8; 32] = [7; 32];
    fn open_t(s: &mut Slot, round: u64, now: i64) -> Result<()> {
        open(s, round, now, SECRET)
    }
    fn pc(s: &mut Slot, round: u64, now: i64, p: Pubkey, side: u8, amount: u64) -> Result<()> {
        place_call(s, round, now, p, side, amount, [9; 32])
    }
    fn rnd(n: u64) -> [u8; 32] {
        let mut r = [0u8; 32];
        r[..8].copy_from_slice(&n.to_le_bytes());
        r
    }
    /// An open round whose close is pinned at `offset` seconds, for testing
    /// the rules after the close is fixed. (How it's derived is tested below.)
    fn open_round(offset: u8) -> Slot {
        let mut s = Slot::new(slot_index(ROUND), 255);
        open_t(&mut s, ROUND, start() - 30).unwrap();
        s.seeded = 1;
        s.offset_s = offset;
        s
    }
    fn err<T: std::fmt::Debug>(r: Result<T>, e: BlindsideError) {
        assert_eq!(r.unwrap_err(), e.into());
    }

    // ---------- clock ----------

    #[test]
    fn schedule_matches_the_web_clock() {
        // web/lib/schedule.ts: round = floor(unix_ms / 90_000)
        let unix_ms: i64 = 1_795_423_939_123;
        let round = (unix_ms / 90_000) as u64;
        assert!(round_start(round) * 1000 <= unix_ms);
        assert!(unix_ms < round_start(round + 1) * 1000);
        assert_eq!(slot_index(round), (round % 8) as u8);
    }

    #[test]
    fn close_offset_always_in_window_and_covers_it() {
        let mut seen = [false; 41];
        for n in 0..10_000u64 {
            let o = close_offset(&rnd(n.wrapping_mul(0x9E37_79B9_7F4A_7C15))) as i64;
            assert!((CLOSE_MIN_S..=CLOSE_MAX_S).contains(&o));
            seen[(o - CLOSE_MIN_S) as usize] = true;
        }
        assert!(seen.iter().all(|s| *s), "every second 10..=50 reachable");
        assert_eq!(close_offset(&[0xff; 32]) as i64 <= CLOSE_MAX_S, true);
    }

    #[test]
    fn reads_the_feed_layout() {
        let mut d = vec![0u8; 134];
        d[73..81].copy_from_slice(&7_246_249_737i64.to_le_bytes());
        d[93..101].copy_from_slice(&1_795_423_939i64.to_le_bytes());
        assert_eq!(read_feed(&d), Some((7_246_249_737, 1_795_423_939)));
        assert_eq!(read_feed(&d[..100]), None);
    }

    // ---------- opening ----------

    #[test]
    fn open_checks_slot_and_window() {
        let mut s = Slot::new(1, 255);
        err(open_t(&mut s, ROUND, start() - 10), BlindsideError::WrongSlot);
        let mut s = Slot::new(0, 255);
        err(open_t(&mut s, ROUND, start() - 61), BlindsideError::OpenWindowClosed);
        err(open_t(&mut s, ROUND, start() + 5), BlindsideError::OpenWindowClosed);
        open_t(&mut s, ROUND, start() + 4).unwrap();
        assert_eq!(s.status, STATUS_OPEN);
    }

    #[test]
    fn slot_reused_only_after_everyone_is_paid() {
        let mut s = open_round(20);
        pc(&mut s, ROUND, start() + 1, key(1), UP, MIN_STAKE).unwrap();
        let next = ROUND + SLOTS;
        let next_start = round_start(next);
        // still running
        err(open_t(&mut s, next, next_start - 10), BlindsideError::SlotBusy);
        reveal(&mut s, start() + REVEAL_S).unwrap();
        // revealed but not paid
        err(open_t(&mut s, next, next_start - 10), BlindsideError::SlotBusy);
        claim(&mut s, key(1)).unwrap();
        open_t(&mut s, next, next_start - 10).unwrap();
        assert_eq!(s.round, next);
        assert_eq!(s.call_count, 0);
        assert_eq!(s.seeded, 0);
        assert_eq!(s.secret, SECRET);
        // can't go backwards
        let mut s2 = s.clone();
        reveal(&mut s2, next_start + REVEAL_S).unwrap();
        err(open_t(&mut s2, ROUND, start() - 10), BlindsideError::RoundNotNewer);
    }

    // ---------- the hidden close ----------

    #[test]
    fn close_is_fixed_at_ten_seconds_from_the_secret_and_early_calls() {
        let mut s = Slot::new(0, 255);
        open_t(&mut s, ROUND, start() - 30).unwrap();
        place_call(&mut s, ROUND, start() + 2, key(1), UP, MIN_STAKE, [1; 32]).unwrap();
        place_call(&mut s, ROUND, start() + 5, key(2), DOWN, MIN_STAKE, [2; 32]).unwrap();
        tick(&mut s, start() + 9, 100, start() + 9);
        assert_eq!(s.seeded, 0, "not before 10 s");
        tick(&mut s, start() + 10, 100, start() + 10);
        assert_eq!(s.seeded, 1);
        assert_eq!(s.seed_calls, 2);
        assert!((CLOSE_MIN_S..=CLOSE_MAX_S).contains(&(s.offset_s as i64)));
        // Anyone can check it after the reveal.
        assert_eq!(recompute_offset(&s.secret, &s.calls[..2]), s.offset_s);
        // Later calls don't move it.
        let fixed = s.offset_s;
        place_call(&mut s, ROUND, start() + 11, key(3), UP, MIN_STAKE, [3; 32]).unwrap();
        tick(&mut s, start() + 11, 100, start() + 11);
        assert_eq!(s.offset_s, fixed);
        assert_eq!(s.seed_calls, 2);
    }

    #[test]
    fn with_no_calls_the_close_comes_from_the_secret_alone() {
        let mut s = Slot::new(0, 255);
        open_t(&mut s, ROUND, start() - 30).unwrap();
        tick(&mut s, start() + 10, 100, start() + 10);
        assert_eq!(s.offset_s, recompute_offset(&SECRET, &[]));
    }

    #[test]
    fn the_keeper_cannot_predict_the_close_once_a_player_has_called() {
        // Same secret, one early call, different player nonces: the close moves
        // almost every time, so knowing the secret alone isn't enough.
        let mut moved = 0;
        for n in 0..200u8 {
            let call = |nonce: [u8; 32]| CallEntry { player: key(1), nonce, amount: MIN_STAKE, side: UP, ..Default::default() };
            let mut a = [n; 32];
            a[31] = 1;
            let mut b = [n; 32];
            b[31] = 2;
            if recompute_offset(&SECRET, &[call(a)]) != recompute_offset(&SECRET, &[call(b)]) {
                moved += 1;
            }
        }
        assert!(moved > 180, "moved {moved}/200");
    }

    #[test]
    fn players_cannot_predict_the_close_without_the_secret() {
        let call = CallEntry { player: key(1), nonce: [5; 32], amount: MIN_STAKE, side: UP, ..Default::default() };
        let mut moved = 0;
        for n in 0..200u8 {
            if recompute_offset(&[n; 32], &[call]) != recompute_offset(&[n.wrapping_add(1); 32], &[call]) {
                moved += 1;
            }
        }
        assert!(moved > 180, "moved {moved}/200");
    }

    #[test]
    fn a_late_first_tick_still_fixes_the_close_then_voids_if_it_passed() {
        let mut s = Slot::new(0, 255);
        open_t(&mut s, ROUND, start() - 30).unwrap();
        // Keeper was down until 60 s: close is fixed, and since it has passed
        // by more than the allowed gap, the round voids instead of settling late.
        tick(&mut s, start() + 60, 100, start() + 60);
        assert_eq!(s.seeded, 1);
        assert_eq!((s.outcome, s.void_reason), (VOID, VOID_MISSED_TICK));
    }

    // ---------- tick ----------

    #[test]
    fn strike_at_close_and_settle_thirty_seconds_later() {
        let mut s = open_round(23);
        let p = 7_000_000_000;
        tick(&mut s, start() + 22, p, start() + 22);
        assert_eq!(s.strike_ts, 0, "not before the close");
        tick(&mut s, start() + 23, p, start() + 23);
        assert_eq!((s.strike, s.strike_ts), (p, start() + 23));
        tick(&mut s, start() + 30, p + 5, start() + 30);
        assert_eq!(s.strike, p, "strike is fixed once set");
        tick(&mut s, start() + 52, p + 9, start() + 52);
        assert_eq!(s.settle_ts, 0);
        tick(&mut s, start() + 53, p + 10, start() + 53);
        assert_eq!((s.settle, s.settle_ts), (p + 10, start() + 53));
        assert_eq!(s.outcome, PENDING);
    }

    #[test]
    fn stale_or_missed_prices_void() {
        let mut s = open_round(20);
        tick(&mut s, start() + 20, 100, start() + 16); // 4 s old
        assert_eq!((s.outcome, s.void_reason), (VOID, VOID_STALE_PRICE));

        let mut s = open_round(20);
        tick(&mut s, start() + 23, 100, start() + 23); // keeper 3 s late
        assert_eq!((s.outcome, s.void_reason), (VOID, VOID_MISSED_TICK));

        let mut s = open_round(20);
        tick(&mut s, start() + 21, 100, start() + 21);
        tick(&mut s, start() + 54, 100, start() + 54); // settle 3 s late
        assert_eq!((s.outcome, s.void_reason), (VOID, VOID_MISSED_TICK));

        let mut s = open_round(20);
        tick(&mut s, start() + 20, 0, start() + 20); // no price
        assert_eq!((s.outcome, s.void_reason), (VOID, VOID_STALE_PRICE));
    }

    #[test]
    fn tick_never_changes_a_finished_round() {
        let mut s = open_round(20);
        tick(&mut s, start() + 20, 100, start() + 20);
        tick(&mut s, start() + 50, 101, start() + 50);
        reveal(&mut s, start() + REVEAL_S).unwrap();
        let before = s.clone();
        tick(&mut s, start() + 85, 999, start() + 85);
        assert_eq!(before.settle, s.settle);
        assert_eq!(before.status, s.status);
    }

    // ---------- calls ----------

    #[test]
    fn calls_open_from_start_until_fifty_seconds() {
        let mut s = open_round(30);
        err(pc(&mut s, ROUND, start() - 1, key(1), UP, MIN_STAKE), BlindsideError::CallsClosed);
        err(pc(&mut s, ROUND, start() + 50, key(1), UP, MIN_STAKE), BlindsideError::CallsClosed);
        pc(&mut s, ROUND, start(), key(1), UP, MIN_STAKE).unwrap();
        pc(&mut s, ROUND, start() + 49, key(2), DOWN, MIN_STAKE).unwrap();
        err(pc(&mut s, ROUND + 1, start() + 1, key(3), UP, MIN_STAKE), BlindsideError::RoundNotOpen);
    }

    #[test]
    fn call_validation() {
        let mut s = open_round(30);
        let t = start() + 1;
        err(pc(&mut s, ROUND, t, key(1), 0, MIN_STAKE), BlindsideError::BadSide);
        err(pc(&mut s, ROUND, t, key(1), UP, MIN_STAKE - 1), BlindsideError::BadStake);
        err(pc(&mut s, ROUND, t, key(1), UP, MAX_STAKE + 1), BlindsideError::BadStake);
        pc(&mut s, ROUND, t, key(1), UP, MAX_STAKE).unwrap();
        err(pc(&mut s, ROUND, t, key(1), DOWN, MIN_STAKE), BlindsideError::AlreadyCalled);
        for i in 2..=MAX_CALLS as u8 {
            pc(&mut s, ROUND, t, key(i), DOWN, MIN_STAKE).unwrap();
        }
        err(pc(&mut s, ROUND, t, key(200), UP, MIN_STAKE), BlindsideError::RoundFull);
    }

    #[test]
    fn a_call_counts_only_if_it_lands_before_the_strike_tick() {
        let mut s = open_round(20);
        pc(&mut s, ROUND, start() + 20, key(1), UP, 5 * ONE_USDC).unwrap(); // same second, before tick
        tick(&mut s, start() + 20, 100, start() + 20);
        pc(&mut s, ROUND, start() + 20, key(2), UP, 7 * ONE_USDC).unwrap(); // after tick
        assert_eq!(s.calls[0].late, 0);
        assert_eq!(s.calls[1].late, 1);
        assert_eq!(s.up_pool, 5 * ONE_USDC, "late stake not in the pool");
    }

    #[test]
    fn accepting_calls_does_not_depend_on_the_close() {
        // Same inputs, different hidden closes: identical success.
        for offset in [10u8, 25, 50] {
            let mut s = open_round(offset);
            for t in 0..MAX_CALLS as i64 {
                tick(&mut s, start() + t, 100, start() + t);
                let r = pc(&mut s, ROUND, start() + t, key(t as u8 + 1), UP, MIN_STAKE);
                assert!(r.is_ok(), "offset {offset} t {t}");
            }
        }
    }

    // ---------- reveal ----------

    #[test]
    fn reveal_is_rejected_before_eighty_seconds() {
        let mut s = open_round(20);
        err(reveal(&mut s, start() + REVEAL_S - 1), BlindsideError::RevealTooEarly);
        assert_eq!(s.status, STATUS_OPEN);
        reveal(&mut s, start() + REVEAL_S).unwrap();
        assert_eq!(s.status, STATUS_REVEALED);
        err(reveal(&mut s, start() + REVEAL_S), BlindsideError::RoundNotOpen);
    }

    fn played(offset: u8, strike: i64, settle: i64) -> Slot {
        let mut s = open_round(offset);
        pc(&mut s, ROUND, start() + 1, key(1), UP, 10 * ONE_USDC).unwrap();
        pc(&mut s, ROUND, start() + 2, key(2), UP, 5 * ONE_USDC).unwrap();
        pc(&mut s, ROUND, start() + 3, key(3), DOWN, 9 * ONE_USDC).unwrap();
        let close = start() + offset as i64;
        tick(&mut s, close, strike, close);
        pc(&mut s, ROUND, close, key(4), DOWN, 20 * ONE_USDC).unwrap(); // late
        tick(&mut s, close + HOLD_S, settle, close + HOLD_S);
        reveal(&mut s, start() + REVEAL_S).unwrap();
        s
    }

    #[test]
    fn up_wins_split_pro_rata() {
        let s = played(15, 100, 101);
        assert_eq!(s.outcome, UP);
        let pay = |i: usize| payout(&s, &s.calls[i]);
        // up pool 15, down pool 9 (late 20 excluded)
        assert_eq!(pay(0), 10 * ONE_USDC + 6 * ONE_USDC); // 10 + 10*9/15
        assert_eq!(pay(1), 5 * ONE_USDC + 3 * ONE_USDC); // 5 + 5*9/15
        assert_eq!(pay(2), 0);
        assert_eq!(pay(3), 20 * ONE_USDC, "late call refunded in full");
    }

    #[test]
    fn down_wins() {
        let s = played(40, 100, 99);
        assert_eq!(s.outcome, DOWN);
        assert_eq!(payout(&s, &s.calls[2]), 9 * ONE_USDC + 15 * ONE_USDC);
        assert_eq!(payout(&s, &s.calls[0]), 0);
    }

    #[test]
    fn ties_and_missing_prices_refund_everyone() {
        let s = played(15, 100, 100);
        assert_eq!((s.outcome, s.void_reason), (VOID, VOID_TIE));
        for c in &s.calls[..4] {
            assert_eq!(payout(&s, c), c.amount);
        }

        let mut s = open_round(20);
        pc(&mut s, ROUND, start() + 1, key(1), UP, MIN_STAKE).unwrap();
        reveal(&mut s, start() + REVEAL_S).unwrap(); // keeper never ticked
        assert_eq!((s.outcome, s.void_reason), (VOID, VOID_NO_PRICE));
    }

    #[test]
    fn one_sided_round_refunds() {
        let mut s = open_round(20);
        pc(&mut s, ROUND, start() + 1, key(1), UP, 3 * ONE_USDC).unwrap();
        tick(&mut s, start() + 20, 100, start() + 20);
        tick(&mut s, start() + 50, 105, start() + 50);
        reveal(&mut s, start() + REVEAL_S).unwrap();
        assert_eq!((s.outcome, s.void_reason), (VOID, VOID_ONE_SIDED));
        assert_eq!(payout(&s, &s.calls[0]), 3 * ONE_USDC);
    }

    #[test]
    fn payouts_never_exceed_what_was_staked() {
        // Awkward numbers that don't divide evenly.
        let mut s = open_round(20);
        let stakes = [1_000_001u64, 2_333_333, 7_777_777, 1_000_000, 3_141_592, 25_000_000];
        for (i, a) in stakes.iter().enumerate() {
            let side = if i % 3 == 0 { DOWN } else { UP };
            pc(&mut s, ROUND, start() + 1, key(i as u8 + 1), side, *a).unwrap();
        }
        tick(&mut s, start() + 20, 100, start() + 20);
        tick(&mut s, start() + 50, 103, start() + 50);
        reveal(&mut s, start() + REVEAL_S).unwrap();
        let total_in: u64 = stakes.iter().sum();
        let total_out: u64 = s.calls[..stakes.len()].iter().map(|c| payout(&s, c)).sum();
        assert!(total_out <= total_in);
        assert!(total_in - total_out < stakes.len() as u64, "dust is under 1 unit per call");
    }

    // ---------- claims ----------

    #[test]
    fn claims_pay_once_and_only_after_reveal() {
        let mut s = open_round(20);
        pc(&mut s, ROUND, start() + 1, key(1), UP, 4 * ONE_USDC).unwrap();
        pc(&mut s, ROUND, start() + 1, key(2), DOWN, 4 * ONE_USDC).unwrap();
        err(claim(&mut s, key(1)), BlindsideError::NotRevealed);
        tick(&mut s, start() + 20, 100, start() + 20);
        tick(&mut s, start() + 50, 90, start() + 50);
        reveal(&mut s, start() + REVEAL_S).unwrap();
        assert_eq!(claim(&mut s, key(2)).unwrap(), 8 * ONE_USDC);
        err(claim(&mut s, key(2)), BlindsideError::AlreadyClaimed);
        assert_eq!(claim(&mut s, key(1)).unwrap(), 0);
        err(claim(&mut s, key(9)), BlindsideError::NoCall);
        assert_eq!(s.claimed_count, 2);
    }
}
