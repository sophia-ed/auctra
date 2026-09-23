import { describe, expect, it } from 'vitest'
import {
  MAX_CURVE_SEGMENTS,
  buildTransitionCurve,
  computeEventIntensity,
  computeFeePolicy,
  type CurveMode,
} from '../index'

const MODES: CurveMode[] = ['REFERENCE_CENTERED', 'TRANSITION_WIDE', 'EVENT_ADAPTIVE']

describe('transition curve mathematics (Sections 25, 77)', () => {
  for (const mode of MODES) {
    it(`produces ordered prices and normalized positive weights (${mode})`, () => {
      const curve = buildTransitionCurve({
        referencePrice: '150',
        referenceConfidenceBps: '40',
        currentPremiumBps: '200',
        eventIntensity: '0.7',
        mode,
        segments: 8,
        liquidityTarget: '100000',
      })

      // prices strictly ordered
      for (let i = 1; i < curve.points.length; i += 1) {
        expect(curve.points[i].price.gt(curve.points[i - 1].price)).toBe(true)
      }
      // weights positive and sum to 1
      const sum = curve.points.reduce((acc, point) => acc.plus(point.weight), curve.points[0].price.minus(curve.points[0].price))
      expect(sum.toFixed(12)).toBe('1.000000000000')
      for (const point of curve.points) {
        expect(point.weight.gt(0)).toBe(true)
      }
      // reference lies inside the range
      const min = curve.points[0].price
      const max = curve.points[curve.points.length - 1].price
      expect(curve.referencePrice.gte(min)).toBe(true)
      expect(curve.referencePrice.lte(max)).toBe(true)
    })
  }

  it('clamps segments to the DBC maximum', () => {
    const curve = buildTransitionCurve({
      referencePrice: '150',
      eventIntensity: '0.5',
      mode: 'TRANSITION_WIDE',
      segments: 64,
      liquidityTarget: '1000',
    })
    expect(curve.points.length).toBe(MAX_CURVE_SEGMENTS)
  })

  it('is deterministic for identical inputs', () => {
    const build = () =>
      buildTransitionCurve({
        referencePrice: '150',
        referenceConfidenceBps: '10',
        eventIntensity: '0.4',
        mode: 'EVENT_ADAPTIVE',
        segments: 10,
        liquidityTarget: '50000',
      })
    expect(build().points.map((p) => p.weight.toFixed(18))).toEqual(
      build().points.map((p) => p.weight.toFixed(18)),
    )
  })
})

describe('event intensity (Section 26)', () => {
  it('stays within [0, 1] and rises as the deadline approaches', () => {
    const far = computeEventIntensity({
      eventType: 'IPO',
      eventConfidence: 0.9,
      deadlineDistanceSeconds: 365 * 86400,
    })
    const near = computeEventIntensity({
      eventType: 'IPO',
      eventConfidence: 0.9,
      deadlineDistanceSeconds: 2 * 86400,
    })
    expect(far.intensity.gte(0)).toBe(true)
    expect(far.intensity.lte(1)).toBe(true)
    expect(near.intensity.gt(far.intensity)).toBe(true)
    expect(far.explanation.length).toBeGreaterThan(0)
  })
})

describe('fee policy (Section 27)', () => {
  it('keeps fees within protocol-safe bounds', () => {
    for (const intensity of ['0', '0.5', '1']) {
      const policy = computeFeePolicy({
        eventIntensity: intensity,
        referenceConfidenceBps: '80',
        deadlineDistanceSeconds: 3 * 86400,
      })
      expect(policy.startingFeeBps).toBeGreaterThanOrEqual(10)
      expect(policy.startingFeeBps).toBeLessThanOrEqual(1000)
      expect(policy.endingFeeBps).toBeLessThanOrEqual(policy.startingFeeBps)
      expect(policy.durationSeconds).toBeGreaterThan(0)
      expect(['linear', 'exponential']).toContain(policy.mode)
    }
  })

  it('uses an exponential schedule at high intensity', () => {
    const policy = computeFeePolicy({ eventIntensity: '0.9' })
    expect(policy.mode).toBe('exponential')
  })
})
