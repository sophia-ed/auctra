import { Decimal, dec, type DecimalInput } from './decimal'

export const BPS_DENOMINATOR = new Decimal(10000)
export const ZERO = new Decimal(0)
export const ONE = new Decimal(1)

/** `numerator / denominator` expressed in basis points. */
export function ratioToBps(numerator: DecimalInput, denominator: DecimalInput): Decimal {
  const n = dec(numerator)
  const den = dec(denominator)
  if (den.isZero()) throw new Error('ratioToBps: denominator is zero')
  return n.div(den).times(BPS_DENOMINATOR)
}

export function bpsToRatio(bps: DecimalInput): Decimal {
  return dec(bps).div(BPS_DENOMINATOR)
}

export function clampDecimal(value: DecimalInput, min: DecimalInput, max: DecimalInput): Decimal {
  const v = dec(value)
  const lo = dec(min)
  const hi = dec(max)
  if (lo.gt(hi)) throw new Error('clampDecimal: min > max')
  if (v.lt(lo)) return lo
  if (v.gt(hi)) return hi
  return v
}

export function clamp01(value: DecimalInput): Decimal {
  return clampDecimal(value, ZERO, ONE)
}
