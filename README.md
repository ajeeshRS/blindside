# Blindside

**Predict SOL. Beat the bots.**

Betting closes at a secret moment. Even we don't know when.

**Live:** https://blindside-beta.vercel.app · **Program (devnet):** [`G3KohYDjCbTwQ6nfsR9MWBJjBkwmM1xGMiAc4J4uGJMQ`](https://explorer.solana.com/address/G3KohYDjCbTwQ6nfsR9MWBJjBkwmM1xGMiAc4J4uGJMQ?cluster=devnet)

Blindside is a 90-second game: will SOL be higher or lower? In ordinary fast markets, whoever sees the price first can bet in the final second, when the result is almost certain, and that's mostly bots. In Blindside the close is a secret second kept inside MagicBlock's **Private Ephemeral Rollup** (an Intel TDX TEE) until the round is revealed. There is no last second to snipe.

Built for MagicBlock Solana Blitz v10, *Entertainment Finance*.

## Try it in 30 seconds

1. Open **[/play](https://blindside-beta.vercel.app/play)** and press **Play instantly**. It makes a devnet test wallet in your browser: no install, no pop-ups. (Phantom, Solflare and Backpack work too. Your wallet approves once, then a session key signs your calls, so there's no pop-up per call.)
2. Press **Start playing**. One step gets you devnet SOL for fees, 100 test USDC, a game balance and a sign-in to the private rollup.
3. Call **Higher** or **Lower** in the first seconds of a round. At 80 s the chart reveals where the secret close landed, the starting price, the 30 seconds that decided it, and what you won.
4. **Check the enclave.** The market strip says **TDX attested**: your browser verified the rollup is a genuine Intel TDX enclave (a hardware quote checked against Intel's certificates, with a fresh random challenge).
5. **Try to peek.** In the Proof panel, press **Try to peek**. Your browser makes the request a bot would make for the running round and gets `null · sealed`: the account doesn't exist to outsiders. The round before it, already revealed, comes back `readable` with its close, the secret, every call and the VRF value.

Rounds are peer-to-peer: winners are paid from the other side's stakes. Playing alone, you'll be refunded. To see a win or a loss, open a second browser (or a private window) and take the other side in the same round.

## How a round works

| Time | What happens |
| --- | --- |
| 0–50 s | Call **Higher** or **Lower**. Each call carries a random nonce from the player's device. |
| 10 s | The **close** is fixed: a secret second in 10–50 s, from the keeper's secret, every early call's nonce and **MagicBlock VRF** randomness. |
| close | The live SOL price becomes the starting price. Calls that landed after it are refunded, never counted. |
| close + 30 s | The result price is recorded. |
| 80 s | **Reveal**: the close, prices, pools, every call, the secret, the nonces and the VRF value all become public. |
| after | Winners split the losing side pro-rata, paid automatically. |

## A sealed close, for any fast market

The game is the first app built on a pattern any fast market can use: **close at a moment nobody can know, then let anyone check it.**

1. **Seal** a secret inside MagicBlock's Private Ephemeral Rollup when the round opens.
2. **Mix in** a random nonce from every early player.
3. **Mix in** MagicBlock VRF, requested from inside the rollup.
4. **Hide** the round with a permission that has no readers until the reveal.
5. **Reveal** everything and let anyone recompute the close (`recomputeOffset` in [`packages/client`](packages/client/src/verify.ts)).

The same pattern fits prediction markets, short-term options, sealed-bid auctions and fair launches: anywhere bots win by acting last.

## Why it's fair

- **Nobody can read a running round:** not players, not bots, not the keeper, not us. The devnet test checks this from all three sides.
- **Nobody can predict the close.** The keeper never sees the nonces or the VRF value, players never see the secret, and the VRF oracle sees neither. After the reveal, the History page's **Verify** button recomputes it in your browser.
- **Accepting a call never depends on the close**, so timing your calls tells you nothing. Late calls are accepted and refunded at the reveal.
- **Nobody can reveal early.** The program rejects a reveal before 80 s.
- **Bad data doesn't settle.** A stale price, a late tick, a tie or a one-sided round voids and refunds everyone. Payouts can never exceed stakes.
- **The keeper can only stop, not cheat.** It opens rounds and keeps the clock; ticking, revealing and paying out are open to anyone. It can't move funds, read a running round or change the rules.

Every guarantee and the code that enforces it: [program/README.md](program/README.md). How the pieces fit: [docs/architecture.md](docs/architecture.md).

## What's real

Everything: the live Pyth Lazer SOL/USD feed on MagicBlock, real devnet transactions, a real TEE, and a keeper running 24/7. Funds are test USDC from an in-app faucet and have no value. Nothing is simulated.

## Built with MagicBlock

- **Private Ephemeral Rollup (TEE):** round slots and player balances are delegated to the TEE validator; permissions hide them (and the transactions touching them) until the reveal.
- **Permission program:** no readers while a round runs, public at the reveal, owner-only for balances.
- **Pyth Lazer price feed** on MagicBlock's rollup, read on-chain every tick.
- **Delegation and commit/undelegate** for moving balances between Solana and the rollup.
- **TEE attestation** checked in the browser on every visit, using the SDK's `verifyTeeRpcIntegrity`.
- **Session keys on the rollup:** one wallet approval, then every call is one tap. Wallet extensions refuse rollup transactions (they carry the rollup's blockhash; Solflare calls it a mainnet "network mismatch" even on devnet). So the wallet authorises a temporary key once in an ordinary devnet transaction (`set_session`), and that key signs `place_call_session` and `leave_session`. It can't withdraw.
- **MagicBlock VRF**, requested from inside the private rollup at each round's open and answered in about 2 s. A finding worth sharing: in SDK 0.18, `#[vrf_callback]` derives the VRF signer's address at runtime, which costs ~270k of the oracle's 300k compute budget, so callbacks fail and requests look unanswered. Declaring `vrf_program_identity` with a compile-time address fixes it ([`programs/vrf_probe`](program/programs/vrf_probe/src/lib.rs) reproduces both).

## Repository

```
program/          Anchor program (Rust) + devnet end-to-end test
packages/client/  shared TypeScript client: addresses, round clock, instructions, close verification
keeper/           runs the round clock (hosted on Railway); one-time devnet setup
web/              Next.js app (hosted on Vercel)
docs/             architecture and submission notes
```

## Tests

- **31 Rust unit tests** for the round rules: close range and verification (with and without VRF), late or duplicate VRF, late calls, timing-leak resistance, early reveal, payouts, voids, double claims, session-key expiry. `pnpm test:unit`
- **Devnet end-to-end test, 11/11:** one real round on the private rollup with two players, one of them playing through a session key. Checks nobody (outsider, admin, player) can read the running round, transactions are hidden, a player and the admin can't open rounds, a stranger's key can't call or leave for a player, early reveal fails, the close recomputes from public data, payouts conserve funds, and withdrawal works. `pnpm test:devnet`

## Run it yourself

```bash
pnpm install
pnpm test:unit          # 31 Rust tests (no network)
pnpm typecheck
pnpm dev                # web app on http://localhost:3000 (gas drip needs SPONSOR_SECRET_KEY)

# devnet (program already deployed)
pnpm setup:devnet       # once: config, test USDC, keeper role, 8 private round slots
pnpm keeper             # keep rounds running (KEEPER_SECRET_KEY or ~/.config/blindside/keeper.json)
pnpm test:devnet        # one real round end to end (~3 min)
```

Building the program: `pnpm build:program` (Anchor 0.32.1, MagicBlock SDK 0.18.0).

## Known limits

- The close has one-second precision (the feed and the rollup clock are whole seconds).
- If MagicBlock VRF is late (after 10 s), that round closes from the secret and nonces alone; then, if only the keeper's own wallets had called early, the keeper could work out the close.
- History beyond ~12 minutes is kept in your browser (round slots are reused on chain).
- TEE secrets can be extracted with physical access to the machine (TEE.fail, Oct 2025). Stakes are small and a close is worth one round.
