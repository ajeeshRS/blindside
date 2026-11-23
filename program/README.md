# Blindside program

Fast SOL up/down rounds with a **hidden close**, on MagicBlock's Private Ephemeral Rollup (TEE).

Every 90 s (wall clock, `round = floor(unix / 90)`):

| Time | What happens |
| --- | --- |
| 0–50 s | Calls are accepted, each with a random nonce from the player's device. |
| 10 s | The **close** is fixed: a secret second in 10–50 s, from the keeper's secret mixed with the nonce of every call so far. |
| close | The next keeper tick records the SOL price as the starting price. Calls after it are refunded. |
| close + 30 s | The result price is recorded. |
| 80 s | `reveal`: the round account becomes public — close time, prices, pools, calls, the secret and nonces. Anyone can recompute the close (`recomputeOffset` in `packages/client`). |
| after | `claim` pays each call into the player's balance. |

## Where things live

- **Base layer:** `Config`, the test-USDC mint and vault, `faucet`, `join`, `deposit`, `withdraw`.
- **Private rollup (TEE):** 8 reusable round `Slot`s (`round % 8`) whose permission has **no readers** until the reveal, and each `Player` balance, readable only by that player.
- **Rules:** plain functions in `programs/blindside/src/logic.rs`, unit-tested there.

Opening a round needs the keeper key, because it seeds the secret. Ticking, revealing and paying out are permissionless and time-gated, so nobody can steer a running round. If the keeper misses a tick, the round is voided and refunded rather than settled on a late price.

## Fairness guarantees, and where they're enforced

| Guarantee | Enforced by |
| --- | --- |
| Close is uniform in 10–50 s and nobody can predict it | `logic::tick` fixes it at 10 s from H(secret ‖ player ‖ nonce …); the keeper never sees nonces, players never see the secret |
| The close can be checked after the fact | `logic::recompute_offset` / `recomputeOffset` reproduce it from public data after the reveal |
| Nobody can read the close, prices or pools mid-round | Slot permission with no members until `reveal` |
| Reveal can't happen early | `logic::reveal` rejects before 80 s |
| A late call never counts and is always refunded | `place_call` marks it `late` if the strike is already set |
| Accepting a call doesn't depend on the close (no timing leak) | Calls accepted identically across the public 0–50 s window; `tick` never fails |
| Stale or late prices don't settle a round | `tick` voids on prices > 3 s old or ticks > 2 s late |
| Ties, one-sided rounds and missing prices refund everyone | `logic::reveal` / `logic::payout` |
| Payouts never exceed stakes | Pro-rata integer division, rounding down |

## Why not MagicBlock VRF?

The first version requested VRF from inside the private rollup. On devnet the request lands in the ephemeral queue but no oracle fulfils it on the TEE endpoint (see the commit history), so rounds voided. The secret-plus-nonces close needs no oracle and is verifiable after every round.

**Known limit:** if nobody but the keeper's own wallets calls in the first 10 seconds, the keeper could work out the close. Any other early caller locks it out.

## Commands

```bash
pnpm test:unit        # 25 Rust tests for the round rules (no network)
pnpm typecheck        # scripts + tests
anchor build          # on macOS with Xcode 27 SDK: SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX26.sdk anchor build
anchor deploy --provider.cluster devnet
pnpm setup:devnet     # once: config, mint, vault, 8 private slots
pnpm keeper           # runs the round clock
pnpm test:devnet      # one real round end to end (~3 min): privacy, early reveal, payouts, withdraw
pnpm probe            # read-only: can the TEE see the price feed?
```
