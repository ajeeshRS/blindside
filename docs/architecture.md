# Architecture

```
                        ┌──────────────────────────── Solana devnet (base layer) ─────────────────────────────┐
                        │  Config · test-USDC mint + vault · faucet · join / deposit / withdraw · Session keys │
                        │  Slot and Player accounts are created here, then delegated ↓                         │
                        └───────────────────────────────────────┬──────────────────────────────────────────────┘
                                                                │ delegate / commit+undelegate
┌──────────── web (Next.js) ───────────┐        ┌───────────── MagicBlock Private Ephemeral Rollup (TEE) ──────────────┐
│ wallet adapter                        │ calls  │  Slot × 8 (round % 8)   permission: no readers until reveal          │
│ TEE login (sign once)                 ├───────►│  Player balances        permission: only the owner                   │
│ Play · reveal · history               │        │  secret ⊕ nonces ⊕ VRF → close   Pyth Lazer SOL/USD feed (live)      │
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
| Player's session record (base layer: key + expiry) | public; holds no round data | public |
| Transactions touching a slot (incl. the keeper's secret, players' nonces, the VRF callback) | message and logs hidden from non-members | secret, nonces and VRF value public via the slot |

## Why the close can't leak

- Calls are accepted the same way all through the public 0–50 s window. Whether one landed after the close is stored privately and only matters at the reveal.
- `tick` runs at a steady rate and always succeeds, so the transaction that records the starting price looks like every other tick.
- Nobody can reveal early: `reveal` is rejected before 80 s.
- The close is fixed at 10 s from H(secret ‖ player ‖ nonce … ‖ "vrf" ‖ vrf). The keeper never sees players' nonces or the VRF value, players never see the secret, and the VRF oracle sees neither. After the reveal anyone can recompute it.

## Wallets and session keys

The built-in test wallet signs rollup transactions directly. Wallet extensions can't: a rollup transaction carries the rollup's blockhash, which they can't place on any cluster (Solflare refuses it as a mainnet "network mismatch" even on devnet). So:

1. At setup, the wallet signs one ordinary devnet transaction that also runs `set_session(key, expires_at)`, creating a `Session` account on Solana (at most 7 days; the app uses 3).
2. The browser keeps that key and logs it in to the rollup. `place_call_session` and `leave_session` take it as the signer; the rollup reads the `Session` account from Solana and checks the key and expiry.
3. The key can only place calls and bring the balance back to the player's own account on Solana. `withdraw` still needs the wallet.

Base-layer transactions are signed with `chain: "solana:devnet"` passed to the wallet explicitly (wallet-adapter's `signTransaction` omits it).

## Live proof in the app

"Try to peek" on the Play page sends `getAccountInfo` for the running round's slot through an anonymous rollup login, exactly as a bot would, and shows the real answer (`value: null`), next to the same request for the previous, revealed round.

## Known limits

- Close precision is one second: the price feed's publish time and the rollup clock are whole seconds.
- If MagicBlock VRF is late (after 10 s) and only the keeper's own wallets called early, the keeper could work out that round's close.
- TEE secrets can be extracted with physical access to the machine (TEE.fail, Oct 2025). Stakes are small and a close is only worth one round.
- Slots are reused every 12 minutes; round history beyond that is kept by the keeper's archive.
