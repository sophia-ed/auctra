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

## SDK-backed client (Sections 30, 33)

`createSdkBackedClient({ rpcUrl, commitment })` constructs the real
`DynamicBondingCurveClient` (defaulting to devnet) and implements the client
contract:

```text
createConfig   partner.createConfig(ConfigParameters + accounts)  -> unsigned tx
createPool     creator.createPool(CreatePoolParams)               -> unsigned tx
getPool        state.getPool + curve progress + migration threshold
getConfig      state.getPoolConfig
getQuote       pool.swapQuote with getCurrentPoint(connection, activationType)
getPoolQuoteTokenCurveProgress / getPoolMigrationQuoteThreshold
migrateToDammV2 migration.migrateToDammV2 -> unsigned tx + the two NFT signer keypairs
```

Findings from the installed SDK that shaped this:

- the returned transaction has **no blockhash**, so the client fetches one and
  sets the fee payer before serialising; the blockhash is returned so the wallet
  confirms with the same one;
- `migrateToDammV2` returns two **position NFT keypairs** that must co-sign, so
  `UnsignedTransaction.additionalSigners` carries their secret keys;
- the SDK's own validator runs inside `createConfig` and enforced a rule the docs
  did not state: **≥1000 bps (10%) liquidity must be locked at day 1**. The
  generated `liquidityDistribution` locks 25%, and the API now returns the SDK's
  message as a `400 dbc_config_rejected` instead of a generic 500.

Verified end to end: `/api/dbc/prepare` returned a real unsigned devnet
transaction (~1.4 KB with a live blockhash).

## Cross-checked against docs.meteora.ag

Recorded facts that the code and docs now agree with (read from the developer
guide and the formulas page, 2026-09-24):

- **Program ID** `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN` — the same on
  mainnet and devnet. `DBC_PROGRAM_ID` is now confirmed, not provisional.
- **Pool Authority** `FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM`.
- **Fee numerator denominator is `1,000,000,000`**; the total fee numerator is
  capped at `990,000,000` (99%). Auctra's fee policy stays within [10, 1000] bps.
- **Base fee** is a scheduler (fixed, linear-decay or exponential-decay); the
  RateLimiter is deprecated for new configs, and Auctra never emits it.
- **Pool creation fee** is between `0.001` and `100` SOL in lamports.
- **Migration**: a pool migrates when `quote reserve ≥ migration quote threshold`.
  The configurable partner/creator migration fee applies, and a fixed **0.2%
  protocol liquidity migration fee** also applies at migration.
- **Migration keepers run on mainnet** (they migrate when the threshold matches
  known quote mints — e.g. 10 SOL, 750 USDC). On devnet, the
  [Manual Migrator](https://migrator.meteora.ag) handles both. **Auctra does not
  run a keeper and does not migrate pools itself.** A migration is either
  permissionless on mainnet or manual via the Migrator; Auctra only builds the
  unsigned `migrateToDammV2` transaction.
- **Leftover** is the unused base supply for a fixed-supply launch after the
  migrated pool and base fees — which is why the curve builder requires leftover
  headroom (the `leftOverDelta` constraint we hit).

What stays SDK-verified rather than doc-stated: the fee scheduler's
`numberOfPeriod`/`totalDuration` units for timestamp activation, and the exact
`liquidityWeights` scale — both are flagged in the code rather than asserted.


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
