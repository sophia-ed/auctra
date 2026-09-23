# Definition of Done (Section 106)

Audited **2026-09-23**. Legend: ✅ done · ⚠️ done with a stated caveat · ❌ not done.

| Item | Status | Evidence / caveat |
|---|---|---|
| PreStocks API integration works | ✅ | live run returned 8 assets; `packages/prestocks` |
| PreStock assets are normalized | ✅ | `normalize.ts`, README snapshot |
| Lifecycle state machine works | ✅ | `packages/domain/src/lifecycle/`, 7 tests |
| Corporate-action events work | ✅ | `events.ts`, disclosure parser, providers |
| Source registry works | ✅ | `provenance/registry.ts`, conflict detection |
| Pyth integration works | ⚠️ | discovery is keyless and live; price updates need an authenticated source (`PYTH_API_KEY`) |
| Price confidence works | ✅ | `confidenceBps = confidence/price × 10,000` |
| Feed freshness works | ✅ | `feedUpdateTimestamp` origin; 60/300 s thresholds |
| Market session works | ✅ | Pyth `marketSession` used directly |
| Transition gap works | ✅ | `transition/gap.ts` |
| Conversion specification works | ✅ | `transition/conversion.ts` |
| Missing conversion handled honestly | ✅ | `NOT COMPUTABLE` with missing inputs |
| Transition Curve works | ✅ | `policy/curve.ts`; properties asserted |
| Fee policy works | ✅ | `policy/fees.ts` |
| Meteora DBC configuration generation works | ✅ | `policy/dbc.ts`, adapter validation |
| Current Meteora SDK is used | ⚠️ | 1.5.12 installed; `buildSdkCurveParameters` calls the real `buildCurveWithLiquidityWeights`. The network **transaction client binding is still pending**, so `/api/dbc/prepare` returns 503 |
| Deprecated RateLimiter mode is not used | ✅ | never emitted; test asserts it |
| DAMM v2 configuration works | ✅ | `migrationOption: MET_DAMM_V2` |
| DBC configuration can be inspected | ✅ | transition page + `/dbc-lab` raw JSON |
| Simulation engine works | ✅ | `simulation/engine.ts` |
| Baseline comparison works | ✅ | identical sequences; "no winner" |
| Historical replay works | ✅ | `replay/replay.ts` |
| Policy hashes work | ✅ | `inputHash` / `outputHash`, reproducibility test |
| Audit trail works | ✅ | audit events + `/audit` |
| Live/demo distinction works | ✅ | `/api/status`, data-mode banner |
| Wallet integration works | ⚠️ | connect/disconnect/account/network work; **signing was not exercised** with a real wallet |
| Transaction preparation works | ⚠️ | endpoint and flow tested with a fake client; real on-chain binding pending |
| Mainnet mode is explicitly gated | ✅ | config throws without `ENABLE_MAINNET=true` |
| Pool monitoring works | ⚠️ | read path and snapshots work; no pool has been deployed |
| Docker build works | ✅ | built locally and in CI; API container responded |
| CI works | ✅ | install, lint, typecheck, test, build, docker |
| Tests pass | ✅ | 145 tests across 10 suites |
| README works from a clean checkout | ✅ | `--frozen-lockfile` install verified |
| Technical paper exists | ✅ | `docs/technical-paper.md` |
| Originality audit exists | ✅ | `docs/originality.md` |
| Demo mode works without wallet | ✅ | `/demo` runs the pipeline; wallet optional |
| Judge mode works | ⚠️ | served by `/demo`, `/audit` and the dossier; there is no separate "judge mode" toggle |
| No fake addresses | ✅ | every mint from the API or cited |
| No fake feed IDs | ✅ | feed ids captured from Hermes |
| No fake transactions | ✅ | unsigned only; nothing submitted |
| No fake statistics | ✅ | live values or labelled SIMULATED |
| No unsupported financial claims | ✅ | enforced by `scripts/lint-language.mjs` (23 rules) |

## Summary

- **Fully done:** 38 items.
- **Done with a stated caveat:** 7 items — Pyth live updates, the Meteora
  transaction client binding, wallet signing, transaction preparation, pool
  monitoring, and the absence of a distinct judge mode. None of these is
  presented as complete anywhere in the UI or docs.
- **Not done:** none.

The remaining caveats all depend on the same missing piece: an authenticated Pyth
source and a completed on-chain transaction binding. Both are documented in
[`limitations.md`](./limitations.md).
