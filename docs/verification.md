# Verification matrix

A section-by-section pass over AUCTRA.md, written 2026-09-24 after cross-checking
PreStocks, Pyth and Meteora against their official docs.

**Status key**

- ✅ done and verified against a source or a test
- ✅ done (implementation complete; not separately verified live)
- ⚠️ partial — see the note
- ➖ not applicable to the code (design/positioning directive)

"Verified live" means it was exercised against the real service or a real
process, not just compiled.

| § | Topic | Status | Evidence |
|---|---|---|---|
| 1 | Tracks | ✅ | `docs/tracks.md` |
| 2 | Originality audit | ✅ | `docs/originality.md`, `docs/research/` |
| 3 | Product thesis / plan object | ✅ | `plan/compile.ts`, `plan/types.ts` |
| 4 | Data integrity rule | ✅ | `provenance/`, `scripts/lint-language.mjs` |
| 5 | PreStocks ingestion | ✅ verified live | live fetch returned 8 assets |
| 6 | Asset model | ✅ | `normalize.ts` |
| 7 | Premium/discount engine | ✅ verified | bps; PreStocks' own UI uses "Mark Price Premium %" |
| 8 | Lifecycle engine | ✅ | `lifecycle/machine.ts` |
| 9 | Corporate-action sources | ✅ | PreStocks/Manual/Demo providers |
| 10 | Real lifecycle examples | ✅ verified | xAI + SpaceX disclosures parsed from the pages |
| 11 | Transition state machine | ✅ | machine + allowed-transition graph |
| 12 | Transition dossier | ✅ | `dossier.ts`, `/transition/[id]` |
| 13 | Pyth integration | ✅ verified | Core (Hermes) + Pro (Lazer) paths, both read from real docs/OpenAPI |
| 14 | Pyth data model | ✅ | `observation.ts` |
| 15 | Pyth freshness | ✅ verified | `feedUpdateTimestamp` origin; Pro returns it, Core does not |
| 16 | Pyth market session | ✅ verified | Pro `marketSession` enum read from OpenAPI |
| 17 | Dual-clock model | ✅ | `clocks.ts` |
| 18 | Transition gap | ✅ | `transition/gap.ts` |
| 19 | Conversion specification | ✅ | `transition/conversion.ts` |
| 20 | Transition plan | ✅ | hashed, immutable |
| 21 | Liquidity plan | ✅ | `policy/liquidity.ts`, provenance classes |
| 22 | Transition Curve | ✅ | `policy/curve.ts` |
| 23 | Curve inputs | ✅ | same |
| 24 | Curve algorithms | ✅ | 3 modes |
| 25 | Curve mathematics | ✅ verified | deterministic; weights map to the real SDK curve (16 segments) |
| 26 | Event intensity | ✅ | `policy/intensity.ts`, internal policy variable |
| 27 | Fee policy | ✅ | `policy/fees.ts`; scheduler bps per the docs |
| 28 | Timestamp activation | ✅ | `policy/activation.ts` |
| 29 | Migration model | ✅ verified | protocol condition vs Auctra recommendation; keepers/manual migrator documented |
| 30 | Meteora adapter | ✅ verified | real SDK; prepare returns a real unsigned devnet tx |
| 31 | Version safety | ✅ verified | guard resolves the installed 1.5.12 and asserts exports |
| 32 | DBC inspector | ✅ | `reporting/dbc-inspector.ts`, `/dbc-lab`, dossier raw JSON |
| 33 | Mainnet deployment flow | ✅ | unsigned-tx flow; wallet signs; never auto-submits |
| 34 | Mainnet/demo separation | ✅ | config throws on implicit mainnet |
| 35 | DBC demo pool | ⚠️ | demo asset + config generation work; no pool has been deployed |
| 36 | Simulation engine | ✅ | `simulation/engine.ts` |
| 37 | Transition scenarios | ✅ | 9 presets |
| 38 | Baseline comparison | ✅ | identical sequences; no winner declared |
| 39 | Historical replay | ✅ | `replay.ts`; Pro history endpoint wired; SIMULATED otherwise |
| 40 | Transition timeline | ✅ | `reporting/timeline.ts` |
| 41 | Market clock visualization | ✅ | `clock-panel.tsx` |
| 42 | Asset page | ✅ verified | `/assets/[symbol]` renders live data |
| 43 | Transition page | ✅ verified | 10 sections, renders through compose |
| 44 | Plan builder | ✅ verified | `/create` compiles a real plan |
| 45 | Policy explanation | ✅ | structured INPUT→EFFECT→OUTPUT |
| 46 | Policy JSON | ✅ | `plan/serialize.ts` with hashes |
| 47 | Reproducibility | ✅ verified | same input → same hashes; regression test |
| 48 | Database | ✅ verified | schema, pg-mem tests, and a real compose run persisted rows |
| 49 | Source registry | ✅ | conflict detection; `/audit` |
| 50 | Data audit page | ✅ verified | `/audit` renders real source rows |
| 51 | Live monitor | ✅ verified | `/monitor` + `/api/monitor`, 15 s refresh |
| 52 | Pyth price comparison | ✅ | `reporting/comparison.ts`, shown on the dossier |
| 53 | Liquidity gap view | ✅ | `components/liquidity-gap.tsx`, on the dossier |
| 54 | DBC curve lab | ✅ verified | `/dbc-lab` runs the engine |
| 55 | Configuration diff | ✅ | `reporting/config-diff.ts` |
| 56 | Explorer | ✅ verified | `/pools/[address]`; honest empty state until a pool exists |
| 57 | Wallet | ⚠️ | connect/disconnect/account/network work; signing not exercised in a browser |
| 58 | API | ✅ verified | all §58 routes, 18 tests, compose verified |
| 59 | Frontend stack | ✅ | Next 16.3.6, React 19.3.0, Tailwind 4.3.3 |
| 60 | Backend stack | ✅ | Fastify + Zod + Postgres/Drizzle-shaped repositories |
| 61 | Architecture separation | ✅ | domain has no React/wallet deps |
| 62 | Worker | ✅ verified | ran live; read-only; cannot submit |
| 63 | Caching | ✅ | `cache/`, never-empties-on-failure |
| 64 | Error handling | ✅ | actionable messages; no stack traces |
| 65 | Security | ✅ | helmet/CORS/rate limit, wallet-only signing, no secrets |
| 66 | Financial-data language | ✅ verified | lint passes; 23 rules |
| 67 | No AI dependency | ✅ | none in the runtime |
| 68 | UI design | ✅ | tokens, dark-first, restrained |
| 69 | Signature visual | ✅ | `signature-visual.tsx` |
| 70 | Landing page | ✅ | `/` with headline/subheadline/three sections |
| 71 | Demo page | ✅ verified | `/demo` runs the pipeline; unsatisfiable steps skipped honestly |
| 72 | Demo data | ✅ | demo mode + cached seeds; labelled |
| 73 | Real data mode | ✅ verified | `/api/status`, LIVE/STALE/DEMO |
| 74 | Historical case study | ✅ verified | `/case-studies/xai` and `/case-studies/spacex` |
| 75 | Policy engine tests | ✅ | policy.test.ts |
| 76 | Lifecycle tests | ✅ | machine.test.ts |
| 77 | Mathematical tests | ✅ | ordering, weights, bounds, hashes |
| 78 | Pyth tests | ✅ | 21 tests incl. Pro |
| 79 | Meteora tests | ✅ | 17 tests incl. the real SDK |
| 80 | E2E test | ✅ verified | `tests/e2e/transition.e2e.test.ts` |
| 81 | Containerization | ✅ verified | image builds; API container responds |
| 82 | Environment | ✅ | `.env.example`, `docs/env.md` |
| 83 | Health | ✅ verified | `/api/health` returns ok with no credentials |
| 84 | Observability | ✅ verified | requestId/route/status/latency in logs |
| 85 | Audit trail | ✅ | append-only audit events |
| 86 | Documentation | ✅ | `docs/` |
| 87 | Technical paper | ✅ | `docs/technical-paper.md` with equations |
| 88 | Architecture diagram | ✅ | `docs/architecture.md` |
| 89-91 | Why Meteora/Pyth/PreStocks | ✅ verified | `/why/*` render live data |
| 92 | Post-hackathon product | ✅ | `docs/product.md` |
| 93 | Submission description | ✅ | `HACKATHON_SUBMISSION.md` |
| 94 | Three-sentence pitch | ✅ | `docs/demo-script.md`, submission |
| 95 | 60-second demo script | ✅ | `docs/demo-script.md` |
| 96 | Design language | ✅ | tokens + `docs/product.md` |
| 97 | No copycat language | ✅ verified | lint |
| 98 | No generic AI slop | ✅ verified | lint |
| 99 | Performance | ✅ | server components, SVG charts, TTL cache |
| 100 | Accessibility | ✅ | skip link, focus, symbol+text statuses, reduced motion |
| 101 | Mobile | ✅ | responsive grids, overflow-x tables |
| 102 | Performance budget | ✅ | no chart lib; lazy nothing; minimal client JS |
| 103 | Deployment | ✅ verified | compose verified; single origin; Coolify guide |
| 104 | CI | ✅ verified | install, lint, typecheck, test, build, docker — all green |
| 105 | Repo structure | ✅ | apps/, packages/, docs/, scripts/, tests/ |
| 106 | Definition of done | ✅ | `docs/definition-of-done.md` |
| 107 | Judge experience | ✅ | `/demo` + `/audit` + dossier cover it |
| 108 | Final build directive | ✅ | this build |

## Still unverified

- **§35 demo pool** and **§57 wallet signing** need a browser wallet and a funded
  devnet account to exercise a real signing + submission. The unsigned
  transaction is real; the human approval step was not performed.
- A public deployment URL was not produced (Coolify steps are in
  `docs/deployment.md`).

Everything else is implemented, and the flagged items are documented rather than
hidden.
