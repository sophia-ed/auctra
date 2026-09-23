import { Decimal, dec, type DecimalInput } from '../math/decimal'
import { clamp01, clampDecimal } from '../math/bps'
import { explain, type PolicyExplanation } from './explanation'

export type CurveMode = 'REFERENCE_CENTERED' | 'TRANSITION_WIDE' | 'EVENT_ADAPTIVE'

export const CURVE_MODES: readonly CurveMode[] = [
  'REFERENCE_CENTERED',
  'TRANSITION_WIDE',
  'EVENT_ADAPTIVE',
]

/** DBC supports at most 16 curve points. Auctra never exceeds this. */
export const MAX_CURVE_SEGMENTS = 16
export const MIN_CURVE_SEGMENTS = 2

/** Confidence in bps at which reference uncertainty is treated as saturated. */
const CONFIDENCE_SATURATION_BPS = 100

export interface TransitionCurveInput {
  referencePrice: DecimalInput
  referenceConfidenceBps?: DecimalInput
  currentPremiumBps?: DecimalInput
  eventIntensity: DecimalInput
  mode: CurveMode
  segments: number
  liquidityTarget: DecimalInput
  spreadOverride?: DecimalInput
  bandwidthOverride?: DecimalInput
}

export interface CurvePoint {
  index: number
  price: Decimal
  distance: Decimal
  rawWeight: Decimal
  adaptiveFactor: Decimal
  adjustedWeight: Decimal
  weight: Decimal
  liquidity: Decimal
}

export interface TransitionCurve {
  mode: CurveMode
  referencePrice: Decimal
  segments: number
  spread: Decimal
  bandwidth: Decimal
  points: CurvePoint[]
  totalLiquidity: Decimal
  explanation: PolicyExplanation[]
}

/**
 * Transition Curve (AUCTRA.md Sections 22-26).
 *
 * For segment i:
 *   distance_i      = |ln(price_i / referencePrice)|
 *   rawWeight_i     = exp(-distance_i / bandwidth)
 *   adaptiveFactor_i = 1 (non-adaptive) or a directional bias (EVENT_ADAPTIVE)
 *   weight_i        = adjustedWeight_i / Σ adjustedWeight
 *
 * This describes how a DBC configuration should distribute liquidity around a
 * transition reference. It is a configuration policy, not a price peg, not a
 * fair value, and not a prediction.
 */
export function buildTransitionCurve(input: TransitionCurveInput): TransitionCurve {
  const referencePrice = dec(input.referencePrice)
  if (!referencePrice.isPositive()) {
    throw new Error('buildTransitionCurve: referencePrice must be positive')
  }

  const segments = Math.min(
    MAX_CURVE_SEGMENTS,
    Math.max(MIN_CURVE_SEGMENTS, Math.round(input.segments)),
  )
  const intensity = clamp01(input.eventIntensity)
  const premiumBps = input.currentPremiumBps === undefined ? new Decimal(0) : dec(input.currentPremiumBps)
  const confBps = input.referenceConfidenceBps === undefined ? new Decimal(0) : dec(input.referenceConfidenceBps)
  const confNorm = clamp01(confBps.div(CONFIDENCE_SATURATION_BPS))

  const baseSpread =
    input.mode === 'REFERENCE_CENTERED'
      ? new Decimal(0.25)
      : input.mode === 'TRANSITION_WIDE'
        ? new Decimal(0.6)
        : new Decimal(0.25).plus(intensity.times(0.35))

  const uncertaintyWidening = confNorm.times(0.5).plus(1)
  const spread = clampDecimal(
    input.spreadOverride ?? baseSpread.times(uncertaintyWidening),
    new Decimal('0.05'),
    new Decimal(2),
  )

  const defaultBandwidth =
    input.mode === 'REFERENCE_CENTERED'
      ? spread.div(2)
      : input.mode === 'TRANSITION_WIDE'
        ? spread.div('1.2')
        : spread.div(new Decimal(1).plus(intensity.times(2)))

  const bandwidth = clampDecimal(
    input.bandwidthOverride ?? defaultBandwidth,
    new Decimal('0.01'),
    new Decimal(5),
  )

  const step = spread.times(2).div(segments - 1)
  const direction = premiumBps.gte(0) ? 1 : -1

  const rawPoints = Array.from({ length: segments }, (_, i) => {
    const u = new Decimal(i).minus((segments - 1) / 2)
    const logOffset = u.times(step)
    const price = referencePrice.times(logOffset.exp())
    const signedDistance = price.minus(referencePrice).div(referencePrice)
    const distance = price.div(referencePrice).ln().abs()

    let adaptiveFactor = new Decimal(1)
    if (input.mode === 'EVENT_ADAPTIVE' && distance.isPositive()) {
      const sign = price.gt(referencePrice) ? 1 : -1
      const normalized = distance.div(spread)
      adaptiveFactor = clampDecimal(
        new Decimal(1).plus(intensity.times(0.5).times(direction).times(sign).times(normalized)),
        new Decimal('0.1'),
        new Decimal(10),
      )
    }

    const rawWeight = distance.div(bandwidth).neg().exp()
    const adjustedWeight = rawWeight.times(adaptiveFactor)
    return { index: i, price, distance, signedDistance, rawWeight, adaptiveFactor, adjustedWeight }
  })

  const totalAdjusted = rawPoints.reduce((sum, point) => sum.plus(point.adjustedWeight), new Decimal(0))
  const totalLiquidity = dec(input.liquidityTarget)

  const points: CurvePoint[] = rawPoints.map((point) => {
    const weight = point.adjustedWeight.div(totalAdjusted)
    return {
      index: point.index,
      price: point.price,
      distance: point.distance,
      rawWeight: point.rawWeight,
      adaptiveFactor: point.adaptiveFactor,
      adjustedWeight: point.adjustedWeight,
      weight,
      liquidity: totalLiquidity.times(weight),
    }
  })

  const hhi = points.reduce((sum, point) => sum.plus(point.weight.times(point.weight)), new Decimal(0))

  return {
    mode: input.mode,
    referencePrice,
    segments,
    spread,
    bandwidth,
    points,
    totalLiquidity,
    explanation: [
      explain(
        `mode ${input.mode}`,
        'selects the base distribution policy',
        `base log-spread ${baseSpread.toFixed(4)}`,
      ),
      explain(
        `reference confidence ${confBps.toFixed(2)} bps`,
        'widens the transition band as the reference becomes less certain',
        `spread ${spread.toFixed(4)}`,
      ),
      explain(
        `eventIntensity ${intensity.toFixed(4)}`,
        input.mode === 'EVENT_ADAPTIVE'
          ? 'concentrates liquidity and biases it toward the transition direction'
          : 'sets the distribution bandwidth',
        `bandwidth ${bandwidth.toFixed(4)}`,
      ),
      explain(
        `token premium ${premiumBps.toFixed(2)} bps`,
        'biases the adaptive curve toward the priced transition direction',
        `direction ${direction > 0 ? 'upward' : 'downward'}`,
      ),
      explain(
        'normalized weights',
        'sum to one across segments',
        `HHI concentration ${hhi.toFixed(4)}`,
      ),
    ],
  }
}
