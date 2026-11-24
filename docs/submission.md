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

Blindside: 90-second SOL up/down rounds where betting closes at a secret moment hidden in MagicBlock's Private Ephemeral Rollup, so bots can't win by betting last.

## Description

In fast prediction markets, whoever sees the price first bets in the final second, when the result is nearly certain. That's mostly bots, and the average player loses to them.

Blindside removes the last second. Every 90 seconds a round opens on the live SOL price. Somewhere between 10 and 50 seconds it secretly closes: the price at that moment becomes the starting price, and the result is the price 30 seconds later. Calls that land after the close are refunded. Because the close is hidden inside MagicBlock's Private Ephemeral Rollup (an Intel TDX TEE), nobody can time it: not players, not bots, not us.

At 80 seconds the round is revealed on the chart: where the close landed, the starting price, the 30 seconds that decided it, and who won. Winners split the losing side. Every round can be verified in the browser after the reveal.

It's Entertainment Finance: a quick, social, real-money-style game (test USDC on devnet) that's fair by construction.

## Technical depth (MagicBlock integration)

- **Private Ephemeral Rollup:** 8 reusable round slots and every player balance are delegated to the TEE validator. Round slots use a MagicBlock permission with **no readers** until the reveal; balances are readable only by their owner. Transaction contents touching a round are hidden too.
- **Hidden close without an oracle:** the keeper seeds a secret at open; each call adds a random nonce from the player's device. At 10 s the close is fixed from sha256 of both. The keeper never sees nonces, players never see the secret, and anyone can recompute it after the reveal. (We started with MagicBlock VRF; on devnet it isn't fulfilled on the TEE endpoint, which other builders report too.)
- **No timing leaks:** calls are accepted identically across the public 0–50 s window; the price tick runs at a steady rate and never fails; reveal is rejected before 80 s.
- **Pyth Lazer SOL/USD on MagicBlock**, read on-chain every 400 ms; stale prices or late ticks void and refund the round.
- **Delegate / commit-and-undelegate** to move balances between Solana and the rollup; deposit and withdraw on Solana.
- **Keeper with least privilege:** a separate hot key that can only open rounds; ticking, revealing and paying out are permissionless and time-gated, so it can stop but not cheat. It self-heals stuck slots.
- **Zero-copy round accounts** (~4 KB) to fit Solana's stack.
- **Tests:** 25 Rust unit tests for the rules; a devnet end-to-end test (10/10) that runs a real round and checks privacy from an outsider, the admin and a player.
- **UX:** one-click devnet test wallet, one-approval onboarding (gas drip, faucet, deposit, delegation, rollup sign-in), live chart with the reveal drawn in, History with in-browser verification.

## Demo video (2–3 min) shot list

1. **Problem (15 s):** "In fast markets bots bet in the last second. Blindside hides the last second."
2. **Onboard (20 s):** Browser A → /play → Play instantly → Start playing (show the steps ticking and 100 USDC).
3. **Second player (15 s):** Browser B (private window) → same, quickly.
4. **Call (20 s):** in the first seconds of a round, A calls Higher, B calls Lower. Point out "Close hidden" on the chart and that the round is unreadable.
5. **Reveal (30 s):** at 80 s, show the close line dropping in, the start price, the tinted 30 s, the banner, and one wins the other's stake.
6. **Proof (25 s):** /history → Verify → "close recomputes, matching the round". Mention the devnet test checking privacy from three sides.
7. **Under the hood (20 s):** the program on Explorer, a slot owned by MagicBlock's delegation program, the keeper running on Railway.
8. **Close (10 s):** "Fair by construction. Beat the market, not the bots."

## Prize wallet

Fill in your own Solana address on the form.
