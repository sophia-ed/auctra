# Auctra — Originality Audit

**Date of audit:** 2026-09-23 (UTC), last refreshed 2026-09-23T12:59:10Z
**Auditor:** Auctra build (research phase, pre-code)
**Scope:** public prior art for "lifecycle intelligence and liquidity transition for tokenized private markets on Solana" across PreStocks / Pyth / Meteora.

> This audit was performed **before** any application code was written, per AUCTRA.md Section 2 and Section 31. It records what is publicly findable, what overlaps, and what the residual differentiation risk is. It does **not** claim legal or formal uniqueness.

---

## 1. Why an audit at all

Auctra sits at the intersection of three already-active ecosystems:

- **PreStocks** — tokenized pre-IPO exposure on Solana.
- **Pyth** — external market-state / reference data.
- **Meteora DBC** — programmable bonding-curve liquidity.

Any one of those axes alone is crowded. The audit exists to force the differentiation to live in the **mechanism**, not the branding (AUCTRA.md Section 2: *"differentiated by its actual mechanism, not merely by branding"*).

The audit was triggered by an important discovery: Auctra is not entering an empty space. It is entering a **live hackathon context** (see §3) with several public submissions already targeting the same three sponsors.

---

## 2. Searches performed

All searches run 2026-09-23. Web via the search/fetch tools; repositories via the GitHub REST search API and `raw.githubusercontent.com`; feeds via the live Pyth Hermes endpoint; packages via the npm registry.

### 2.1 Concept searches

```text
PreStocks lifecycle
PreStocks IPO transition
PreStocks corporate action
PreStocks conversion
PreStocks migration
tokenized private stock IPO transition
tokenized stock lifecycle
Meteora DBC stock transition
Pyth PreStocks
private-to-public token transition
tokenized equity handoff
Solana tokenized equity corporate action onchain lifecycle state machine
Meteora Dynamic Bonding Curve DBC TypeScript SDK configuration migration DAMM v2
Pyth Hermes API market session feedUpdateTimestamp confidence price
Stocklana hackathon 2026 PreStocks Meteora Pyth bounty
"PreStocks" "conversion" OR "deadline" OR "IPO" Meteora DBC liquidity transition project
```

### 2.2 Repository searches (GitHub API)

```text
GET /search/repositories?q=auctra&sort=stars
GET /search/repositories?q=prestocks
GET /search/repositories?q=token+lifecycle+transition+solana+in:name,description
GET /search/code?q="transition curve"+meteora+dbc      -> 401 (code search requires auth; not usable unauthenticated)
```

### 2.3 Direct source inspections

```text
https://prestocks.com/api/prestocks
https://www.prestocks.com/xai
https://www.prestocks.com/spacex
https://hermes.pyth.network/v2/price_feeds?query={TSLA,SPCX,OPENAI,ANTHROPIC,ANDURIL,FIGURE,KALSHI,NEURALINK,POLYMARKET,SPACEX}
https://hermes.pyth.network/v2/updates/price/latest?...   -> 401 (Pyth Pro / Hermes updates now require an API key)
https://registry.npmjs.org/@meteora-ag/dynamic-bonding-curve-sdk/latest
https://raw.githubusercontent.com/MeteoraAg/ts-sdk/main/packages/dynamic-bonding-curve/docs.md
https://github.com/MeteoraAg/dynamic-bonding-curve
https://docs.meteora.ag/developer-guides/dbc
https://docs.pyth.network/price-feeds/pro/payload-reference
```

The raw evidence (exact values, IDs, hashes) is stored under [`docs/research/`](./research/README.md).

---

## 3. Context finding: this is a Stocklana-track problem

The audit surfaced the actual competitive context:

- **Stocklana** (Solana hackathon) added five sponsor tracks — **Meteora, Pyth, PreStocks**, Clawpump, Tessera — for a ~$121k+ pool, with the deadline reported as **Sep 25, 2026 4:00 PM ET**.
- The **Pyth track** prize includes three months of **Pyth Pro** (1,200+ equity feeds).
- Public code-search and repository search show a cluster of **20+ public Stocklana entries** touching PreStocks and/or Pyth→Meteora DBC.

This matters because it means the audit cannot conclude "no one has done this." Several public entries already do meaningful parts of it. The honest question is therefore narrow: *what does Auctra's mechanism add that the public entries do not?*

---

## 4. Public overlaps found

Graded by proximity to Auctra's specific mechanism.

### 4.1 Nearest neighbours (mechanism overlap)

| Repo | What it actually does | Overlap with Auctra | Gap Auctra must occupy |
|---|---|---|---|
| **[0andadream/parity](https://github.com/0andadream/parity)** — *"Integrity and lifecycle monitoring for tokenized private markets."* | Deterministic snapshots of Solana state, issuer evidence, market observations and **lifecycle events**; SHA-256 integrity hash vs observations; states CLEAR/ATTENTION/ACTION/CRITICAL; real XAI + SPACEX lifecycle terms in `data/lifecycle.ts`. | **Lifecycle + source integrity + audit trail.** Very close on the "know the lifecycle state of a PreStock" axis. | Parity **monitors**; it does not produce a transition plan, a liquidity policy, or a Meteora configuration. Auctra's lifecycle engine must be *derived* (events → state machine), and must feed a transition→liquidity pipeline. |
| **[sidsri14/equitycurve](https://github.com/sidsri14/equitycurve)** | **Curve Studio**: generates a full DBC `ConfigParameters` with the start sqrt price pinned to the Pyth fair value; **Fair-Value Monitor** reads live DBC pools and measures premium vs Pyth; on-chain zero-key Pyth push-feed parser; PreStocks surface used as reference fair value. | **Pyth → Meteora DBC config generation + PreStocks reference + premium/discount.** The single closest technical overlap. | EquityCurve drives the curve from a **Pyth reference price only**. It has **no corporate-action event, no lifecycle state machine, no conversion spec, no deadline, no event intensity, no baseline-vs-alternative simulation.** Its curve is a static equity anchor, not a transition policy. |
| **[Sathwiksaibogi/stockforge](https://github.com/Sathwiksaibogi/stockforge)** | Deterministic **Curve Compiler** from Pyth price + 30-day realized volatility + risk profile → Discovery/Fair-Value/Expansion regions → DBC calibration → pre-launch simulation → **real Devnet deploy** (config + pool) → live quotes/swaps through Phantom. PreStocks is read-only Token-2022 inspection. | **Pyth → deterministic DBC compiler → simulate → deploy.** Very close on the *launch* pipeline and on the design/simulate/deploy discipline. | StockForge's input is **realized volatility**, not a lifecycle event. PreStocks is decoration (mint inspection), not the system's state source. No conversion/deadline/expiration logic; no transition gap; no baseline comparison against a conventional config. |
| **[kamalbuilds/last-call](https://github.com/kamalbuilds/last-call)** — *"convert PreStocks pre-IPO tokens before their conversion deadline, even with 0 SOL."* | Conversion-deadline UX for PreStock holders. Repo created 2026-09-23, currently **empty** (size 0). | **Conversion deadline** as a user-facing concept. | Last Call is a holder utility, not a market-design tool. Auctra consumes the deadline as an *input to liquidity policy*, and produces a DBC configuration + simulation. |

### 4.2 Adjacent (data/surface overlap, different mechanism)

| Repo | Overlap |
|---|---|
| [Fatihmaull/parity](https://github.com/Fatihmaull/parity) — *"every PreStock on Solana, priced correctly."* | PreStock premium/discount surface only. |
| [Alex20Sas12/prestocks-terminal](https://github.com/Alex20Sas12/prestocks-terminal) | Premium/discount, valuations, volume, holder charts. |
| [aralroca/prestocks-pulse](https://github.com/aralroca/prestocks-pulse) | Open data layer, premium radar, index, split-aware Jupiter quotes, MCP server. |
| [flipperspectives-crypto/stocklana-prestocks](https://github.com/flipperspectives-crypto/stocklana-prestocks) | Live mark vs token premium board. |
| [arisparrondobarrios-debug/prestocks-lens](https://github.com/arisparrondobarrios-debug/prestocks-lens) | Read-only premium/valuation monitor. |
| [kepler-ops-maker/prestocks-risk-brief](https://github.com/kepler-ops-maker/prestocks-risk-brief) | Explainable risk screen. |
| [jamin599/prestocks-solana-mvp](https://github.com/jamin599/prestocks-solana-mvp) | Oracle-guided prediction-market AMM. |
| [emmyCode4495/PreLendd](https://github.com/emmyCode4495/PreLendd) | Lending against PreStock Token-2022. |
| [0xileri/rung](https://github.com/0xileri/rung), [nialthony/markdesk](https://github.com/nialthony/markdesk), [catalystberry842-alt/PreLaunch](https://github.com/catalystberry842-alt/PreLaunch) | Valuation market / mark-relative OTC / basket tooling. |
| [notandruu/protoperps-solana](https://github.com/notandruu/protoperps-solana) | Synthetic perps on pre-IPO companies. |
| [fskroes/wallie-prestocks](https://github.com/fskroes/wallie-prestocks) | x402-paid agent reports. |
| [larrychain/pre-IPO-market-on-chain](https://github.com/larrychain/pre-IPO-market-on-chain) | Survey/report, not software. |

### 4.3 Name collisions (not mechanism collisions)

The string **"Auctra"** is already used by many unrelated projects — online auction systems, a DomaFi domain-asset protocol, an "AI Founder OS" waitlist, and more. Notably [Devonlegend/auctra](https://github.com/Devonlegend/auctra) uses the tagline *"Turn market conditions into market mechanics,"* which is thematically adjacent but unrelated in implementation.

**Conclusion on naming:** "Auctra" is not a unique brand, but there is **no prior use of "Auctra" in the tokenized-private-market lifecycle / Meteora-DBC space**. Naming is not the differentiator and should not be treated as one.

---

## 5. How Auctra differs (mechanism-level)

The public prior art splits cleanly along the three sponsor axes:

```text
lifecycle / integrity monitors      ->  Parity, Last Call, premium terminals
Pyth -> DBC launch compilers        ->  StockForge, EquityCurve
```

**No public project found closes all three in one pipeline.** Auctra's differentiation is the composition, and specifically the parts that do not exist in either camp:

1. **Lifecycle state is derived, not asserted.**
   Prior art either curates lifecycle terms by hand (Parity's `data/lifecycle.ts`) or ignores them (StockForge, EquityCurve). Auctra implements a **transition state machine** where `LifecycleState` is a pure function of stored `LifecycleEvent`s, every transition is recorded with `previousState / newState / timestamp / reason / source`, and UI code is forbidden from determining state independently.

2. **The unit of output is a reproducible Transition Plan, not a page.**
   A `TransitionPlan` binds source asset, event, reference state, `ConversionSpec`, `TransitionGap`, liquidity plan, DBC plan, and simulation into one object with `algorithmVersion`, `inputHash`, and `outputHash` (SHA-256 over normalized input/output). No public project produces a hash-addressable transition plan; the closest prior art produces either a live dashboard or a one-shot launch config.

3. **The curve is a function of the corporate-action event, not of realized volatility.**
   StockForge compiles volatility → curve. EquityCurve pins to a Pyth fair value. Auctra computes an **event intensity ∈ [0,1]** from event severity, event confidence, time-to-deadline and reference uncertainty, then modulates a **Transition Curve** (`REFERENCE_CENTERED` / `TRANSITION_WIDE` / `EVENT_ADAPTIVE`) whose normalized weights map directly onto Meteora's real `buildCurveWithLiquidityWeights` (≤16 weights). The liquidity policy answers *"what does this market need as it changes state?"*, not *"what is the fair price today?"*

4. **Conversion is a first-class, inspectable object with an honest failure mode.**
   Auctra normalizes the issuer-published conversion terms into a `ConversionSpec` (`1 SOURCE → X TARGET`, `effectiveAt`, `deadline`, `sourceUrl`, `verifiedAt`). where no verified ratio exists it displays **UNKNOWN** and refuses to compute a gap. This is validated by the live data: of the 8 current PreStocks, only **OPENAI, ANTHROPIC and SPCX/SpaceX** have Pyth references at all; the other five are **NOT COMPUTABLE**. Auctra treats that as a first-class, honest output — prior art mostly either fabricates a proxy or silently omits the comparison.

5. **Liquidity plans are measured, not asserted.**
   Every major plan runs **identical trade sequences** against a `BASELINE DBC` and the `AUCTRA TRANSITION DBC` and reports price impact, slippage, fees, curve progress and reference deviation side by side, **without declaring a winner** (AUCTRA.md Section 38). The public compilers simulate a *single* proposed curve; Auctra's contribution is the *controlled comparison*.

6. **Three market clocks and a source registry are part of the core model.**
   Auctra distinguishes the **private market clock**, the **public market clock** (Pyth `marketSession`) and the **24/7 onchain clock**, and every externally sourced number is traceable to a `SourceRecord` with `sourceType`, `retrievedAt` and a content hash. This directly overlaps Parity's evidence axis — Auctra acknowledges that and does not claim it as novel; it is required for the rest of the pipeline to be honest.

**One-line differentiation:** the public projects that touch PreStocks+Pyth+Meteora build a *pricing/launch* product; Auctra builds the *lifecycle transition* product, and treats the DBC config as the output of a corporate-action-driven policy rather than a market-data snapshot.

---

## 6. What Auctra explicitly does NOT claim as novel

To keep the audit honest, the following are **not** claimed as original:

- Reading the PreStocks REST API or on-chain Token-2022 state — done by many.
- Premium/discount vs mark — done by many.
- Compiling Pyth data into a Meteora DBC `ConfigParameters` — done by StockForge and EquityCurve.
- Simulating a DBC curve before deploying — done by StockForge.
- Lifecycle monitoring / evidence classification of PreStocks — done by Parity.
- Conversion-deadline awareness — done by Last Call and Parity.
- Deploying a real DBC pool on Devnet — done by StockForge.

The claim is the **pipeline and its invariants** (derived lifecycle state → conversion spec → transition gap → event-adaptive curve → deterministic, hash-reproducible plan → baseline comparison).

---

## 7. Residual risk and mitigation

| Risk | Assessment | Mitigation |
|---|---|---|
| A judge sees Auctra as "EquityCurve/StockForge with lifecycle words." | **High.** The Pyth→DBC surface is genuinely crowded. | The demo must *lead* with the mechanism: show the lifecycle event, the derived state transition, the conversion spec (real xAI→SPACEX terms), the **NOT COMPUTABLE** honesty case, and the baseline-vs-Auctra simulation. Surface polish is not the argument; the transition engine is. |
| A judge sees Auctra as "Parity with a DBC tab." | Medium. | Show that lifecycle state is *derived and versioned* and that it *changes the liquidity policy* (event intensity → weights → DBC params). Parity has no liquidity output. |
| Lifecycle data is not in the PreStocks API, so it must be sourced elsewhere. | Known. | Use the live PreStocks asset pages as `PRESTOCKS_PAGE` sources, store `retrievedAt` + `contentHash`, label manual entries `MANUAL`, and never hardcode a deadline as live. |
| Only 3/8 PreStocks have a Pyth reference. | Confirmed. | Design the NOT COMPUTABLE path as a first-class feature, not an error. |
| Deadline pressure (Stocklana closes 2026-09-25 4PM ET). | **High.** | Scope to the Definition of Done in AUCTRA.md §106, prioritizing the deterministic domain core + the demo path. |

---

## 8. Acknowledgment on unpublished submissions

Hackathon submissions may be **private, unlisted, or not yet pushed** when this audit ran. Public search — including GitHub's repository and code search — **cannot establish uniqueness against unpublished or private submissions**, and GitHub code search was itself unavailable unauthenticated (401) during this audit. Auctra therefore makes **no claim of global novelty**. It claims only that, as of 2026-09-23, the specific mechanism in §5 was not found in public prior art, and it commits to differentiating by mechanism rather than by name.

---

## 9. Sources

All sources, exact values, retrieval timestamps and content hashes are recorded in [`docs/research/`](./research/README.md). Pinned dependency versions are recorded in [`docs/sdk-versions.md`](./sdk-versions.md).
