# Blindside keeper: runs the round clock on MagicBlock's private rollup.
# Build from the repo root:  docker build -f keeper/Dockerfile -t blindside-keeper .
# Needs KEEPER_SECRET_KEY (JSON byte array of the keeper keypair) at runtime.
FROM node:22-slim

WORKDIR /app
RUN corepack enable

# Workspace manifests first, so dependency installs are cached.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/client/package.json packages/client/
COPY keeper/package.json keeper/
COPY web/package.json web/
COPY program/package.json program/
RUN pnpm install --frozen-lockfile --filter "@blindside/keeper..."

COPY packages/client packages/client
COPY keeper keeper

ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@blindside/keeper", "start"]
