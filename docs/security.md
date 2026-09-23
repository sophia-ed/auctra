# Security

Source: `packages/config/src/config.ts`, `apps/api/src/server.ts`,
`apps/web/src/components/wallet/`.

## Never store secrets

Auctra never asks for or stores a seed phrase, private key or exported wallet.
The browser wallet is the only signer. The API holds no key material: it returns
**unsigned** transactions (base64) for the wallet to sign and submit.

## Network gating (Section 34)

```text
network = DEMO | DEVNET | MAINNET
```

- Default is `DEMO` (or `DEVNET` when `DEMO_MODE=false`).
- `MAINNET` is only reachable when explicitly requested **and**
  `ENABLE_MAINNET=true`.
- A missing variable never selects mainnet; an unknown network value raises
  `ConfigError` rather than guessing.
- The web wallet cluster is chosen from `NEXT_PUBLIC_SOLANA_NETWORK` and defaults
  to devnet. When the API reports `MAINNET`, the deployment panel displays
  `MAINNET · REAL TRANSACTION`.

## Wallet-only signing (Section 33)

```text
review plan -> validate config -> prepare (unsigned) -> wallet approval
-> submit -> verify -> explorer link
```

Nothing is submitted automatically. The panel deserialises the prepared
transaction, partial-signs the config keypair, asks the wallet to sign, then
submits and confirms. If the Meteora SDK is unavailable the API returns `503` and
the panel reports it.

## Input validation

Every API input is validated with Zod (`apps/api/src/schemas.ts`): decimals,
segment counts (2–16), token decimals (6–9), enums for events/scenarios, and
timestamps. Invalid input returns `400` with structured issues.

## Transport and abuse controls

The API registers `@fastify/helmet` (secure headers), CORS, and a rate limit
(120 requests per minute). Responses never include stack traces: the error
handler returns a generic message for 5xx and logs the detail server-side with a
`requestId`.

## Observability

Structured logs carry `requestId`, route, status and latency, and the worker logs
asset/plan/pool identifiers. Nothing secret is logged.

## Supply chain

Dependencies are pinned, and `pnpm` verifies the lockfile against supply-chain
policies. `pnpm verify:versions` checks the Meteora SDK pin and expected exports.
A language lint enforces the no-unsupported-claims rule in product copy.

## Known gaps

- The Meteora SDK is not installed in this build, so the transaction path is
  wired but not exercised end to end against a live cluster.
- The API has no authentication; it is intended to run on a trusted host and does
  not expose privileged operations.
- Postgres credentials come from the environment; rotate the compose defaults
  before any real deployment.
