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

## Section 11-30 implementation map

| Section | Where |
|---|---|
| 11 Transition state machine | `packages/domain/src/lifecycle/machine.ts` |
| 12 Transition dossier | `packages/domain/src/dossier/dossier.ts` |
| 13-16 Pyth integration, data model, freshness, session | `packages/pyth/src/` |
| 17 Dual-clock model | `packages/domain/src/clocks/clocks.ts` |
| 18 Transition gap | `packages/domain/src/transition/gap.ts` |
| 19 Conversion specification | `packages/domain/src/transition/conversion.ts` |
| 20 Transition plan | `packages/domain/src/plan/` |
| 21 Liquidity plan | `packages/domain/src/policy/liquidity.ts` |
| 22-25 Transition curve and mathematics | `packages/domain/src/policy/curve.ts` |
| 26 Event intensity | `packages/domain/src/policy/intensity.ts` |
| 27 Fee policy | `packages/domain/src/policy/fees.ts` |
| 28 Timestamp activation | `packages/domain/src/policy/activation.ts` |
| 29 Migration model | `packages/domain/src/policy/migration.ts` |
| 30 Meteora adapter | `packages/meteora/src/dbc/adapter.ts`, `client.ts` |

## Section 31-58 implementation map

| Section | Where |
|---|---|
| 31 Meteora version safety | `packages/meteora/src/dbc/version.ts`, `scripts/verify-versions.mjs` |
| 32 DBC configuration inspector | `packages/domain/src/reporting/dbc-inspector.ts` |
| 33 Mainnet deployment flow | `apps/api` `/api/dbc/prepare` returns unsigned tx; wallet signs |
| 34 Mainnet/demo separation | `packages/config/src/config.ts` |
| 35 DBC demo pool | `apps/api` + `packages/meteora` (AUCTRA DEMO asset) |
| 36-38 Simulation, scenarios, baseline | `packages/domain/src/simulation/`, `apps/api` `/api/simulations` |
| 39 Historical replay | `packages/domain/src/replay/replay.ts` |
| 40 Transition timeline | `packages/domain/src/reporting/timeline.ts` |
| 41 Market clock visualization | `packages/domain/src/clocks/clocks.ts`, `apps/web/src/components/clock-panel.tsx` |
| 42 Asset page | `apps/web/src/app/assets/[symbol]/page.tsx` (`/api/lifecycle`, `/api/clocks`, `/api/reference`) |
| 43 Transition page | `apps/web/src/app/transition/[id]/page.tsx` |
| 44 Transition plan builder | `apps/web/src/app/create/page.tsx`, `apps/web/src/components/plan-builder.tsx` |
| 50 Data audit | `apps/web/src/app/audit/page.tsx`, `GET /api/audit` |
| 51 Live monitor | `apps/web/src/app/monitor/page.tsx`, `GET /api/monitor` |
| 54 DBC curve lab | `apps/web/src/app/dbc-lab/page.tsx`, `POST /api/dbc/lab` |
| 56 Explorer | `apps/web/src/app/pools/[address]/page.tsx`, `GET /api/pools/:address` |
| 57 Wallet | `apps/web/src/components/wallet/` (`wallet-providers.tsx`, `wallet-button.tsx`, `deployment-panel.tsx`) |
| 71 Demo page | `apps/web/src/app/demo/page.tsx` |
| 62 Worker | `apps/worker/src/worker.ts`, `apps/worker/src/index.ts` |
| 63 Caching | `packages/cache/src/index.ts` (`cachedLoad` keeps the last good value) |
| 72 Demo data / DemoMode | `apps/web/src/components/data-mode-banner.tsx`, `DemoLifecycleProvider` seeds |
| 73 Real data mode | `GET /api/status` (`LIVE` / `STALE` / `DEMO` / `UNCONFIGURED`) |
| 74 Historical case study | `apps/web/src/app/case-studies/[symbol]/page.tsx` |
| 89-91 Why Meteora / Pyth / PreStocks | `apps/web/src/app/why/meteora`, `why/pyth`, `why/prestocks` |
| 45 Policy explanation | `packages/domain/src/policy/explanation.ts` |
| 46 Policy JSON | `packages/domain/src/plan/serialize.ts` |
| 47 Reproducibility | `packages/domain/src/math/hash.ts`, `plan/compile.ts` |
| 48 Database | `packages/database/src/schema.ts`, `repositories.ts`, `memory.ts`, `sql/0001_init.sql` |
| 49 Source registry | `packages/domain/src/provenance/`, `packages/database` `source_records` |
| 52 Pyth price comparison | `packages/domain/src/reporting/comparison.ts` |
| 53 Liquidity gap view | `packages/domain/src/reporting/liquidity-gap.ts` |
| 55 Configuration diff | `packages/domain/src/reporting/config-diff.ts` |
| 58 API | `apps/api/src/server.ts`, `schemas.ts` |
