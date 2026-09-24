# Deployment

Auctra deploys as four containers with **one public entry point** (AUCTRA.md
Sections 81, 103). The Next server proxies `/api/*` to the API service, so there
is no CORS and only one domain is needed.

```text
internet
   |
   v
web :3000  ──/api/*──>  api :3001 (internal only)
   |                        |
   |  Next SSR uses         +--> Postgres :5432 (internal)
   |  API_INTERNAL_URL      |
   v                        |
worker ────────────────────>+   (scheduled refresh, read-only)
```

## Services

| Service | Image / build | Port | Notes |
|---|---|---|---|
| `web` | `auctra:app` | **3000 (public)** | Next 16, proxies `/api/*` |
| `api` | `auctra:app` | 3001 (internal) | Fastify, writes to Postgres |
| `worker` | `auctra:app` | — | PreStocks/reference/event refresh, pool snapshots |
| `postgres` | `postgres:16-alpine` | 5432 (internal) | schema auto-applied from `packages/database/sql/0001_init.sql` |

`api`, `worker` and `web` share one built image (`auctra:app`) and differ only by
`command`.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `auctra` | database credentials — **change the password before exposing** |
| `DEMO_MODE` | `true` | demo mode uses cached lifecycle seeds |
| `ENABLE_MAINNET` | `false` | mainnet is unreachable unless this is `true` |
| `NEXT_PUBLIC_API_URL` | empty | empty = same-origin (recommended) |
| `API_INTERNAL_URL` | `http://api:3001` | SSR and the `/api` proxy target |
| `PRESTOCKS_API_URL` | `https://prestocks.com/api/prestocks` | asset registry |
| `PYTH_HERMES_URL` | `https://hermes.pyth.network` | reference discovery |
| `PYTH_API_KEY` | empty | without it, references read `UNCONFIGURED` rather than live |
| `SOLANA_RPC_URL` | empty | RPC for wallet/Solana reads |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` | `mainnet` only alongside `ENABLE_MAINNET=true` |
| `WORKER_INTERVAL_MS` | `60000` | worker refresh interval |

## Local / VPS (Docker Compose)

```bash
cp .env.example .env        # optional; compose has sane defaults
docker compose up -d --build
# web + api proxy:  http://localhost:3000
# health:           http://localhost:3000/api/health
docker compose down         # add -v to also drop the database volume
```

Verify:

```bash
curl -s localhost:3000/api/health
curl -s localhost:3000/api/assets | jq '.assets | length'
```

## Coolify

Coolify can deploy the compose stack straight from the repository. There are two
shapes:

### A. All-in-one compose (default)

Uses `docker-compose.yml`, which includes its own Postgres service and volume.
Nothing else to provision. This is the simplest path and the healthcheck is tuned
for slow first boots.

### B. Dedicated Coolify Postgres (recommended for reliability)

Use a Coolify-managed database instead of the in-compose service:

1. **New Resource → Database → PostgreSQL** (v16).
2. Deploy the app from **`docker-compose.coolify.yml`** (no Postgres service) with:
   ```env
   DATABASE_URL=postgres://<user>:<password>@<host>:5432/<db>
   DEMO_MODE=true
   ENABLE_MAINNET=false
   ```
3. The schema applies itself: on startup, the API and the worker run the DDL
   (`IF NOT EXISTS`) from `packages/database/sql/0001_init.sql`. No manual step.
   Check the logs for `schema_applied`.

With either shape: assign a domain only to `web` (port 3000), and set the
healthcheck path `/api/health`.


1. **New Resource → Docker Compose.**
2. **Source:** public repository `https://github.com/sophia-ed/auctra`, branch `main`.
3. **Compose file:** `/docker-compose.yml` (default).
4. **Domain:** assign a domain to the **`web`** service on port **3000**.
   Do not expose `api`, `worker` or `postgres` — they are internal.
5. **Environment variables** (Coolify → Environment):
   ```env
   POSTGRES_PASSWORD=<a strong password>
   DEMO_MODE=true
   ENABLE_MAINNET=false
   PYTH_API_KEY=<optional; makes references live>
   NEXT_PUBLIC_SOLANA_NETWORK=devnet
   ```
6. **Health check:** path `/api/health`, port `3000`.
7. **Deploy.** The schema is applied automatically on first Postgres start.

Push to `main` and redeploy to update. The `pgdata` volume keeps the database.

### Notes

- Postgres is the source of truth in a deployed stack; the in-memory repositories
  are only used when `DATABASE_URL` is unset.
- Mainnet stays off until `ENABLE_MAINNET=true`. The UI shows
  `MAINNET · REAL TRANSACTION` when it is on.
- Wallet signing happens in the browser; the server never holds a key.
- Docker's build arg `API_INTERNAL_URL` is baked into the Next rewrites, so if you
  rename the `api` service, update `x-app.build.args.API_INTERNAL_URL` too.

### "postgres is unhealthy" / dependency failed to start

First-boot Postgres initialization on a slow host can outlast a short healthcheck
window, so the check uses a `start_period` and enough retries. If it still fails:

- Check the `postgres` container logs — if it shows auth errors, the `pgdata`
  volume holds a cluster initialized with different credentials. Either keep the
  same `POSTGRES_PASSWORD` across redeploys or clear the volume (`docker volume rm
  <project>_pgdata`) and redeploy.
- Set `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` explicitly in Coolify
  and do not change the password without clearing the volume.

## CI

`.github/workflows/ci.yml` runs install, language lint, typecheck, tests, build,
and a Docker image build on every push.
