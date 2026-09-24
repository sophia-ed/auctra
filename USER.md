# Auctra — User Guide

Auctra turns PreStock lifecycle events into inspectable liquidity plans and
Meteora DBC configurations. It is analysis and configuration infrastructure, not
a trading interface: it never custodies assets, never gives investment advice,
and never submits a transaction for you.

> Tagline: **Liquidity for the moments markets change state.**

## 1. Running it

### Local (development)

```bash
corepack enable && pnpm install
pnpm --filter @auctra/api dev    # API at http://localhost:3001
pnpm --filter @auctra/web dev    # Web at http://localhost:3000
```

### Production (Docker)

```bash
docker compose up --build        # single entry point: http://localhost:3000
curl localhost:3000/api/health   # expect {"application":"ok", ...}
```

Only the `web` port is public; it proxies `/api/*` to the API internally. See
[`docs/deployment.md`](./docs/deployment.md).

## 2. The screens

| Route | What you see | Why |
|---|---|---|
| `/` | The transition path and the three pillars | Orientation |
| `/assets` | The live PreStocks registry | Pick an asset |
| `/assets/[symbol]` | Identity, prices, derived lifecycle, reference, clocks | One asset's state |
| `/create` | The plan builder | Compile a transition plan |
| `/transition/[id]` | The dossier (10 sections) | The central artifact |
| `/dbc-lab` | A parameter lab | How DBC inputs change the curve |
| `/monitor` | Live state across assets and pools | Watch conditions |
| `/audit` | Source registry and provenance | Where every number came from |
| `/pools/[address]` | A pool's on-chain state | Explorer |
| `/case-studies/[symbol]` | A historical lifecycle event | xAI, SpaceX |
| `/demo` | A scripted run of the whole pipeline | Quick proof |
| `/why/meteora`, `/why/pyth`, `/why/prestocks` | Track explanations | Why these three |

## 3. Reading the interface

**Data-mode banner (top).** Shows the mode and each provider's status.

- `DEMO` — the app is running with cached lifecycle seeds and no live reference key.
- `LIVE` / `STALE` / `UNCONFIGURED` — per provider. A failing provider reads
  `STALE`, never `LIVE`.

**Lifecycle states** — `PRIVATE_ACTIVE`, `EVENT_ANNOUNCED`, `CONVERSION_OPEN`,
`PUBLIC_TRANSITION`, `POST_EVENT`, `EXPIRING`, `EXPIRED`, `UNKNOWN`. Derived from
events, never assigned by the UI.

**Freshness** — `FRESH` (< 60 s), `AGING` (< 300 s), `STALE`, `UNKNOWN`. Driven by
Pyth's `feedUpdateTimestamp` (or `publish_time` on Hermes Core), not receipt time.

**Mark deviation** — `MARK PREMIUM` / `MARK DISCOUNT` in basis points. A
deviation, never a *mispricing* verdict.

**Transition gap** — `COMPUTABLE` or `NOT COMPUTABLE`. If the conversion ratio or
target reference is missing, it says exactly which input is missing rather than
substituting a proxy.

**Modelled values** are labelled `MODEL` or `SIMULATED` and never presented as
observed.

## 4. Building a plan

1. `/create` → pick a PreStock. The builder shows its derived lifecycle state and
   next deadline.
2. Set the liquidity policy (curve mode, segments, reference price, target
   liquidity, migration threshold, quote mint) and optionally a verified
   conversion ratio and target mint.
3. **Compile transition plan.** This stores an immutable, hash-addressed plan. It
   deploys nothing.
4. On the dossier, read Overview, Lifecycle, Reference, Conversion, Liquidity,
   Transition Curve, Meteora DBC, Simulation, Sources, Audit Trail. Run the
   baseline-vs-Auctra simulation (measurements only; no winner declared).

## 5. Inspecting and deploying a DBC config

- The dossier's **Meteora DBC** section shows the human-readable parameters and the
  raw JSON. The **Deployment** section walks the wallet flow.
- **Prepare transaction** produces an **unsigned** transaction. The wallet signs
  and submits it. Nothing is submitted without your approval.

A compiled plan is a proposal, not an action.

## 6. Wallets

- Connect with Phantom or Solflare. The header shows the account and the cluster.
- The cluster defaults to **devnet** and is never silently mainnet. Mainnet is
  only reachable when `ENABLE_MAINNET=true` is set by the operator; then the
  deployment panel shows **MAINNET · REAL TRANSACTION**.
- Auctra never asks for a seed phrase, private key, or exported wallet.

## 7. Statuses and what they mean

| Status | Meaning |
|---|---|
| `COMPUTABLE` | inputs were present; the gap was calculated |
| `NOT COMPUTABLE` | a required input (target reference or conversion ratio) is missing |
| `UNKNOWN` | a value cannot be determined from the sources |
| `SIMULATED` | produced by the simulation/replay engine, not observed |
| `MODEL` | a modelled (not measured) quantity |
| `VERIFIED` | a conversion with ratio, mints, source and verification time |
| `DEMO` | demo mode data |
| `LIVE` / `STALE` / `UNCONFIGURED` | provider data-mode status |

## 8. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "The Auctra API could not be reached" | the API is not running, or `API_INTERNAL_URL`/`NEXT_PUBLIC_API_URL` is wrong |
| Reference shows "unavailable" | no Pyth feed for the asset, or no `PYTH_API_KEY` configured |
| Transition gap is `NOT COMPUTABLE` | expected when the issuer published no ratio, or no feed exists — not an error |
| Deployment says `meteora_sdk_unavailable` / 503 | the Meteora adapter wasn't wired at startup (see server logs) |
| Deployment says `dbc_config_rejected` | the SDK rejected the configuration; the message names the rule |

## 9. Where to read more

- [`docs/technical-paper.md`](./docs/technical-paper.md) — the model, with equations.
- [`docs/product.md`](./docs/product.md) — product scope and design.
- [`docs/limitations.md`](./docs/limitations.md) — everything that is not done or not verified.
- [`docs/data-provenance.md`](./docs/data-provenance.md) — how sources are tracked.
