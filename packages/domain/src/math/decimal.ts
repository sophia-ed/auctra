import Decimal from 'decimal.js'

// Deterministic decimal arithmetic. Monetary values must never be carried as
// JavaScript floats (AUCTRA.md Section 6). The precision and rounding mode are
// fixed so that identical inputs produce identical strings and therefore
// identical hashes.
Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -40,
  toExpPos: 40,
  minE: -40,
  maxE: 40,
})

export { Decimal }

export type DecimalInput = Decimal | string | number

/** Coerce to Decimal, rejecting floats that are not finite. */
export function dec(value: DecimalInput): Decimal {
  if (value instanceof Decimal) return value
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(`dec: non-finite number ${value}`)
  }
  return new Decimal(value)
}

export function isDecimal(value: unknown): value is Decimal {
  return value instanceof Decimal
}
