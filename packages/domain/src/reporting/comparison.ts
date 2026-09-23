import { Decimal, dec, type DecimalInput } from '../math/decimal'
import { ratioToBps } from '../math/bps'

/**
 * Pyth price comparison (AUCTRA.md Section 52).
 *
 * A PreStock-derived state is never compared directly to a public reference.
 * A verified conversion must be supplied first, and the transformation is
 * displayed explicitly. Without one, the comparison is UNAVAILABLE.
 */
export interface ReferenceComparison {
  status: 'COMPARABLE' | 'UNAVAILABLE'
  reason?: string
  transformation?: string
  sourceValue?: Decimal
  conversionRatio?: Decimal
  normalizedSourceValue?: Decimal
  targetReference?: Decimal
  difference?: Decimal
  differenceBps?: number
}

export interface ReferenceComparisonInput {
  sourceValue: DecimalInput
  sourceSymbol?: string
  conversionRatio?: DecimalInput
  targetReference?: DecimalInput
  targetSymbol?: string
}

export function buildReferenceComparison(input: ReferenceComparisonInput): ReferenceComparison {
  const missing: string[] = []
  if (input.conversionRatio === undefined) missing.push('conversionRatio')
  if (input.targetReference === undefined) missing.push('targetReference')

  if (missing.length > 0) {
    return {
      status: 'UNAVAILABLE',
      reason: `Comparison unavailable: ${missing.join(' and ')} required to normalize units`,
    }
  }

  const sourceValue = dec(input.sourceValue)
  const ratio = dec(input.conversionRatio as DecimalInput)
  const target = dec(input.targetReference as DecimalInput)

  if (!ratio.gt(0) || !target.gt(0)) {
    return {
      status: 'UNAVAILABLE',
      reason: 'Comparison unavailable: conversion ratio and target reference must both be positive',
    }
  }

  const normalized = sourceValue.times(ratio)
  const difference = normalized.minus(target)

  return {
    status: 'COMPARABLE',
    transformation: `${sourceValue.toString()} ${input.sourceSymbol ?? 'SOURCE'} x ${ratio.toString()} = ${normalized.toString()} ${input.targetSymbol ?? 'TARGET'}`,
    sourceValue,
    conversionRatio: ratio,
    normalizedSourceValue: normalized,
    targetReference: target,
    difference,
    differenceBps: ratioToBps(difference, target).toNumber(),
  }
}
