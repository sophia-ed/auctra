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
| Sections 1–10 (tracks, thesis, data integrity, ingestion, asset model, premium, lifecycle, corporate actions, real examples) | done — see [`docs/tracks.md`](./docs/tracks.md) |
| `@auctra/domain` — lifecycle, transition, policy, plan, simulation | done (37 tests) |
| `@auctra/prestocks` — asset provider, normalization, lifecycle providers | done (15 tests) |
| `@auctra/pyth` — reference model, freshness, feed registry, discovery | done (12 tests) |
| `@auctra/meteora` — DBC adapter, validation, version guard | done (8 tests) |
| `@auctra/database`, `apps/web`, `apps/api`, `apps/worker` | not started |

72 tests, clean typecheck across all packages.

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
