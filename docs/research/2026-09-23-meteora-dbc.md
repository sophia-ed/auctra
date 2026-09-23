# Meteora DBC — live evidence

**Source type:** `METEORA` / npm registry
**Retrieved:** 2026-09-23T12:58Z
**Package:** `@meteora-ag/dynamic-bonding-curve-sdk`
**Pinned version:** **1.5.12** (`latest` at retrieval; `_npmUser` publish, MIT)
**npm tarball:** `dynamic-bonding-curve-sdk-1.5.12.tgz`

---

## 1. Package facts (from npm registry `latest`)

| Field | Value |
|---|---|
| name | `@meteora-ag/dynamic-bonding-curve-sdk` |
| version | **1.5.12** |
| license | MIT |
| module type | `"type": "module"` (ESM; also ships CJS at `dist/index.cjs`) |
| types | `dist/index.d.ts` |
| repository | `github.com/MeteoraAg/dynamic-bonding-curve-sdk` → `packages/dynamic-bonding-curve` |
| homepage/doc source | `github.com/MeteoraAg/ts-sdk` → `packages/dynamic-bonding-curve/docs.md` |
| dependencies | `bn.js ^5.2.1`, `decimal.js ^10.5.0`, `@solana/web3.js ^1.98.0`, `@coral-xyz/anchor ^0.31.0`, `@solana/spl-token ^0.4.13` |
| peerDependencies | `typescript ^5` |

Useful detail: the SDK already depends on **`decimal.js`**, which aligns with Auctra's decimal-arithmetic requirement (AUCTRA.md Section 6). Auctra can use one decimal library end to end.

**Interop note:** because the package is ESM-only (no CJS default in modern bundlers — it does publish a CJS build, but the `exports` map is `import`/`require` split), the consuming app must be ESM-compatible. A public Stocklana entry (`equitycurve`) reports pinning `@solana/web3.js@1.99.0` and `rpc-websockets@9.3.10` to avoid a `Class extends value undefined` loader error. Treat this as a **field report to verify**, not a mandate — reproduce it before adopting the override.

## 2. Program identity

- DBC on-chain program id observed in the SDK test harness and in public integrations: **`dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`**.
- **Status:** observed from third-party/public sources, **not yet confirmed against the published IDL**. AUCTRA.md Section 31 requires confirming from the installed SDK/IDL before use. Do not hardcode until confirmed.

## 3. Client surface (from `docs.md`)

Three namespaces off `DynamicBondingCurveClient`:

```text
client.partner.*    create/claim (config creation, partner fees)
client.creator.*    pool creation, creator fees
client.state.*      read pool/config state, progress, fees
```

### 3.1 Config creation — parameter semantics that gate Auctra's design

From `createConfig` / `createConfigAndPool`:

| Parameter | Values | Auctra relevance |
|---|---|---|
| `poolFees.baseFee.baseFeeMode` | `0` FeeSchedulerLinear, `1` FeeSchedulerExponential, `2` RateLimiter | **RateLimiter (2) is deprecated for new configs.** Auctra must use 0/1 only (Section 27). |
| `activationType` | `0` Slot, `1` Timestamp | Auctra uses **Timestamp** for `SCHEDULED` / `EVENT_RELATIVE` activation (Section 28). |
| `migrationOption` | `1` MET_DAMM_V2; `0` DAMM v1 | **New configs must use DAMM v2 (1).** DAMM v1 is deprecated for new configs (Section 29). |
| `collectFeeMode` | `0` QuoteToken, `1` OutputToken | |
| `tokenType` | `0` SPLToken, `1` Token2022 | Relevant because PreStocks mints are Token-2022. |
| `tokenDecimal` | **6–9** | |
| `migrationFeeOption` | `0`=25bps, `1`=30bps, `2`=100bps, `3`=200bps, `4`=400bps, `5`=600bps, `6`=Customizable | Customizable (6) allowed only for DAMM v2. |
| `migratedPoolFee.poolFeeBps` | **10–1000 bps** | Graduated DAMM v2 pool fee. |
| `migratedPoolBaseFeeMode` | `0`/`1` TimeScheduler (linear/exp), `3`/`4` MarketCapScheduler (linear/exp) | |
| `migrationQuoteThreshold` | `> 0` | **This is the protocol migration condition** (Section 29) — a quote-reserve threshold, *not* an oracle gate. |
| fee numerators | must be `< FEE_DENOMINATOR`, positive, within MIN/MAX | |

### 3.2 Migration (Section 29)

```text
migrateToDammV2(...)            current DAMM v2 migration path
createDammV1MigrationMetadata   legacy
migrateToDammV1(...)            legacy (deprecated for new configs)
createLocker / withdrawLeftover
```

The protocol migrates **when the config's `migrationQuoteThreshold` is reached** (per public Meteora docs: *"Once the DBC pool hits the minimum quote balance set in its config, it becomes non-tradeable and migrates"*). Auctra must therefore present:

```text
Meteora protocol migration condition   <-- threshold reached (protocol-enforced, permissionless)
Auctra transition recommendation       <-- advice about timing/liquidity, separate from protocol
```

and must **not** claim it can block migration (Section 29).

### 3.3 State / read functions (Section 30 / 56)

```text
getPoolConfig / getPoolConfigs / getPoolConfigsByOwner
getPool / getPools / getPoolsByConfig / getPoolsByCreator / getPoolByBaseMint
getPoolMigrationQuoteThreshold
getPoolQuoteTokenCurveProgress
getPoolBaseTokenCurveProgress
getPoolFeeMetrics / getPoolFeeBreakdown
deriveDbcPoolAddress / deriveDammV1PoolAddress / deriveDammV2PoolAddress
getQuoteFromInputAmount / getQuoteFromOutputAmount / swapQuote
```

These map directly onto the `MeteoraDBCAdapter` responsibilities in Section 30 (`getPool`, `getConfig`, `getQuote`, `getCurveProgress`, `getMigrationStatus`).

## 4. Build-curve helpers — the mapping for the Transition Curve

Available (from `docs.md`):

```text
buildCurve
buildCurveWithMarketCap
buildCurveWithTwoSegments
buildCurveWithMidPrice
buildCurveWithLiquidityWeights     <-- primary mapping for Auctra
buildCurveWithCustomSqrtPrices
```

### 4.1 `buildCurveWithLiquidityWeights` (key finding)

Signature/params (verbatim shape):

```typescript
function buildCurveWithLiquidityWeights(
    params: BuildCurveWithLiquidityWeightsParams
): ConfigParameters

interface BuildCurveWithLiquidityWeightsParams {
    // ...BuildCurveBaseParams: token, fee, migration, liquidityDistribution, lockedVesting, activationType
    initialMarketCap: number
    migrationMarketCap: number
    liquidityWeights: number[]   // max 16 elements
}
```

Documented behavior (verbatim intent):

- `liquidityWeights` is an array determining how liquidity is distributed across the curve's price ranges.
- **Maximum 16 curve segments.**
- Each element scales the liquidity for that segment; moving along the curve (low→high price) controls liquidity per segment.
- `all weights === 1` → uniform/linear curve.
- `weights[i] < weights[i+1]` → less liquidity at low prices (price moves more at low prices).
- `weights[i] > weights[i+1]` → more liquidity at low prices.

**This is the concrete hook for the Auctra Transition Curve (Sections 22–25).** Auctra's normalized weights (which sum to 1) must be converted to the SDK's expected relative scale; the SDK applies weights as *relative scaling per segment*, and the docs do **not** state that weights must sum to 1. **Verify the normalization semantics against `dist/index.d.ts` / source before assuming a scale.** This is exactly the docs-vs-SDK check Section 31 mandates.

### 4.2 Other relevant knobs

- `buildCurveWithCustomSqrtPrices` — needed if Auctra pins a specific start sqrt price (e.g. to a Pyth reference).
- `buildCurveWithMarketCap` — for initial/migration market-cap anchored curves.
- `getFeeSchedulerParams` / `getDynamicFeeParams` — for constructing the fee policy programmatically rather than by hand.
- **Dynamic fee** is capped at **20% of the minimum base fee** (from `docs.md`).

## 5. Fee scheduler ↔ Auctra fee policy

Auctra's `DbcFeePolicy { mode, startingFeeBps, endingFeeBps, durationSeconds }` (Section 27) maps to the SDK's fee-scheduler params:

```text
baseFeeMode        -> FeeSchedulerLinear (0) | FeeSchedulerExponential (1)
cliffFeeNumerator  -> starting fee numerator
firstFactor        -> numberOfPeriod
secondFactor       -> periodFrequency (seconds when activationType = Timestamp)
thirdFactor        -> reductionFactor
```

`feeSchedulerParam.totalDuration` is denominated in **ms per unit**: docs note *"Slot is 400ms, Timestamp is 1000ms."* Verify units at implementation.

## 6. Version-safety plan (Section 31)

Auctra must, at startup or CI:

1. Read the installed `@meteora-ag/dynamic-bonding-curve-sdk` version (pinned to `1.5.12` here).
2. Compare against the expected pin and/or the current published `latest`.
3. Assert the expected exports exist (`buildCurveWithLiquidityWeights`, `DynamicBondingCurveClient`, the state/migration functions used).
4. **Fail clearly** if incompatible, and document the actual version in use.

Sample check (to be wired into CI in the scaffold phase):

```bash
node -e "const p=require('@meteora-ag/dynamic-bonding-curve-sdk/package.json'); \
  if(p.version!=='1.5.12'){console.error('DBC SDK version mismatch',p.version);process.exit(1)}; \
  console.log('DBC SDK OK',p.version)"
```

## 7. Open questions to verify before implementation

- Confirm the DBC **program id** from the published IDL, not from third parties.
- Confirm `liquidityWeights` normalization/scale semantics and the exact **max segment count** in the installed version.
- Confirm `feeSchedulerParam` unit conventions (ms vs seconds) for `activationType = Timestamp`.
- Confirm which `buildCurve*` helper is stable in `1.5.12` (docs may lead the released package).
- Confirm Token-2022 base-mint + transfer-hook requirements for the demo pool (PreStocks mints use Token-2022 extensions; the demo asset must not imply real ownership — Section 35).
- Confirm the current DamM v2 migration condition wording against live Meteora docs before displaying it (Section 29).
