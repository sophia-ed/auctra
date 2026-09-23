import { Decimal, dec, type DecimalInput } from '../math/decimal'
import type { TransitionCurve, CurveMode } from './curve'
import { MAX_CURVE_SEGMENTS } from './curve'
import type { DbcFeePolicy } from './fees'
import type { ActivationPlan } from './activation'

/**
 * Auctra's protocol-agnostic DBC plan.
 *
 * This is the policy output. The Meteora adapter (@auctra/meteora) maps it onto
 * the current SDK's ConfigParameters. Keeping the plan protocol-agnostic here
 * means the domain never depends on the SDK (AUCTRA.md Section 61).
 */
export interface DbcPlan {
  curveMode: CurveMode
  segments: number
  pricePoints: Decimal[]
  sqrtPrices: Decimal[]
  /** normalized, sum to 1 */
  liquidityWeights: Decimal[]
  /** relative weights (average 1); the SDK's exact scale must be verified */
  liquidityWeightsRelative: number[]
  feePolicy: DbcFeePolicy
  activation: ActivationPlan
  quoteMint: string
  migrationQuoteThreshold: Decimal
  migrationOption: 'MET_DAMM_V2'
  collectFeeMode: 'QuoteToken' | 'OutputToken'
  tokenType: 'SPLToken' | 'Token2022'
  activationType: 'Timestamp'
  warnings: string[]
}

export interface DbcPlanInput {
  curve: TransitionCurve
  feePolicy: DbcFeePolicy
  activation: ActivationPlan
  quoteMint: string
  migrationQuoteThreshold: DecimalInput
  collectFeeMode?: 'QuoteToken' | 'OutputToken'
  tokenType?: 'SPLToken' | 'Token2022'
}

export function buildDbcPlan(input: DbcPlanInput): DbcPlan {
  const migrationQuoteThreshold = dec(input.migrationQuoteThreshold)
  const warnings: string[] = []

  if (input.curve.segments > MAX_CURVE_SEGMENTS) {
    warnings.push(`segments ${input.curve.segments} exceeds the DBC maximum of ${MAX_CURVE_SEGMENTS}`)
  }
  if (!migrationQuoteThreshold.gt(0)) {
    warnings.push('migrationQuoteThreshold must be greater than zero for a DBC config')
  }
  if (input.feePolicy.startingFeeBps > 1000) {
    warnings.push('startingFeeBps exceeds 1000; verify against the current protocol fee limits')
  }
  if (input.feePolicy.mode === 'exponential' && input.feePolicy.endingFeeBps >= input.feePolicy.startingFeeBps) {
    warnings.push('exponential fee schedule expects the ending fee to be below the starting fee')
  }

  const liquidityWeights = input.curve.points.map((point) => point.weight)

  return {
    curveMode: input.curve.mode,
    segments: input.curve.segments,
    pricePoints: input.curve.points.map((point) => point.price),
    sqrtPrices: input.curve.points.map((point) => point.price.sqrt()),
    liquidityWeights,
    liquidityWeightsRelative: liquidityWeights.map((weight) => weight.times(input.curve.segments).toNumber()),
    feePolicy: input.feePolicy,
    activation: input.activation,
    quoteMint: input.quoteMint,
    migrationQuoteThreshold,
    migrationOption: 'MET_DAMM_V2',
    collectFeeMode: input.collectFeeMode ?? 'QuoteToken',
    tokenType: input.tokenType ?? 'SPLToken',
    activationType: 'Timestamp',
    warnings,
  }
}
