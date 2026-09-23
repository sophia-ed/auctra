import { createHash } from 'node:crypto'
import { Decimal } from './decimal'

const SCALE = 18

/** Canonical fixed-point string for any decimal-like value. */
export function canonicalDecimal(value: Decimal | number | string): string {
  const v = value instanceof Decimal ? value : new Decimal(value)
  if (!v.isFinite()) throw new Error('canonicalDecimal: non-finite value')
  const normalised = v.isZero() ? new Decimal(0) : v
  return normalised.toFixed(SCALE, Decimal.ROUND_HALF_UP)
}

/**
 * Deterministic canonical JSON-like serialisation (AUCTRA.md Section 47).
 *
 * - object keys are sorted
 * - `undefined` members are omitted (so an absent optional field hashes the same
 *   as one explicitly set to undefined)
 * - numbers and Decimals are emitted as fixed-scale decimal strings, never floats
 * - arrays preserve order; callers must sort arrays that are semantically unordered
 */
export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') return canonicalDecimal(value)
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Decimal) return canonicalDecimal(value)
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj)
      .filter((key) => obj[key] !== undefined)
      .sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(obj[key])}`).join(',')}}`
  }
  throw new Error(`canonicalize: unsupported type ${typeof value}`)
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

export function hashValue(value: unknown): string {
  return sha256Hex(canonicalize(value))
}
