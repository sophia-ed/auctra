import { Decimal, dec, type DecimalInput } from '../math/decimal'
import { ratioToBps, clampDecimal, ZERO } from '../math/bps'

export type PremiumLabel = 'MARK_PREMIUM' | 'MARK_DISCOUNT' | 'AT_MARK'

export interface PremiumInput {
  tokenPrice: DecimalInput
  markPrice: DecimalInput
  impliedValuation?: DecimalInput
  markValuation?: DecimalInput
  /** Neutral band, in bps, inside which the label is AT_MARK. Default 0. */
  neutralBandBps?: DecimalInput
}

export interface PremiumResult {
  tokenPremiumBps: Decimal
  valuationPremiumBps: Decimal | null
  tokenLabel: PremiumLabel
  valuationLabel: PremiumLabel | null
}

export function labelFor(bps: Decimal, neutralBandBps: Decimal = ZERO): PremiumLabel {
  if (bps.abs().lte(neutralBandBps)) return 'AT_MARK'
  return bps.gt(0) ? 'MARK_PREMIUM' : 'MARK_DISCOUNT'
}

/**
 * Premium / discount engine (AUCTRA.md Section 7).
 *
 *   tokenPremium     = (tokenPrice - markPrice) / markPrice
 *   valuationPremium = (impliedValuation - markValuation) / markValuation
 *
 * Returned raw, in basis points. The engine deliberately uses the terms
 * MARK PREMIUM / MARK DISCOUNT / DEVIATION, never "mispricing".
 */
export function computePremium(input: PremiumInput): PremiumResult {
  const tokenPrice = dec(input.tokenPrice)
  const markPrice = dec(input.markPrice)
  const neutralBand = clampDecimal(input.neutralBandBps ?? 0, ZERO, new Decimal(1_000_000))

  if (markPrice.isZero()) throw new Error('computePremium: markPrice is zero')
  const tokenPremiumBps = ratioToBps(tokenPrice.minus(markPrice), markPrice)

  let valuationPremiumBps: Decimal | null = null
  let valuationLabel: PremiumLabel | null = null
  if (input.impliedValuation !== undefined && input.markValuation !== undefined) {
    const implied = dec(input.impliedValuation)
    const mark = dec(input.markValuation)
    if (mark.isZero()) throw new Error('computePremium: markValuation is zero')
    valuationPremiumBps = ratioToBps(implied.minus(mark), mark)
    valuationLabel = labelFor(valuationPremiumBps, neutralBand)
  }

  return {
    tokenPremiumBps,
    valuationPremiumBps,
    tokenLabel: labelFor(tokenPremiumBps, neutralBand),
    valuationLabel,
  }
}
