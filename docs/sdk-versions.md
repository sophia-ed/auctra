# Pinned versions

**Pinned:** 2026-09-23T12:59:10Z
**Purpose:** AUCTRA.md Section 31 — pin real, verified versions before writing application code, and fail clearly on drift.

No application code has been written yet. This file records the versions the scaffold must pin and the exact evidence for each.

---

## 1. Direct dependency pins

| Dependency | Pinned | Evidence | Notes |
|---|---|---|---|
| `@meteora-ag/dynamic-bonding-curve-sdk` | **1.5.12** | npm `latest` at 2026-09-23T12:59Z | ESM; MIT; ships `bn.js`, `decimal.js`, `@solana/web3.js`, `@coral-xyz/anchor`, `@solana/spl-token`. |
| `@solana/web3.js` | `^1.98.0` (SDK range) | SDK `dependencies` | Field report: a public entry pins `1.99.0` + `rpc-websockets@9.3.10` to dodge a `Class extends value undefined` loader bug. **Verify before adopting.** |
| `@coral-xyz/anchor` | `^0.31.0` | SDK `dependencies` | |
| `@solana/spl-token` | `^0.4.13` | SDK `dependencies` | |
| `bn.js` | `^5.2.1` | SDK `dependencies` | |
| `decimal.js` | `^10.5.0` | SDK `dependencies` | Reuse for Auctra decimal math (Section 6). |
| `typescript` | `^5` | SDK `peerDependencies` | |
| `node` | ≥ 20.9 (target 20 LTS or 22 LTS) | — | No version pinned by a dependency; choose at scaffold. |
| package manager | `pnpm` | AUCTRA.md Section 59 | Use pnpm unless the repo already standardizes elsewhere. |

### 1a. Frontend stack (Section 59)

Pinned 2026-09-23 from the npm registry (`npm view <pkg> version`):

| Dependency | Version | Notes |
|---|---|---|
| `next` | 16.3.6 | App Router, Turbopack production build |
| `react` / `react-dom` | 19.3.0 | Next 16 peer range is `^18.2.0 || ^19.0.0` |
| `tailwindcss` | 4.3.3 | v4: CSS-first, no `tailwind.config.js` required |
| `@tailwindcss/postcss` | 4.3.3 | required PostCSS plugin for Tailwind v4 |
| `postcss` | 8.5.28 | |
| `typescript` | ^5.6.0 | |
| `@types/react` / `@types/react-dom` | 19.3.0 | |

Tailwind v4 setup used here (per the official Next.js guide): install
`tailwindcss @tailwindcss/postcss postcss`, add `"@tailwindcss/postcss": {}` to
`postcss.config.mjs`, and `@import "tailwindcss";` in `globals.css`.

## 2. External data sources (not semver — pin the contract + a content hash)

| Source | Endpoint | Access | Contract to validate |
|---|---|---|---|
| PreStocks | `https://prestocks.com/api/prestocks` | keyless | JSON array; required keys: `name, symbol, description, image, external_url, contract_address, markPrice, markValuation, tokenPrice, impliedValuation, supply`. Snapshot hash: `eb85b7e5037229af447c5143ee53795738170f3899965b048076198a03eb2a26`. |
| PreStocks pages | `https://www.prestocks.com/{symbol}` | keyless | lifecycle disclosures (no schema; parse + content-hash). |
| Pyth Hermes discovery | `https://hermes.pyth.network/v2/price_feeds` | **keyless** | items with `id`, `market_hours`, `attributes.symbol`. Feed-list snapshot hash (TSLA): `fb25b573cbdec8208f77614a073a43ec61a171d9aae676b00bf4e6b9d2d6fbdc`. |
| Pyth Hermes updates | `https://hermes.pyth.network/v2/updates/price/latest` | **API key required** (401 observed) | response shape **not captured** — verify once keyed. |
| Pyth Pro stream | Pyth Pro subscription | API key | payload fields per `docs/pyth.md`. |
| Meteora docs | `github.com/MeteoraAg/ts-sdk` `packages/dynamic-bonding-curve/docs.md` | keyless | docs may lead/ lag the released package — verify against `dist/index.d.ts`. |
| Meteora DBC program | `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN` | — | **unconfirmed against IDL**; confirm before use. |

## 3. CI version check (Section 31)

To be added in the scaffold phase and run in CI. Illustrative form:

```bash
# Fail clearly if the DBC SDK drifts from the pin.
node -e "
const p = require('@meteora-ag/dynamic-bonding-curve-sdk/package.json');
const EXPECTED = '1.5.12';
if (p.version !== EXPECTED) {
  console.error('FATAL: DBC SDK version mismatch. installed=' + p.version + ' expected=' + EXPECTED);
  process.exit(1);
}
console.log('DBC SDK OK', p.version);
"
```

Plus an **export presence** assertion against `dist/index.d.ts` for the surface Auctra actually uses:

```text
buildCurveWithLiquidityWeights
buildCurveWithCustomSqrtPrices
DynamicBondingCurveClient
getFeeSchedulerParams
getPoolQuoteTokenCurveProgress
getPoolMigrationQuoteThreshold
```

## 4. Rules

1. Never assume a method exists because an example shows it — inspect `dist/index.d.ts` and the IDL.
2. Never pin from a blog post; pin from the registry and the installed package.
3. Keep this file current whenever a version moves, with a new `Pinned:` date and the reason.
4. These pins describe **current** state; lifecycle dates and feed IDs are captured separately in `docs/research/` and must be re-validated at runtime.
