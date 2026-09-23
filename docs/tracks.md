# Hackathon tracks

Auctra targets exactly three tracks (AUCTRA.md Section 1). No other sponsor
integration exists in the codebase, and none is planned merely to increase the
count. The three form one pipeline:

```text
PreStocks (asset + lifecycle)  ->  Pyth (market state)  ->  Meteora DBC (liquidity)
```

| Track | What Auctra actually uses it for | Code |
|---|---|---|
| **PreStocks** | The asset registry and the corporate-action lifecycle. The REST API supplies normalized assets; the official asset pages supply lifecycle disclosures (parsed, validated, sourced). | `packages/prestocks/src/provider.ts`, `normalize.ts`, `schema.ts`, `lifecycle/` |
| **Pyth** | The external market-state / reference layer. Price, confidence, exponent, publisher count, market session and feed freshness — never a single unquestioned number. | `packages/pyth/src/observation.ts`, `freshness.ts`, `reference.ts`, `registry.ts` |
| **Meteora** | The liquidity mechanics. Auctra's transition curve becomes a validated DBC configuration targeting DAMM v2 migration. | `packages/meteora/src/dbc/config.ts`, `version.ts`; `packages/domain/src/policy/dbc.ts` |

## Why these three and not more

The product thesis (Section 3) is a transition:

```text
PRIVATE ASSET -> LIFECYCLE EVENT -> TRANSITION WINDOW -> NEW MARKET STATE -> LIQUIDITY RECONFIGURATION
```

- PreStocks is the only source of the assets and their lifecycle.
- Pyth is the only external state that says what the market outside the private
  asset is doing.
- Meteora DBC is the only primitive that turns "what liquidity does this
  transition need" into a deployable configuration.

Adding a fourth integration would not strengthen the transition; it would
dilute it.

## What is deliberately excluded

- No stock launchpad, no generic DEX frontend, no portfolio tracker, no AI
  picker, no prediction market, no LLM wrapper (Section 1).
- No invented sponsor behaviour: where the PreStocks API lacks lifecycle fields,
  the page-evidence path is used and labelled; where Pyth needs a key for live
  updates, that is surfaced rather than faked (Section 9, 13).

## Section 1-10 implementation map

| Section | Where |
|---|---|
| 1 Tracks | this file |
| 2 Originality audit | [`originality.md`](./originality.md), [`research/`](./research/README.md) |
| 3 Product thesis / Transition Plan | `packages/domain/src/plan/` |
| 4 Data integrity | `packages/domain/src/provenance/`, `math/hash.ts` |
| 5 PreStocks ingestion | `packages/prestocks/src/provider.ts`, `schema.ts` |
| 6 PreStock asset model | `packages/prestocks/src/normalize.ts` |
| 7 Premium / discount engine | `packages/domain/src/transition/premium.ts` |
| 8 Lifecycle engine | `packages/domain/src/lifecycle/` |
| 9 Corporate-action sources | `packages/prestocks/src/lifecycle/` |
| 10 Real lifecycle examples | `packages/prestocks/src/lifecycle/providers.ts` (`DEMO_LIFECYCLE_SEEDS`) |
