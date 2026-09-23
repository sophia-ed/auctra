import type { DbcPlan } from '@auctra/domain'

/**
 * Real Meteora SDK curve construction (AUCTRA.md Sections 25, 30).
 *
 * Uses the installed `buildCurveWithLiquidityWeights` to turn the Transition
 * Curve weights into the SDK's `ConfigParameters`. The SDK is imported lazily so
 * the rest of the system does not pay for it.
 */

export interface SdkCurveInputs {
  initialMarketCap: number
  migrationMarketCap: number
  totalTokenSupply: number
  /**
   * Tokens held back from the curve. The SDK requires enough headroom: with
   * `leftover` too small it throws `leftOverDelta must be less than totalLeftover`.
   */
  leftover?: number
  /** 6–9 */
  tokenBaseDecimal: number
  /** usually 9 (SOL/USDC) */
  tokenQuoteDecimal: number
  poolCreationFee?: number
  creatorTradingFeePercentage?: number
}

export interface SdkCurveBuild {
  liquidityWeights: number[]
  /** ConfigParameters returned by the SDK. */
  params: unknown
  curvePoints: number
  validation: 'not-run' | 'passed'
  warnings: string[]
}

export async function buildSdkCurveParameters(
  plan: DbcPlan,
  inputs: SdkCurveInputs,
): Promise<SdkCurveBuild> {
  const sdk = await import('@meteora-ag/dynamic-bonding-curve-sdk')
  const warnings: string[] = []

  // The SDK's curve builder always produces MAX_CURVE_POINT (16) segments, so an
  // Auctra policy with fewer segments is resampled onto 16 by linear
  // interpolation of the normalised weight profile.
  const liquidityWeights = resampleWeights(plan.liquidityWeightsRelative, sdk.MAX_CURVE_POINT)
  if (plan.liquidityWeightsRelative.length !== sdk.MAX_CURVE_POINT) {
    warnings.push(
      `Auctra policy used ${plan.liquidityWeightsRelative.length} segments; resampled to the SDK's ${sdk.MAX_CURVE_POINT} curve segments`,
    )
  }

  // The SDK models a decaying fee schedule through numberOfPeriod/totalDuration
  // whose units we have not confirmed for activationType = Timestamp, so we keep
  // the schedule constant here and surface that limitation.
  warnings.push(
    'fee schedule is built with a constant base fee (numberOfPeriod 0); the decaying schedule needs confirmed period units',
  )

  const poolFeeBps = Math.min(1000, Math.max(10, plan.feePolicy.startingFeeBps))

  const params = sdk.buildCurveWithLiquidityWeights({
    token: {
      tokenType: sdk.TokenType.Token2022,
      tokenBaseDecimal: inputs.tokenBaseDecimal as never,
      tokenQuoteDecimal: inputs.tokenQuoteDecimal as never,
      tokenAuthorityOption: sdk.TokenAuthorityOption.Immutable,
      totalTokenSupply: inputs.totalTokenSupply,
      leftover: inputs.leftover ?? 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode:
          plan.feePolicy.mode === 'exponential'
            ? sdk.BaseFeeMode.FeeSchedulerExponential
            : sdk.BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
          startingFeeBps: plan.feePolicy.startingFeeBps,
          endingFeeBps: plan.feePolicy.startingFeeBps,
          numberOfPeriod: 0,
          totalDuration: 0,
        },
      },
      dynamicFeeEnabled: true,
      collectFeeMode: sdk.CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: inputs.creatorTradingFeePercentage ?? 0,
      poolCreationFee: inputs.poolCreationFee ?? 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: sdk.MigrationOption.MET_DAMM_V2,
      migrationFeeOption: sdk.MigrationFeeOption.Customizable,
      migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
      migratedPoolFee: {
        collectFeeMode: sdk.MigratedCollectFeeMode.QuoteToken,
        dynamicFee: sdk.DammV2DynamicFeeMode.Enabled,
        poolFeeBps,
      },
    },
    liquidityDistribution: {
      // The SDK requires at least 1000 bps (10%) locked at day 1, so a quarter of
      // the graduated liquidity is permanently locked.
      partnerPermanentLockedLiquidityPercentage: 25,
      partnerLiquidityPercentage: 25,
      creatorPermanentLockedLiquidityPercentage: 25,
      creatorLiquidityPercentage: 25,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: sdk.ActivationType.Timestamp,
    initialMarketCap: inputs.initialMarketCap,
    migrationMarketCap: inputs.migrationMarketCap,
    liquidityWeights,
  })

  const curvePoints = params.curve.length

  let validation: SdkCurveBuild['validation'] = 'not-run'
  const accepted = sdk.validateCurve(params.curve, params.sqrtStartPrice)
  if (!accepted) {
    warnings.push('curve: the SDK validateCurve check rejected the generated curve')
  } else {
    validation = 'passed'
  }

  return {
    liquidityWeights,
    params,
    curvePoints,
    validation,
    warnings,
  }
}

/** Linear resample of a normalised weight profile onto `target` segments. */
export function resampleWeights(weights: number[], target: number): number[] {
  if (weights.length === target) return [...weights]
  if (weights.length <= 1) return Array.from({ length: target }, () => weights[0] ?? 1)
  return Array.from({ length: target }, (_, index) => {
    const position = (index * (weights.length - 1)) / (target - 1)
    const low = Math.floor(position)
    const high = Math.min(weights.length - 1, low + 1)
    const fraction = position - low
    return weights[low] * (1 - fraction) + weights[high] * fraction
  })
}
