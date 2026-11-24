# Blindside program

Fast SOL up/down rounds with a **hidden close**, on MagicBlock's Private Ephemeral Rollup (TEE).

Every 90 s (wall clock, `round = floor(unix / 90)`):

| Time | What happens |
| --- | --- |
| 0–50 s | Calls are accepted, each with a random nonce from the player's device. |
| open | `open_round` (keeper key) stores the keeper's secret and requests MagicBlock VRF; the callback stores the randomness if it arrives before 10 s (~2 s in practice). |
| 10 s | The **close** is fixed: a secret second in 10–50 s, from the keeper's secret, the nonce of every call so far, and the VRF value. |
| close | The next keeper tick records the SOL price as the starting price. Calls after it are refunded. |
| close + 30 s | The result price is recorded. |
| 80 s | `reveal`: the round account becomes public — close time, prices, pools, calls, the secret, the nonces and the VRF value. Anyone can recompute the close (`recomputeOffset` in `packages/client`). |
| after | `claim` pays each call into the player's balance. |

## Where things live

- **Base layer:** `Config`, the test-USDC mint and vault, `faucet`, `join`, `deposit`, `withdraw`.
- **Private rollup (TEE):** 8 reusable round `Slot`s (`round % 8`) whose permission has **no readers** until the reveal, and each `Player` balance, readable only by that player.
- **Rules:** plain functions in `programs/blindside/src/logic.rs`, unit-tested there.

Opening a round needs the keeper key, because it seeds the secret. The keeper key is a separate hot key assigned by the admin with `set_keeper`; it can only open rounds, so the admin (who is also the upgrade authority) never sits on a server. Ticking, revealing and paying out are permissionless and time-gated, so nobody can steer a running round. If the keeper misses a tick, the round is voided and refunded rather than settled on a late price.

## Fairness guarantees, and where they're enforced

| Guarantee | Enforced by |
| --- | --- |
| Close is uniform in 10–50 s and nobody can predict it | `logic::tick` fixes it at 10 s from H(secret ‖ player ‖ nonce … ‖ "vrf" ‖ vrf); the keeper never sees nonces or VRF, players never see the secret, the oracle sees neither |
| VRF can't be used to steer a fixed close | `logic::set_randomness` ignores answers after 10 s, after the close is fixed, or duplicates |
| The close can be checked after the fact | `logic::recompute_offset` / `recomputeOffset` reproduce it from public data after the reveal |
| Nobody can read the close, prices or pools mid-round | Slot permission with no members until `reveal` |
| Reveal can't happen early | `logic::reveal` rejects before 80 s |
| A late call never counts and is always refunded | `place_call` marks it `late` if the strike is already set |
| Accepting a call doesn't depend on the close (no timing leak) | Calls accepted identically across the public 0–50 s window; `tick` never fails |
| Stale or late prices don't settle a round | `tick` voids on prices > 3 s old or ticks > 2 s late |
| Ties, one-sided rounds and missing prices refund everyone | `logic::reveal` / `logic::payout` |
| Payouts never exceed stakes | Pro-rata integer division, rounding down |

## MagicBlock VRF inside the TEE

The first version's VRF rounds all voided, and it looked like the oracle didn't serve the TEE. It does. The callback was failing: in SDK 0.18 the `#[vrf_callback]` macro checks the VRF signer with `address = scoped_vrf_identity_const(&crate::ID)`, which runs at **runtime** with software curve maths (~270k CU) against the oracle's 300k budget. Declaring the field yourself with a compile-time constant fixes it:

```rust
const VRF_IDENTITY: Pubkey = Pubkey::new_from_array(scoped_vrf_identity_const(&crate::ID).0);

#[vrf_callback]
#[derive(Accounts)]
pub struct ConsumeRandomness<'info> {
    #[account(address = VRF_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,
    // ...
}
```

`programs/vrf_probe` is a small program that reproduces both the failure and the fix (public and private targets, answered in ~2 s). Also: VRF requests sit in a public queue, so the request seed must not contain anything secret.

**Known limit:** if VRF is late (after 10 s), that round closes from the secret and nonces alone; then, if only the keeper's own wallets had called early, the keeper could work out the close.

## Commands

```bash
pnpm test:unit        # 29 Rust tests for the round rules (no network)
pnpm typecheck        # scripts + tests
anchor build          # on macOS with Xcode 27 SDK: SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk anchor build
anchor deploy --provider.cluster devnet
pnpm setup:devnet     # once: config, mint, vault, keeper role (+ key), 8 private slots
pnpm keeper           # runs the round clock
pnpm test:devnet      # one real round end to end (~3 min): privacy, early reveal, payouts, withdraw
pnpm probe            # read-only: can the TEE see the price feed?
```
