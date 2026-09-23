import { describe, expect, it } from 'vitest'
import { computePremium, computeTransitionGap } from '../index'

describe('premium engine (Section 7)', () => {
  it('reports a mark premium in basis points', () => {
    const result = computePremium({ tokenPrice: '153', markPrice: '150' })
    expect(result.tokenPremiumBps.toFixed(0)).toBe('200')
    expect(result.tokenLabel).toBe('MARK_PREMIUM')
  })

  it('reports a mark discount in basis points', () => {
    const result = computePremium({ tokenPrice: '147', markPrice: '150' })
    expect(result.tokenPremiumBps.toFixed(0)).toBe('-200')
    expect(result.tokenLabel).toBe('MARK_DISCOUNT')
  })

  it('labels the neutral band as AT_MARK', () => {
    const result = computePremium({ tokenPrice: '150.1', markPrice: '150', neutralBandBps: '10' })
    expect(result.tokenLabel).toBe('AT_MARK')
  })
})

describe('transition gap (Section 18)', () => {
  it('is NOT COMPUTABLE without a target reference or ratio', () => {
    const gap = computeTransitionGap({ sourceReference: '112.5' })
    expect(gap.status).toBe('NOT_COMPUTABLE')
    expect(gap.missingInputs).toEqual(['targetReference', 'conversionRatio'])
    expect(gap.absoluteGap).toBeUndefined()
  })

  it('computes a gap when both inputs exist', () => {
    const gap = computeTransitionGap({
      sourceReference: '112.5',
      targetReference: '100',
      conversionRatio: '1',
    })
    expect(gap.status).toBe('COMPUTABLE')
    expect(gap.impliedTargetValue?.toFixed(4)).toBe('112.5000')
    expect(gap.absoluteGap?.toFixed(4)).toBe('12.5000')
    expect(gap.gapBps).toBeCloseTo(1250, 6)
  })

  it('handles the real xAI -> SPACEX conversion semantics', () => {
    // 1 source unit converts to 0.7165 target units. The engine applies
    // impliedTargetValue = sourceReference * conversionRatio, so the caller is
    // responsible for supplying a sourceReference already normalised into the
    // target's units (Section 52). Here: 100 source units -> 71.65 target units.
    const gap = computeTransitionGap({
      sourceReference: '100',
      targetReference: '153.46590420780728',
      conversionRatio: '0.7165',
    })
    expect(gap.status).toBe('COMPUTABLE')
    expect(gap.impliedTargetValue?.toFixed(4)).toBe('71.6500')
    expect(gap.absoluteGap?.toFixed(4)).toBe('-81.8159')
  })
})
