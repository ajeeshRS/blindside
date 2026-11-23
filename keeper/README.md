# Keeper

Runs the Blindside round clock on MagicBlock's private rollup:

- opens each round ~30 s before it starts, with a fresh random secret (only the keeper key can);
- ticks every 400 ms so the program records the starting price at the hidden close and the result 30 s later;
- reveals each round at 80 s and pays out every call.

Ticking, revealing and paying out are permissionless; anyone can run them. If the keeper stops, rounds pause (in-flight rounds void and refund). It can't move funds, read a running round or change the rules.

```bash
pnpm keeper          # run locally (uses ~/.config/blindside/keeper.json)
pnpm setup:devnet    # one-time: config, keeper role + key, 8 private slots
pnpm probe           # read-only network check
```

## Hosting (Railway)

Project `blindside`, service `keeper`, built from `keeper/Dockerfile`.

| Variable | Value |
| --- | --- |
| `RAILWAY_DOCKERFILE_PATH` | `keeper/Dockerfile` (otherwise Railway auto-detects and can't find a start command) |
| `KEEPER_SECRET_KEY` | the keeper keypair as a JSON byte array. Set it yourself from your machine, never paste it anywhere: `railway variable set KEEPER_SECRET_KEY --stdin --service keeper < ~/.config/blindside/keeper.json` |

Deploy from the repo root: `railway up --service keeper`. The keeper exits on unexpected errors so Railway restarts it.
