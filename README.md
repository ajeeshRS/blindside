# Blindside

**Predict SOL. Beat the market, not the bots.**

Blindside is a 90-second SOL up/down game where betting closes at a **secret moment**. In normal fast markets, whoever sees the price first can bet in the last second, when the result is almost certain, and that's mostly bots. Blindside hides the close inside MagicBlock's **Private Ephemeral Rollup** (Intel TDX TEE), so nobody, including us, knows when it lands until the round is revealed.

Built for MagicBlock Solana Blitz v10, *Entertainment Finance*.

## How a round works

| Time | What happens |
| --- | --- |
| 0–50 s | Call **Higher** or **Lower** with test USDC. At 10 s a secret second in 10–50 s is fixed: the close. It comes from the keeper's secret mixed with every early caller's random nonce, so nobody can predict it. |
| close | The live SOL price becomes the starting price. Calls that landed after it are refunded, never counted. |
| close + 30 s | The result price is recorded. |
| 80 s | Reveal: close time, prices, pools and every call become public. Anyone can recompute the close from the revealed secret and nonces. |
| after | Winners split the losing side pro-rata. |

## What's real

Everything: the live Pyth Lazer SOL/USD feed on MagicBlock, real devnet transactions and a real TEE. Funds are test USDC from an in-app faucet and have no value. Nothing is simulated.

## Repository

```
program/          Anchor program (on-chain) + devnet end-to-end test
packages/client/  shared TypeScript client: addresses, round clock, instructions
keeper/           runs the round clock; one-time devnet setup; network probe
web/              Next.js app
docs/             UI/UX spec and architecture
```

See [docs/architecture.md](docs/architecture.md) for how the pieces fit, and [program/README.md](program/README.md) for each fairness guarantee and the code that enforces it.

## Run it

```bash
pnpm install
pnpm test:unit          # 22 Rust tests for the round rules
pnpm typecheck
pnpm dev                # web app on http://localhost:3000

# devnet (program already deployed)
pnpm setup:devnet       # once: config, test USDC, 8 private round slots
pnpm keeper             # keep rounds running (KEEPER_SECRET_KEY or ~/.config/blindside/keeper.json)
pnpm test:devnet        # one real round end to end (~3 min)
```

Building the program: `pnpm build:program` (Anchor 0.32.1, MagicBlock SDK 0.18.0).
