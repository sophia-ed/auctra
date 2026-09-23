import { Decimal, dec, type DecimalInput } from '../math/decimal'

/**
 * Normalized conversion specification (AUCTRA.md Section 19).
 *
 * A conversion is only "verified" when a positive ratio, a source URL and a
 * verification timestamp are all present. Anything less is UNKNOWN and must be
 * displayed as such — never guessed.
 */
export interface ConversionSpec {
  sourceAssetMint: string
  targetAssetMint: string
  ratioNumerator: Decimal
  ratioDenominator: Decimal
  effectiveAt?: string
  deadline?: string
  sourceUrl: string
  verifiedAt: string
}

export interface ConversionInput {
  sourceAssetMint: string
  targetAssetMint: string
  ratioNumerator: DecimalInput
  ratioDenominator: DecimalInput
  effectiveAt?: string
  deadline?: string
  sourceUrl: string
  verifiedAt: string
}

export function makeConversionSpec(input: ConversionInput): ConversionSpec {
  return {
    sourceAssetMint: input.sourceAssetMint,
    targetAssetMint: input.targetAssetMint,
    ratioNumerator: dec(input.ratioNumerator),
    ratioDenominator: dec(input.ratioDenominator),
    effectiveAt: input.effectiveAt,
    deadline: input.deadline,
    sourceUrl: input.sourceUrl,
    verifiedAt: input.verifiedAt,
  }
}

export function conversionRatio(spec: ConversionSpec): Decimal {
  if (spec.ratioDenominator.isZero()) {
    throw new Error('conversionRatio: denominator is zero')
  }
  return spec.ratioNumerator.div(spec.ratioDenominator)
}

export function isConversionVerified(spec: ConversionSpec | undefined): spec is ConversionSpec {
  if (!spec) return false
  return (
    spec.ratioDenominator.gt(0) &&
    spec.ratioNumerator.gt(0) &&
    spec.sourceUrl.length > 0 &&
    spec.verifiedAt.length > 0
  )
}

export function describeConversion(
  spec: ConversionSpec,
  sourceSymbol = 'SOURCE',
  targetSymbol = 'TARGET',
): string {
  const ratio = conversionRatio(spec)
  return `1 ${sourceSymbol} TOKEN → ${ratio.toString()} ${targetSymbol} TOKENS`
}

export const CONVERSION_RATIO_UNKNOWN = 'UNKNOWN' as const

export function unknownConversion(reason: string): { status: 'UNKNOWN'; reason: string } {
  return { status: 'UNKNOWN', reason }
}
