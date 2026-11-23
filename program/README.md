# Blindside program

Fast SOL up/down rounds with a **hidden close**, on MagicBlock's Private Ephemeral Rollup (TEE).

Every 90 s (wall clock, `round = floor(unix / 90)`):

| Time | What happens |
| --- | --- |
| 0–50 s | Calls are accepted. MagicBlock VRF has picked a secret second in 10–50 s: the **close**. |
| close | The next keeper tick records the SOL price as the starting price. Calls after it are refunded. |
| close + 30 s | The result price is recorded. |
| 80 s | `reveal`: the round account becomes public — close time, prices, pools, calls. |
| after | `claim` pays each call into the player's balance. |

## Where things live

- **Base layer:** `Config`, the test-USDC mint and vault, `faucet`, `join`, `deposit`, `withdraw`.
- **Private rollup (TEE):** 8 reusable round `Slot`s (`round % 8`) whose permission has **no readers** until the reveal, and each `Player` balance, readable only by that player.
- **Rules:** plain functions in `programs/blindside/src/logic.rs`, unit-tested there.

Opening, ticking, revealing and paying out are permissionless and time-gated, so nobody (including us) can steer a running round. If the keeper misses a tick, the round is voided and refunded rather than settled on a late price.

## Fairness guarantees, and where they're enforced

| Guarantee | Enforced by |
| --- | --- |
| Close is random, in 10–50 s, fixed before calls open | `open_round` requests VRF; `set_randomness` ignores late/duplicate callbacks |
| Nobody can read the close, prices or pools mid-round | Slot permission with no members until `reveal` |
| Reveal can't happen early | `logic::reveal` rejects before 80 s |
| A late call never counts and is always refunded | `place_call` marks it `late` if the strike is already set |
| Accepting a call doesn't depend on the close (no timing leak) | Calls accepted identically across the public 0–50 s window; `tick` never fails |
| Stale or late prices don't settle a round | `tick` voids on prices > 3 s old or ticks > 2 s late |
| Ties, one-sided rounds and missing prices refund everyone | `logic::reveal` / `logic::payout` |
| Payouts never exceed stakes | Pro-rata integer division, rounding down |

## Commands

```bash
pnpm test:unit        # 22 Rust tests for the round rules (no network)
pnpm typecheck        # scripts + tests
anchor build          # on macOS with Xcode 27 SDK: SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk anchor build
anchor deploy --provider.cluster devnet
pnpm setup:devnet     # once: config, mint, vault, 8 private slots
pnpm keeper           # runs the round clock
pnpm test:devnet      # one real round end to end (~3 min): privacy, early reveal, payouts, withdraw
pnpm probe            # read-only: can the TEE see the feed and VRF?
```
