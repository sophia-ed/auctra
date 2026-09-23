# Auctra — Hackathon Submission

## Positioning

Auctra is a lifecycle intelligence and liquidity-transition system for tokenized
private markets.

It starts with PreStocks, tracks the state of each asset and its corporate-action
lifecycle, incorporates external market state from Pyth, and turns the resulting
transition conditions into an inspectable Meteora DBC liquidity configuration.

The core innovation is the transition engine. Auctra does not treat a token
launch as an isolated event. It treats it as one stage in an asset's lifecycle.

## Tracks

| Track | What Auctra uses it for |
|---|---|
| **PreStocks** | The asset registry and the corporate-action lifecycle (official page disclosures, parsed and sourced) |
| **Pyth** | Market/reference state: price, confidence, market session, feed freshness |
| **Meteora** | The liquidity primitive: a validated DBC configuration and DAMM v2 migration path |

## The pipeline

```text
PreStocks -> lifecycle state -> Pyth reference -> transition gap
          -> Transition Curve -> fee policy -> Meteora DBC config
          -> baseline vs Auctra simulation -> reproducible plan
```

## What is genuinely different

- **Lifecycle state is derived**, not asserted: a reducer over stored events
  produces the state and the full transition history.
- **The unit of output is a reproducible plan**: inputs and outputs are
  content-addressed (SHA-256) and plans are append-only.
- **The curve is a function of the corporate-action event**, not of realized
  volatility: event intensity and time-to-deadline modulate liquidity weights.
- **Conversion is first-class and honest**: an unknown ratio yields
  `NOT COMPUTABLE`, never a proxy.
- **Liquidity plans are measured, not asserted**: identical trade sequences run
  against a baseline and against the Auctra configuration, and no winner is
  declared.
- **Provenance is structural**: every externally sourced number resolves to a
  source record with a retrieval time and content hash.

## Evidence in the repository

```text
docs/originality.md      prior-art audit
docs/research/           raw evidence for every external fact
docs/technical-paper.md  the model, with equations
tests/e2e/               one complete pipeline test
packages/domain/         the deterministic engine
apps/api/                the typed backend
apps/web/                15 routes incl. dossier, lab, demo
Dockerfile, docker-compose.yml
```

143 tests, a language lint that forbids unsupported claims, and a CI pipeline that
builds the Docker image.

## Honest status

- The Meteora SDK is not installed; the adapter targets the documented surface
  and the version guard fails clearly on drift.
- Only three of eight current PreStocks have a Pyth reference, so
  `NOT COMPUTABLE` is a normal output.
- Live Pyth updates require an authenticated source; the app reports
  `UNCONFIGURED`/`STALE` rather than `LIVE`.
- No pool has been deployed and no security audit has been performed.

See [`limitations.md`](./limitations.md) for the full list.

## Three-sentence pitch

Auctra turns PreStock lifecycle events into executable liquidity plans. It
combines PreStocks asset state, Pyth market/reference data and Meteora DBC
configuration to model what a market needs when an asset moves from one lifecycle
state to another. Instead of building another stock trading interface, Auctra
builds the infrastructure around the moments when the underlying market changes.
