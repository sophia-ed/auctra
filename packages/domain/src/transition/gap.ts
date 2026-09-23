import { Decimal, dec, type DecimalInput } from '../math/decimal'
import { ratioToBps } from '../math/bps'

/**
 * Transition gap (AUCTRA.md Section 18).
 *
 * A gap is only COMPUTABLE when a target reference AND a verified conversion
 * ratio are both available. Otherwise it is NOT_COMPUTABLE and lists exactly
 * what is missing. No value is ever fabricated.
 */
export interface TransitionGapInput {
  sourceReference: DecimalInput
  targetReference?: DecimalInput
  conversionRatio?: DecimalInput
  confidenceBps?: number
  deadlineDistanceSeconds?: number
  marketSession?: string
  liquidityNote?: string
}

export interface TransitionGap {
  status: 'COMPUTABLE' | 'NOT_COMPUTABLE'
  missingInputs: string[]
  sourceReference: Decimal
  targetReference?: Decimal
  conversionRatio?: Decimal
  impliedTargetValue?: Decimal
  absoluteGap?: Decimal
  gapBps?: number
  gapBpsExact?: Decimal
  deadlineDistanceSeconds?: number
  confidenceBps?: number
  marketSession?: string
  liquidityNote?: string
}

export function computeTransitionGap(input: TransitionGapInput): TransitionGap {
  const sourceReference = dec(input.sourceReference)
  const missingInputs: string[] = []

  if (input.targetReference === undefined) missingInputs.push('targetReference')
  if (input.conversionRatio === undefined) missingInputs.push('conversionRatio')

  const base = {
    sourceReference,
    targetReference: input.targetReference === undefined ? undefined : dec(input.targetReference),
    conversionRatio: input.conversionRatio === undefined ? undefined : dec(input.conversionRatio),
    deadlineDistanceSeconds: input.deadlineDistanceSeconds,
    confidenceBps: input.confidenceBps,
    marketSession: input.marketSession,
    liquidityNote: input.liquidityNote,
  }

  if (missingInputs.length > 0) {
    return { status: 'NOT_COMPUTABLE', missingInputs, ...base }
  }

  const targetReference = dec(input.targetReference as DecimalInput)
  const conversion = dec(input.conversionRatio as DecimalInput)

  if (!targetReference.gt(0)) {
    return {
      status: 'NOT_COMPUTABLE',
      missingInputs: ['targetReference must be positive'],
      ...base,
    }
  }
  if (!conversion.gt(0)) {
    return {
      status: 'NOT_COMPUTABLE',
      missingInputs: ['conversionRatio must be positive'],
      ...base,
    }
  }

  const impliedTargetValue = sourceReference.times(conversion)
  const absoluteGap = impliedTargetValue.minus(targetReference)
  const gapBpsExact = ratioToBps(absoluteGap, targetReference)

  return {
    status: 'COMPUTABLE',
    missingInputs: [],
    ...base,
    impliedTargetValue,
    absoluteGap,
    gapBpsExact,
    gapBps: gapBpsExact.toNumber(),
  }
}
