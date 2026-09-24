# Environment variables

Auctra runs with only the defaults. Nothing external is required for demo mode.
The only credential you ever need to obtain is `PYTH_API_KEY`, and only for live
Pyth prices.

## Works with defaults

| Variable | Value | Notes |
|---|---|---|
| `PRESTOCKS_API_URL` | `https://prestocks.com/api/prestocks` | public PreStocks endpoint; prefilled |
| `PYTH_HERMES_URL` | `https://hermes.pyth.network` | public Hermes host; prefilled |
| `DEMO_MODE` | `true` | cached lifecycle seeds; demo runs without a wallet |
| `ENABLE_MAINNET` | `false` | mainnet is unreachable unless set to `true` explicitly |
| `NEXT_PUBLIC_API_URL` | *(empty)* | empty = same-origin; the web server proxies `/api/*` |
| `API_INTERNAL_URL` | `http://api:3001` (compose) | `http://localhost:3001` locally; SSR and the `/api` proxy target |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` | the wallet cluster; never silently mainnet |
| `WORKER_INTERVAL_MS` | `60000` | worker refresh interval |
| `SOLANA_WS_URL` | *(unused)* | read by config; reserved for a future WebSocket source |

## Database

| Variable | Local | Docker Compose |
|---|---|---|
| `DATABASE_URL` | `postgres://auctra:auctra@localhost:5432/auctra` | **set automatically** to the `postgres` service |

The compose stack wires `DATABASE_URL` from `POSTGRES_USER` / `POSTGRES_PASSWORD`
/ `POSTGRES_DB`. Set a strong `POSTGRES_PASSWORD` before exposing a deployment.
The schema is applied from `packages/database/sql/0001_init.sql` on first start.

## Providers

| Variable | Where to get it | Without it |
|---|---|---|
| `PYTH_API_KEY` | Request via the Pyth developer hub — Hermes now requires a key. The Stocklana Pyth track prize includes 3 months of Pyth Pro. | references read `UNCONFIGURED`, never faked |
| `SOLANA_RPC_URL` | devnet is free: `https://api.devnet.solana.com`; production: a hosted Solana RPC | DBC prepare/reads 503 |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | same | wallet uses `clusterApiUrl(devnet)` |

## Rules

- `.env` is never committed; `.env.example` holds only safe defaults.
- `ENABLE_MAINNET=true` is the only way mainnet becomes reachable, and it is not
  something you fetch — you set it deliberately.
- In Coolify, set these under the resource's Environment variables.
