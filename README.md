# Auctra

**Liquidity for the moments markets change state.**

Auctra is a lifecycle intelligence and liquidity-transition system for tokenized
private markets on Solana. It starts with [PreStocks](https://prestocks.com),
tracks each asset's corporate-action lifecycle, reads market state from
[Pyth](https://pyth.network), and turns the result into an inspectable
[Meteora DBC](https://docs.meteora.ag/developer-guides/dbc) configuration.

The part worth caring about is the transition engine, not the dashboard. A
PreStock doesn't stay in one market state forever — a company IPOs, gets
acquired, converts, or hits a deadline — and Auctra models what the market needs
when that happens, as a reproducible plan rather than a page of numbers.

It's analysis and configuration tooling. It doesn't custody anything, doesn't
give investment advice, and doesn't submit a transaction without a wallet
signature.

## Run it

```bash
corepack enable && pnpm install
pnpm --filter @auctra/api dev    # http://localhost:3001
pnpm --filter @auctra/web dev    # http://localhost:3000
```

Or the whole stack in one go:

```bash
docker compose up --build        # http://localhost:3000
curl localhost:3000/api/health
```

Only the web port is public — it proxies `/api/*` internally, so there's one
domain and no CORS. See [`docs/deployment.md`](./docs/deployment.md).

To work through the pipeline without touching any of that, open `/demo` once the
app is running.

## Checks

```bash
pnpm verify:versions
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

150 tests across the packages. The tests don't need network access — the
providers take an injected `fetch` and run against recorded fixtures. Network is
only used by the live provider paths and `pnpm verify:versions`.

## What's inside

```text
packages/
  domain/     the engine: lifecycle, transition, policy, plan, simulation
  prestocks/  PreStocks REST provider and the lifecycle disclosure parser
  pyth/       reference model, freshness, feed registry, Hermes access
  meteora/    the DBC adapter, real SDK curve builder, transaction client
  config/     environment and network gating
  database/   Postgres schema, in-memory + pg repositories
  cache/      TTL cache that never empties on an upstream failure

apps/
  web/        the Next.js app (assets, dossier, builder, lab, monitor, audit, demo)
  api/        the typed Fastify backend
  worker/     scheduled refresh, read-only

tests/e2e/    one complete pipeline test
```

## The honest part

This is a hackathon build with a real deadline, so the limitations matter more
than the features. A few things to know before judging:

- Only three of the eight current PreStocks have a Pyth reference, so the
  transition gap is often `NOT COMPUTABLE`. That's the intended output, not a bug.
- Live Pyth prices need `PYTH_API_KEY`. Without it the app says `UNCONFIGURED`
  instead of faking a number.
- The Meteora SDK (1.5.12) is installed and wired; `/api/dbc/prepare` returns a
  real unsigned devnet transaction. Nobody has signed one with a real wallet yet,
  and no pool has been deployed.
- The simulator is a documented approximation of DBC, not an on-chain replica.

[`docs/limitations.md`](./docs/limitations.md) and
[`docs/definition-of-done.md`](./docs/definition-of-done.md) are the places to
check the rest.

## Read more

Start with [`docs/technical-paper.md`](./docs/technical-paper.md) if you want the
model with equations. [`docs/product.md`](./docs/product.md) covers scope,
[`docs/originality.md`](./docs/originality.md) is the prior-art audit, and
[`docs/tracks.md`](./docs/tracks.md) maps every section of the spec to code. For
using the app there's [`USER.md`](./USER.md); for submitting, [`SUBMISSION.md`](./SUBMISSION.md).
Deployment is in [`docs/deployment.md`](./docs/deployment.md) and where each
environment variable comes from is in [`docs/env.md`](./docs/env.md). The
section-by-section verification of the whole spec is in
[`docs/verification.md`](./docs/verification.md).

## Provenance

Every externally sourced fact carries a `source`, a `retrievedAt` and a
`sourceType`. Manual data is labelled `MANUAL`, modelled data is labelled
`SIMULATED`, and nothing simulated is shown as live. The raw evidence is in
[`docs/research/`](./docs/research/README.md).
