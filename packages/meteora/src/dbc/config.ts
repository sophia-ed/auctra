import { Decimal, type DbcPlan } from '@auctra/domain'
import { MAX_CURVE_SEGMENTS } from '@auctra/domain'

/**
 * Enumerations recorded from the current DBC SDK docs
 * (docs/research/2026-09-23-meteora-dbc.md). Values must be confirmed against
 * the installed `dist/index.d.ts` / IDL before deployment (Section 31).
 */
export const BaseFeeMode = {
  FeeSchedulerLinear: 0,
  FeeSchedulerExponential: 1,
  /** Deprecated for new configs. Auctra never emits this. */
  RateLimiter: 2,
} as const

export const MigrationOption = {
  MET_DAMM_V1: 0,
  MET_DAMM_V2: 1,
} as const

export const ActivationType = {
  Slot: 0,
  Timestamp: 1,
} as const

export const CollectFeeMode = {
  QuoteToken: 0,
  OutputToken: 1,
} as const

export const TokenType = {
  SPLToken: 0,
  Token2022: 1,
} as const

export const MigrationFeeOption = {
  FixedBps25: 0,
  FixedBps30: 1,
  FixedBps100: 2,
  FixedBps200: 3,
  FixedBps400: 4,
  FixedBps600: 5,
  Customizable: 6,
} as const

export const PROTOCOL_CONSTRAINTS = {
  MAX_CURVE_POINT: 16,
  MIN_TOKEN_DECIMALS: 6,
  MAX_TOKEN_DECIMALS: 9,
  MIN_MIGRATED_POOL_FEE_BPS: 10,
  MAX_MIGRATED_POOL_FEE_BPS: 1000,
} as const

/**
 * Provisional fee denominator. Recorded from Meteora DBC conventions but NOT
 * confirmed against the IDL — see the warning emitted by `toFeeParams`. Kept as
 * an explicit exported constant so it is easy to correct in one place.
 */
export const PROVISIONAL_FEE_DENOMINATOR = '1000000000'

export interface ValidationIssue {
  code: string
  message: string
}

/** Validate a domain DbcPlan against recorded protocol constraints. */
export function validateDbcPlan(plan: DbcPlan): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (plan.segments < 2 || plan.segments > PROTOCOL_CONSTRAINTS.MAX_CURVE_POINT) {
    issues.push({
      code: 'SEGMENTS_OUT_OF_RANGE',
      message: `segments ${plan.segments} must be between 2 and ${PROTOCOL_CONSTRAINTS.MAX_CURVE_POINT}`,
    })
  }

  if (plan.pricePoints.length !== plan.segments) {
    issues.push({
      code: 'PRICE_POINT_COUNT',
      message: 'pricePoints length must equal segments',
    })
  }

  for (let i = 0; i < plan.pricePoints.length; i += 1) {
    if (!plan.pricePoints[i].gt(0)) {
      issues.push({ code: 'NON_POSITIVE_PRICE', message: `price point ${i} is not positive` })
    }
    if (i > 0 && !plan.pricePoints[i].gt(plan.pricePoints[i - 1])) {
      issues.push({ code: 'PRICES_NOT_ASCENDING', message: 'price points must be strictly ascending' })
    }
  }

  const weightSum = plan.liquidityWeights.reduce((sum, weight) => sum.plus(weight), new Decimal(0))
  if (!weightSum.gt(0) || weightSum.minus(1).abs().gt('0.000000001')) {
    issues.push({
      code: 'WEIGHTS_NOT_NORMALIZED',
      message: `liquidity weights must sum to 1 (got ${weightSum.toFixed(12)})`,
    })
  }

  if (plan.migrationOption !== 'MET_DAMM_V2') {
    issues.push({
      code: 'MIGRATION_OPTION_NOT_DAMM_V2',
      message: 'new configs must use DAMM v2 migration',
    })
  }

  if (plan.activationType !== 'Timestamp') {
    issues.push({ code: 'ACTIVATION_NOT_TIMESTAMP', message: 'Auctra uses timestamp activation' })
  }

  if (!plan.migrationQuoteThreshold.gt(0)) {
    issues.push({
      code: 'MIGRATION_THRESHOLD_NOT_POSITIVE',
      message: 'migrationQuoteThreshold must be greater than zero',
    })
  }

  if (plan.feePolicy.startingFeeBps > PROTOCOL_CONSTRAINTS.MAX_MIGRATED_POOL_FEE_BPS) {
    issues.push({
      code: 'STARTING_FEE_TOO_HIGH',
      message: `startingFeeBps ${plan.feePolicy.startingFeeBps} exceeds ${PROTOCOL_CONSTRAINTS.MAX_MIGRATED_POOL_FEE_BPS}`,
    })
  }

  return issues
}

export interface CurveBuilderParams {
  /** Relative weights for `buildCurveWithLiquidityWeights` (max 16). */
  liquidityWeights: number[]
  activationType: number
  migrationOption: number
  collectFeeMode: number
  tokenType: number
  migrationQuoteThreshold: string
  quoteMint: string
  liquidityWeightsRelative: number[]
  initialMarketCap: string
  migrationMarketCap: string
  warnings: string[]
}

export interface CurveBuilderInputs {
  initialMarketCap: string
  migrationMarketCap: string
  tokenDecimal: number
}

/**
 * Map an Auctra DbcPlan onto the parameters consumed by the SDK's
 * `buildCurveWithLiquidityWeights` helper (Section 24/25).
 *
 * Auctra does not hand-build curve points; the SDK's helper owns that math. We
 * supply the normalized weights, the market-cap anchors and the activation.
 */
export function toCurveBuilderParams(plan: DbcPlan, inputs: CurveBuilderInputs): CurveBuilderParams {
  const warnings: string[] = []
  if (
    inputs.tokenDecimal < PROTOCOL_CONSTRAINTS.MIN_TOKEN_DECIMALS ||
    inputs.tokenDecimal > PROTOCOL_CONSTRAINTS.MAX_TOKEN_DECIMALS
  ) {
    warnings.push(
      `tokenDecimal ${inputs.tokenDecimal} is outside ${PROTOCOL_CONSTRAINTS.MIN_TOKEN_DECIMALS}-${PROTOCOL_CONSTRAINTS.MAX_TOKEN_DECIMALS}`,
    )
  }
  if (plan.segments > PROTOCOL_CONSTRAINTS.MAX_CURVE_POINT) {
    warnings.push('segment count exceeds the DBC maximum')
  }
  warnings.push(
    'verify `liquidityWeights` scaling against the installed SDK before deployment (constraints documented, scale unconfirmed)',
  )

  return {
    liquidityWeights: plan.liquidityWeightsRelative,
    activationType: ActivationType.Timestamp,
    migrationOption: MigrationOption.MET_DAMM_V2,
    collectFeeMode: CollectFeeMode[plan.collectFeeMode],
    tokenType: TokenType[plan.tokenType],
    migrationQuoteThreshold: plan.migrationQuoteThreshold.toFixed(0),
    quoteMint: plan.quoteMint,
    liquidityWeightsRelative: plan.liquidityWeightsRelative,
    initialMarketCap: inputs.initialMarketCap,
    migrationMarketCap: inputs.migrationMarketCap,
    warnings,
  }
}

export interface FeeParams {
  cliffFeeNumerator: string
  baseFeeMode: number
  firstFactor: number
  secondFactor: string
  thirdFactor: string
  warnings: string[]
}

/** Map the Auctra fee policy onto DBC fee-scheduler params. */
export function toFeeParams(plan: DbcPlan): FeeParams {
  const baseFeeMode =
    plan.feePolicy.mode === 'exponential'
      ? BaseFeeMode.FeeSchedulerExponential
      : BaseFeeMode.FeeSchedulerLinear

  const cliffFeeNumerator = new Decimal(plan.feePolicy.startingFeeBps)
    .div(10000)
    .times(PROVISIONAL_FEE_DENOMINATOR)
    .toFixed(0)

  // Hourly periods by default; the exact period schedule must be confirmed.
  const numberOfPeriod = Math.max(1, Math.round(plan.feePolicy.durationSeconds / 3600))

  return {
    cliffFeeNumerator,
    baseFeeMode,
    firstFactor: numberOfPeriod,
    secondFactor: '3600',
    thirdFactor: '0',
    warnings: [
      'PROVISIONAL_FEE_DENOMINATOR is unconfirmed against the IDL; verify fee numerator scaling before deployment',
      'fee-scheduler period units (ms vs seconds) must be confirmed for activationType = Timestamp',
    ],
  }
}

export { MAX_CURVE_SEGMENTS }
