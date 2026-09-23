import { describe, expect, it } from 'vitest'
import {
  Decimal,
  buildTransitionCurve,
  compareToBaseline,
  getScenarioPreset,
  simulateSequence,
  type SimulationConfig,
  type TradeSequence,
} from '../index'

function configFromCurve(
  id: string,
  mode: 'REFERENCE_CENTERED' | 'TRANSITION_WIDE' | 'EVENT_ADAPTIVE',
  feeBps: number,
  threshold: string,
): SimulationConfig {
  const curve = buildTransitionCurve({
    referencePrice: '150',
    referenceConfidenceBps: '20',
    currentPremiumBps: '150',
    eventIntensity: '0.7',
    mode,
    segments: 8,
    liquidityTarget: threshold,
  })
  return {
    id,
    referencePrice: new Decimal('150'),
    migrationQuoteThreshold: new Decimal(threshold),
    feeBps,
    curve: {
      pricePoints: curve.points.map((point) => point.price),
      weights: curve.points.map((point) => point.weight),
      referencePrice: new Decimal('150'),
    },
  }
}

const sequence: TradeSequence = {
  id: 'test-seq',
  instructions: [
    { side: 'BUY', quoteAmount: new Decimal('1000') },
    { side: 'BUY', quoteAmount: new Decimal('2500') },
    { side: 'SELL', quoteAmount: new Decimal('1500') },
    { side: 'BUY', quoteAmount: new Decimal('5000') },
  ],
}

describe('simulation engine (Sections 36, 38, 80)', () => {
  it('is deterministic', () => {
    const config = configFromCurve('auctra', 'EVENT_ADAPTIVE', 140, '200000')
    const first = simulateSequence(config, sequence)
    const second = simulateSequence(config, sequence)
    expect(first.finalPrice.toFixed(18)).toBe(second.finalPrice.toFixed(18))
    expect(first.trades.length).toBe(sequence.instructions.length)
  })

  it('marks everything as SIMULATED and states its assumptions', () => {
    const result = simulateSequence(configFromCurve('a', 'TRANSITION_WIDE', 120, '200000'), sequence)
    expect(result.provenance).toBe('SIMULATED')
    expect(result.assumptions.length).toBeGreaterThan(0)
  })

  it('compares baseline and Auctra with identical sequences without declaring a winner', () => {
    const auctra = configFromCurve('auctra', 'EVENT_ADAPTIVE', 140, '200000')
    const baseline = configFromCurve('baseline', 'TRANSITION_WIDE', 120, '200000')
    const comparison = compareToBaseline(auctra, baseline, sequence)
    expect(comparison.auctra.trades.length).toBe(comparison.baseline.trades.length)
    expect(Number.isFinite(comparison.deltas.averageSlippageBps)).toBe(true)
    expect(comparison.note).toContain('No winner')
  })

  it('reports migration readiness when the threshold is reached', () => {
    const config = configFromCurve('small', 'REFERENCE_CENTERED', 100, '1000')
    const result = simulateSequence(config, sequence)
    expect(result.finalCurveProgress).toBeGreaterThan(0)
    expect(result.migrationReady).toBe(true)
  })

  it('exposes all nine transition scenarios', () => {
    const scenarios = [
      'NORMAL',
      'IPO_ANNOUNCED',
      'IPO_IMMINENT',
      'PUBLIC_MARKET_OPENS',
      'PUBLIC_MARKET_PRICE_GAP',
      'HIGH_REFERENCE_UNCERTAINTY',
      'CONVERSION_DEADLINE_APPROACHING',
      'ACQUISITION_EVENT',
      'NO_TARGET_ASSET',
    ] as const
    for (const id of scenarios) {
      expect(getScenarioPreset(id).sequence.instructions.length).toBeGreaterThan(0)
    }
  })
})
