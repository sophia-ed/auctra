# Data provenance

Source: `packages/domain/src/provenance/`, `packages/database`, `apps/api`
`/api/audit`.

## Rule

Every externally sourced fact carries `source`, `retrievedAt` and `sourceType`.
Nothing is invented: not token addresses, Pyth feed ids, conversion ratios, event
dates, issuer claims, listing dates, acquisition terms or market prices.

## Source types

Two vocabularies coexist:

```text
lifecycle events (Section 4):  PRESTOCKS_API  PRESTOCKS_PAGE  PYTH  SOLANA  METEORA  MANUAL  SIMULATION
source registry (Section 49):  prestocks_api  prestocks_page  pyth  meteora  manual  simulation
```

Manual data is labelled `MANUAL`; modelled data is labelled `SIMULATED` and never
presented as live.

## Source registry (Section 49)

```ts
type SourceRecord = { id, sourceType, url?, retrievedAt, contentHash?, description }
```

`SourceRegistry.register` is idempotent for the same id, and **throws
`SourceConflictError`** when the same id arrives with a different content hash, so
evidence is never silently overwritten. The Postgres table `source_records` and
the in-memory implementation share the shape.

## Content hashes

Registry entries and cached payloads carry a content hash. During the audit the
PreStocks API response hashed to
`eb85b7e5037229af447c5143ee53795738170f3899965b048076198a03eb2a26` and the Pyth
feed list for `TSLA` to
`fb25b573cbdec8208f77614a073a43ec61a171d9aae676b00bf4e6b9d2d6fbdc`
(see [`research/`](./research/README.md)).

## Provenance classes in a liquidity plan (Section 21)

Every liquidity-plan value declares one of:

```text
OBSERVED    measured from a source
CALCULATED  derived deterministically
SIMULATED   produced by the simulation engine
PROPOSED    a plan suggestion
```

An unobserved current liquidity is shown as `UNKNOWN`, never assumed to be zero,
and the gap is then `NOT COMPUTABLE` rather than being fabricated.

## Audit trail (Section 85)

The API records append-only audit events:

```text
asset_imported  event_added  reference_observed  policy_compiled
simulation_executed  configuration_prepared  deployment_submitted  deployment_confirmed
```

Each entry carries `timestamp`, `actor`/`source`, and structured metadata. The
worker writes `_worker`-sourced entries. `/audit` renders the registry,
observations, events and assets together.

## Caching (Section 63)

Public external data is cached with `lastFetchedAt`, `expiresAt`, an optional
`etag` and a `contentHash`. On an upstream failure `cachedLoad` returns the last
verified value flagged `stale` and surfaces the error — it never replaces a
verified observation with empty data. The worker reports `stale: ['prestocks']`
in that case.
