# Auctra

**Liquidity for the moments markets change state.**

Auctra is a lifecycle intelligence and liquidity-transition system for tokenized
private markets on Solana. It starts with [PreStocks](https://prestocks.com),
tracks each asset's corporate-action lifecycle, incorporates external market
state from [Pyth](https://pyth.network), and turns the resulting transition
conditions into an inspectable [Meteora DBC](https://docs.meteora.ag/developer-guides/dbc)
liquidity configuration.

This repository is being built to the specification in [`AUCTRA.md`](./AUCTRA.md).
It is currently in the **domain-core** phase: the deterministic engine and the
provider adapters exist and are tested. The web/API/worker applications are not
built yet.

## Status

| Layer | State |
|---|---|
| Originality audit + pinned versions | done — [`docs/originality.md`](./docs/originality.md), [`docs/research/`](./docs/research/README.md), [`docs/sdk-versions.md`](./docs/sdk-versions.md) |
| Sections 1–30 (ingestion, lifecycle, transition, curve, fees, migration, DBC adapter) | done — see [`docs/tracks.md`](./docs/tracks.md) |
| Sections 31–58 (reporting, replay, network gating, database, typed API) | done (API only; web UI not started) |
| `@auctra/domain` — lifecycle, transition, policy, plan, simulation, clocks, dossier, reporting, replay | done (59 tests) |
| `@auctra/prestocks` — asset provider, normalization, lifecycle providers | done (15 tests) |
| `@auctra/pyth` — reference model, freshness, feed registry, discovery | done (12 tests) |
| `@auctra/meteora` — DBC adapter, validation, migration status, version guard | done (15 tests) |
| `@auctra/config` — network gating (DEMO/DEVNET/MAINNET) | done (7 tests) |
| `@auctra/database` — Postgres schema, in-memory + pg repositories | done (10 tests) |
| `@auctra/cache` — TTL cache with graceful degradation | done (4 tests) |
| `@auctra/api` — typed backend (Section 58 routes, status) | done (16 tests) |
| `@auctra/web` — Next.js app | 15 routes incl. DBC lab, audit, monitor, pools, case studies, demo; Solana wallet (devnet-safe) |
| `@auctra/worker` — background refresh (read-only) | done (4 tests) |
| `tests/e2e` — one complete pipeline test | done (1 test) |
| Docker — `Dockerfile`, `docker-compose.yml` | image builds and the API container responds |

143 tests, clean typecheck across all packages.

## Deployment (Docker VPS)

```bash
docker compose up --build
# web   http://localhost:3000
# api   http://localhost:3001/api/health
```

Postgres, the API, the worker and the web app run as separate services. Mainnet
remains gated: it is only selectable when `ENABLE_MAINNET=true` is set explicitly.

### Running the API

```bash
pnpm --filter @auctra/api dev   # http://localhost:3001
curl localhost:3001/api/health
```

The API uses the in-memory repository layer and the `AUCTRA DEMO` lifecycle
provider by default (`DEMO_MODE=true`). Mainnet is unreachable unless
`ENABLE_MAINNET=true` is set explicitly.

Nothing here is investment advice. Auctra produces analysis and proposed
configurations; it does not custody assets and does not submit transactions
without an explicit wallet signature.

## Requirements

- Node.js >= 20.9 (developed on 24.x)
- pnpm (the repo pins `pnpm@12.5.1` via `packageManager`)

## Quick start

```bash
corepack enable
pnpm install
pnpm verify:versions
pnpm typecheck
pnpm test
pnpm build
```

From a clean checkout this runs the deterministic engine's test suite. No
network access is required for the tests — provider adapters take an injected
`fetch` and are exercised against recorded fixtures. Network is only used by the
live provider paths and by `pnpm verify:versions`.

## Layout

```text
packages/
  domain/     deterministic engine: math, lifecycle, transition, policy, plan, simulation
  prestocks/  PreStocks REST provider + normalization
  pyth/       Pyth reference provider + freshness / market-session model
  meteora/    Meteora DBC configuration adapter + version guard
docs/
  originality.md   prior-art audit (required before code)
  sdk-versions.md  pinned protocol/SDK versions
  research/        raw evidence for every external fact
scripts/
  verify-versions.mjs   Section 31 version safety check
```

Frontend code must never be imported into domain packages (AUCTRA.md §61). The
domain packages here have no React, Next.js, or wallet dependencies.

## Provenance

Every externally sourced fact carries `source`, `retrievedAt`, and `sourceType`.
Possible source types: `PRESTOCKS_API`, `PRESTOCKS_PAGE`, `PYTH`, `SOLANA`,
`METEORA`, `MANUAL`, `SIMULATION`. Manual data is labelled `MANUAL`; modelled
data is labelled `SIMULATED`. See [`docs/research/`](./docs/research/README.md).
