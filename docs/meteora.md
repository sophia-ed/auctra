# Meteora DBC

Source: `packages/meteora/src/dbc/`. Research: [`research/2026-09-23-meteora-dbc.md`](./research/2026-09-23-meteora-dbc.md).

Meteora DBC is the liquidity primitive. Auctra compiles a policy into a validated
configuration; it does not deploy on its own.

## Pinned SDK

`@meteora-ag/dynamic-bonding-curve-sdk` **1.5.12** is installed and used for real
(see [`sdk-versions.md`](./sdk-versions.md)). `scripts/verify-versions.mjs` reads
the installed version and fails on drift.

Verified against the installed `dist/index.d.ts`:

- `FEE_DENOMINATOR = 1000000000` — confirms `PROVISIONAL_FEE_DENOMINATOR`;
- `MAX_CURVE_POINT = 16` — confirms the segment cap;
- top-level exports `buildCurveWithLiquidityWeights`,
  `buildCurveWithCustomSqrtPrices`, `DynamicBondingCurveClient`,
  `getFeeSchedulerParams`, `validateCurve`, `validateConfigParameters`;
- pool reads are client methods, not top-level exports:
  `state.getPool`, `state.getPoolConfig`,
  `state.getPoolQuoteTokenCurveProgress`,
  `state.getPoolMigrationQuoteThreshold`.

A test (`src/dbc/sdk-curve.test.ts`) asserts the version, the exports and the two
constants, so drift fails CI.

## Real curve construction (Section 25)

`buildSdkCurveParameters(plan, inputs)` calls the SDK's
`buildCurveWithLiquidityWeights` with Auctra's weights and returns the SDK's
`ConfigParameters`. Two facts learned from the installed SDK:

- the builder always produces **16 segments**, so an Auctra policy with fewer
  segments is resampled onto 16 by linear interpolation of the normalised
  profile (warned in the result);
- it requires leftover headroom — with `leftover` too small it throws
  `leftOverDelta must be less than totalLeftover`. `SdkCurveInputs.leftover` is
  therefore explicit.

The result is validated with the SDK's own `validateCurve`.


## Adapter surface (Section 30)

`MeteoraDBCAdapter` depends on the `MeteoraDbcClient` interface, never on the SDK
directly, so its logic is testable and SDK calls live in one place:

```text
validateConfig(plan)        buildConfig(request)
createConfig(request)       createPool(params)
getPool(address)            getConfig(address)
getQuote({pool,…})          getCurveProgress(address)
getMigrationStatus(address) prepareMigration({payer, pool})
```

Every transaction method returns an **unsigned** transaction for wallet signing.
The adapter never submits.

## Recorded enums and constraints

| Field | Values |
|---|---|
| base fee mode | `FeeSchedulerLinear` 0, `FeeSchedulerExponential` 1; **RateLimiter 2 deprecated for new configs** |
| migration option | `MET_DAMM_V2` 1 (DAMM v1 deprecated for new configs) |
| activation type | `Slot` 0, `Timestamp` 1 (Auctra uses Timestamp) |
| collect fee mode | `QuoteToken` 0, `OutputToken` 1 |
| token type | `SPLToken` 0, `Token2022` 1 |
| migration fee option | 0–5 fixed bps, 6 customizable (DAMM v2 only) |
| migrated pool fee | `poolFeeBps` 10–1000 |
| token decimals | 6–9 |
| curve | ≤ 16 points, strictly ascending sqrt price, positive liquidity |

`buildCurveWithLiquidityWeights` accepts at most 16 liquidity weights, which is
the mapping Auctra uses for the Transition Curve. The exact weight *scale* is
documented but not yet confirmed against the installed SDK, so
`toCurveBuilderParams` emits that warning.

## Migration (Section 29)

```text
Meteora protocol migration condition   -> quote balance reaches migrationQuoteThreshold (permissionless)
Auctra transition recommendation       -> analysis only; cannot gate, delay or prevent migration
```

`buildMigrationModel` keeps these separate and warns when the condition is
already met. There is no invented oracle gate.

## Unconfirmed values

Two values are recorded but explicitly flagged as unconfirmed:

- `PROVISIONAL_FEE_DENOMINATOR` (`1e9`) used for the fee numerator;
- `DBC_PROGRAM_ID` (`dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`).

Both must be confirmed against the installed SDK/IDL before deployment. They are
exported constants so they are easy to correct in one place.

## Version safety (Section 31)

At CI time, `pnpm verify:versions` checks the installed SDK against the pin and
`REQUIRED_SDK_EXPORTS`, and fails clearly on mismatch. `createSdkBackedClient`
runs the same guard and refuses to fabricate a binding while the SDK is absent.
