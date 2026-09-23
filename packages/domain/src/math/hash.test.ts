import { describe, expect, it } from 'vitest'
import { Decimal, canonicalize, hashValue } from '../index'

describe('canonical hashing (Section 47)', () => {
  it('sorts object keys', () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe(canonicalize({ a: 2, b: 1 }))
  })

  it('is stable across numeric representations', () => {
    expect(canonicalize({ v: new Decimal('1.5') })).toBe(canonicalize({ v: 1.5 }))
  })

  it('omits undefined optional members', () => {
    expect(canonicalize({ a: 1, b: undefined })).toBe(canonicalize({ a: 1 }))
  })

  it('preserves array order', () => {
    expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]))
  })

  it('produces a stable sha-256', () => {
    expect(hashValue({ a: 1 })).toBe(hashValue({ a: 1 }))
    expect(hashValue({ a: 1 })).toMatch(/^[0-9a-f]{64}$/)
  })
})
