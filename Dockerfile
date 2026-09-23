# syntax=docker/dockerfile:1
#
# Auctra container image (AUCTRA.md Sections 81, 103).
# One image serves web, api and worker; docker-compose selects the command.
# Deploys to a plain Docker VPS with no platform dependencies.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# --- dependency layer -------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/cache/package.json packages/cache/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/meteora/package.json packages/meteora/package.json
COPY packages/prestocks/package.json packages/prestocks/package.json
COPY packages/pyth/package.json packages/pyth/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY tests/e2e/package.json tests/e2e/package.json
RUN pnpm install --frozen-lockfile

# --- build layer ------------------------------------------------------------
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages packages
COPY apps apps
COPY tests tests
ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_SOLANA_NETWORK=devnet
# Baked into the Next rewrites, so the web server can proxy /api/* to the API.
ARG API_INTERNAL_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SOLANA_NETWORK=$NEXT_PUBLIC_SOLANA_NETWORK \
    API_INTERNAL_URL=$API_INTERNAL_URL
RUN pnpm --filter @auctra/web build

# --- runtime ----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000 3001
CMD ["pnpm", "--filter", "@auctra/api", "start"]
