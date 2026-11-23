# Architecture

```
                        ┌──────────────────────────── Solana devnet (base layer) ─────────────────────────────┐
                        │  Config · test-USDC mint + vault · faucet · join / deposit / withdraw                │
                        │  Slot and Player accounts are created here, then delegated ↓                         │
                        └───────────────────────────────────────┬──────────────────────────────────────────────┘
                                                                │ delegate / commit+undelegate
┌──────────── web (Next.js) ───────────┐        ┌───────────── MagicBlock Private Ephemeral Rollup (TEE) ──────────────┐
│ wallet adapter                        │ calls  │  Slot × 8 (round % 8)   permission: no readers until reveal          │
│ TEE login (sign once)                 ├───────►│  Player balances        permission: only the owner                   │
│ Play · reveal · history               │        │  VRF callback → hidden close   Pyth Lazer SOL/USD feed (live)        │
└──────────────┬────────────────────────┘        └───────────────────────────────▲───────────────────────────────────────┘
               │ imports                                                           │ open_round · tick (400 ms) · reveal · claim
┌──────────────▼────────────────────────┐        ┌─────────────────────────────────┴───────┐
│ packages/client                        │◄───────┤ keeper (long-running)                    │
│ addresses · round clock · instructions │ imports│ permissionless, time-gated by the program│
└────────────────────────────────────────┘        └──────────────────────────────────────────┘
```

## Who can read what

| Account | While the round runs | After the reveal (80 s) |
| --- | --- | --- |
| Round slot (close, prices, pools, calls) | nobody — not players, not the keeper, not the admin | everyone |
| Player balance | only that player | only that player |
| Transactions touching a slot (incl. the VRF callback) | message and logs hidden from non-members | public via the slot |

## Why the close can't leak

- Calls are accepted the same way all through the public 0–50 s window. Whether one landed after the close is stored privately and only matters at the reveal.
- `tick` runs at a steady rate and always succeeds, so the transaction that records the starting price looks like every other tick.
- Nobody can reveal early: `reveal` is rejected before 80 s.

## Known limits

- Close precision is one second: the price feed's publish time and the rollup clock are whole seconds.
- TEE secrets can be extracted with physical access to the machine (TEE.fail, Oct 2025). Stakes are small and a close is only worth one round.
- Slots are reused every 12 minutes; round history beyond that is kept by the keeper's archive.
