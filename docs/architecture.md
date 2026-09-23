# Architecture

## System diagram (Section 88)

```text
                    AUCTRA

       +-------------------------------+
       |        Lifecycle Engine       |
       +--------------+----------------+
                      |
        +-------------+-------------+
        v             v             v
   PreStocks        Pyth        Solana
      data          data         state
        |             |             |
        +-------------+-------------+
                      v
             Transition Engine
                      |
             +--------+--------+
             v                 v
       Transition Curve     Simulation
             |                 |
             v                 v
            Meteora DBC
                 |
                 v
              DAMM v2
```

## Repository layout

```text
apps/
  web/        Next.js 16 app (15 routes, Solana wallet)
  api/        Fastify + Zod backend (Section 58 routes)
  worker/     background refresh (read-only)

packages/
  domain/     lifecycle, transition, policy, plan, simulation, clocks, dossier, reporting, replay
  prestocks/  asset provider, normalization, lifecycle providers
  pyth/       reference model, freshness, feed registry, discovery
  meteora/    DBC adapter, validation, version guard
  config/     environment + network gating
  database/   Postgres schema, in-memory + pg repositories
  cache/      TTL cache with graceful degradation

tests/
  e2e/        one complete pipeline test (Section 80)

docs/         this set
scripts/      verify-versions.mjs, lint-language.mjs
```

## Dependency direction

```text
domain  <- prestocks, pyth, meteora, database, cache
config  <- apps/*
```

The domain layer has no React, Next.js or wallet dependency (Section 61). The
frontend imports domain *types* only; it never imports application code into a
domain package. SDK calls live only in `packages/meteora/src/dbc/`.

## Runtime

```text
browser (wallet)
   |  HTTP
   v
apps/web  --->  apps/api  --->  Postgres
                    |              ^
                    |              |
                PreStocks API      |
                Pyth / Solana      |
                    ^              |
apps/worker --------+--------------+
        (scheduled refresh, read-only)
```

## Determinism and reproducibility

Inputs are canonicalised (sorted keys, fixed-scale decimals, ISO timestamps) and
hashed with SHA-256. A plan's `inputHash` covers the raw inputs; `outputHash`
covers the computed outputs plus the `inputHash`. The same input yields the same
plan id, hashes and policy (Sections 46, 47).

## Configuration

`@auctra/config` parses the environment and resolves the network:

```text
network = DEMO | DEVNET | MAINNET
```

MAINNET is only reachable when it is explicitly requested **and**
`ENABLE_MAINNET=true`. A missing variable never selects mainnet; an unknown value
raises a clear error. See [`security.md`](./security.md).
