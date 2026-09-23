import { Decimal } from '../math/decimal'

/**
 * Recursively convert a value into something `JSON.stringify` can emit with
 * full decimal precision: Decimals become strings, arrays/objects recurse.
 */
export function toJsonValue(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null
  if (value instanceof Decimal) return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(toJsonValue)
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, member] of Object.entries(value as Record<string, unknown>)) {
      if (member === undefined) continue
      out[key] = toJsonValue(member)
    }
    return out
  }
  return value
}

/** Stable pretty-printed JSON export. */
export function toPrettyJson(value: unknown): string {
  return JSON.stringify(toJsonValue(value), null, 2)
}
