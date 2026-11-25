# Blitz v10 submission draft

Copy for the build.magicblock.app form. Deadline: Fri Nov 27, ~14:00 UTC (19:30 IST).

## Links

| What | Link |
| --- | --- |
| Live app | https://blindside-beta.vercel.app |
| Try it (no wallet needed) | https://blindside-beta.vercel.app/play → **Play instantly** |
| Proof feed + verify any round | https://blindside-beta.vercel.app/history |
| GitHub | https://github.com/ajeeshRS/blindside (make public, or invite `@jonasXchen`) |
| Program (devnet) | https://explorer.solana.com/address/G3KohYDjCbTwQ6nfsR9MWBJjBkwmM1xGMiAc4J4uGJMQ?cluster=devnet |
| A round slot, delegated to MagicBlock (owner = delegation program) | https://explorer.solana.com/address/5FPCsnip1kGYk8BYtCGpkWbMZsqPnc9oHHJDzkuY1FCx?cluster=devnet |
| Test USDC mint | https://explorer.solana.com/address/7mbyrcPwHLzEUxu5hyWnVtVaiANrEWyqYJAxMYFDQzF7?cluster=devnet |

## One-liner

Blindside: 90-second SOL up/down rounds where betting closes at a secret moment hidden in MagicBlock's Private Ephemeral Rollup, so bots can't win by betting last. The game is the first app on a "sealed close" any fast market can use.

## Description

In fast prediction markets, whoever sees the price first bets in the final second, when the result is nearly certain. That's mostly bots, and the average player loses to them.

Blindside removes the last second. Every 90 seconds a round opens on the live SOL price. Somewhere between 10 and 50 seconds it secretly closes: the price at that moment becomes the starting price, and the result is the price 30 seconds later. Calls that land after the close are refunded. Because the close is hidden inside MagicBlock's Private Ephemeral Rollup (an Intel TDX TEE), nobody can time it: not players, not bots, not us.

At 80 seconds the round is revealed on the chart: where the close landed, the starting price, the 30 seconds that decided it, and who won. Winners split the losing side. Every round can be verified in the browser after the reveal.

It's Entertainment Finance: a quick, social, real-money-style game (test USDC on devnet) that's fair by construction.

Under the game is a pattern any fast market can reuse, a **sealed close**: seal a secret in the TEE, mix in every early player's nonce and MagicBlock VRF, hide the round with a no-reader permission, then reveal and let anyone recompute it. Prediction markets, short-term options, sealed-bid auctions and fair launches all have the same last-second problem.

You don't have to trust any of this: **Try to peek** on the Play page makes the request a bot would make for the running round, live against MagicBlock's private rollup. The answer is `value: null`. The previous round, already revealed, comes back in full.

## Technical depth (MagicBlock integration)

- **Private Ephemeral Rollup:** 8 reusable round slots and every player balance are delegated to the TEE validator. Round slots use a MagicBlock permission with **no readers** until the reveal; balances are readable only by their owner. Transaction contents touching a round are hidden too.
- **Hidden close from three sources:** the keeper seeds a secret at open, each call adds a random nonce from the player's device, and **MagicBlock VRF** (requested from inside the TEE, answered in ~2 s) is mixed in. At 10 s the close is fixed from sha256 of all three. The keeper never sees nonces or VRF, players never see the secret, the oracle sees neither; anyone can recompute it after the reveal.
- **Found and fixed a MagicBlock SDK issue:** the `#[vrf_callback]` macro derives the VRF signer at runtime (~270k of the oracle's 300k CU), so callbacks fail and VRF looks broken inside the TEE. A compile-time signer check fixes it; `programs/vrf_probe` reproduces it.
- **No timing leaks:** calls are accepted identically across the public 0–50 s window; the price tick runs at a steady rate and never fails; reveal is rejected before 80 s.
- **Pyth Lazer SOL/USD on MagicBlock**, read on-chain every 400 ms; stale prices or late ticks void and refund the round.
- **Delegate / commit-and-undelegate** to move balances between Solana and the rollup; deposit and withdraw on Solana.
- **Session keys for the rollup:** a rollup transaction carries the rollup's blockhash, which wallet extensions can't place (Solflare refuses it as a mainnet "network mismatch" on devnet). The wallet authorises a temporary key once in a normal devnet transaction; the TEE reads that `Session` account from Solana, and the key signs calls and leaving. One-tap calls, no pop-ups; the key can't withdraw.
- **Keeper with least privilege:** a separate hot key that can only open rounds; ticking, revealing and paying out are permissionless and time-gated, so it can stop but not cheat. It self-heals stuck slots.
- **Zero-copy round accounts** (~4 KB) to fit Solana's stack.
- **Tests:** 31 Rust unit tests for the rules; a devnet end-to-end test (11/11) that runs a real round and checks privacy from an outsider, the admin and a player, and that VRF answered and the close recomputes.
- **UX:** one-click devnet test wallet, one-approval onboarding (gas drip, faucet, deposit, delegation, rollup sign-in), live chart with the reveal drawn in, History with in-browser verification.
- **Live privacy proof:** "Try to peek" reads the running round from the browser through an anonymous rollup login and shows the real `value: null`, next to the revealed previous round.

## Demo video (2–3 min) shot list

1. **Problem (15 s):** "In fast markets bots bet in the last second. Blindside hides the last second."
2. **Onboard (20 s):** Browser A → /play → Play instantly → Start playing (show the steps ticking and 100 USDC).
3. **Second player (15 s):** Browser B (private window) → same, quickly. (Or use Solflare/Phantom: one approval at setup, then calls are one tap through a session key.)
4. **Call (20 s):** in the first seconds of a round, A calls Higher, B calls Lower. Point out "Close hidden" on the chart.
4b. **Try to peek (15 s):** press it while the round runs. "This is the request a bot would make. MagicBlock answers: nothing exists." The previous round shows its close, secret and VRF.
5. **Reveal (30 s):** at 80 s, show the close line dropping in, the start price, the tinted 30 s, the banner, and one wins the other's stake.
6. **Proof (25 s):** /history → Verify → "close recomputes, matching the round". Mention the devnet test checking privacy from three sides.
7. **Under the hood (20 s):** the program on Explorer, a slot owned by MagicBlock's delegation program, the keeper running on Railway.
8. **Close (10 s):** "A sealed close, for any fast market. Blindside is the first app on it. Beat the market, not the bots."

## Prize wallet

Fill in your own Solana address on the form.
