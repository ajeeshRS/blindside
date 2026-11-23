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
│ Play · reveal · history               │        │  secret ⊕ nonces → hidden close  Pyth Lazer SOL/USD feed (live)      │
└──────────────┬────────────────────────┘        └───────────────────────────────▲───────────────────────────────────────┘
               │ imports                                                           │ open_round · tick (400 ms) · reveal · claim
┌──────────────▼────────────────────────┐        ┌─────────────────────────────────┴───────┐
│ packages/client                        │◄───────┤ keeper (long-running)                    │
│ addresses · round clock · instructions │ imports│ opens rounds (key); the rest is open to all│
└────────────────────────────────────────┘        └──────────────────────────────────────────┘
```

## Who can read what

| Account | While the round runs | After the reveal (80 s) |
| --- | --- | --- |
| Round slot (close, prices, pools, calls) | nobody — not players, not the keeper, not the admin | everyone |
| Player balance | only that player | only that player |
| Transactions touching a slot (incl. the keeper's secret and players' nonces) | message and logs hidden from non-members | secret and nonces public via the slot |

## Why the close can't leak

- Calls are accepted the same way all through the public 0–50 s window. Whether one landed after the close is stored privately and only matters at the reveal.
- `tick` runs at a steady rate and always succeeds, so the transaction that records the starting price looks like every other tick.
- Nobody can reveal early: `reveal` is rejected before 80 s.
- The close is fixed at 10 s from H(secret ‖ player ‖ nonce …). The keeper never sees players' nonces and players never see the secret. After the reveal anyone can recompute it.

## Known limits

- Close precision is one second: the price feed's publish time and the rollup clock are whole seconds.
- If only the keeper's own wallets call in the first 10 s, the keeper could work out the close. Any other early caller locks it out.
- MagicBlock VRF isn't fulfilled on the devnet TEE endpoint today, so it isn't used.
- TEE secrets can be extracted with physical access to the machine (TEE.fail, Oct 2025). Stakes are small and a close is only worth one round.
- Slots are reused every 12 minutes; round history beyond that is kept by the keeper's archive.
