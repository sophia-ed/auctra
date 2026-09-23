import { describe, expect, it } from 'vitest'
import {
  buildDbcInspection,
  buildDbcPlan,
  buildLiquidityGap,
  buildReferenceComparison,
  buildTransitionCurve,
  buildTransitionTimeline,
  compileTransitionPlan,
  computeActivation,
  computeFeePolicy,
  diffDbcPlans,
  serializePolicy,
  type CurveMode,
  type DbcPlan,
} from '../index'
import type { CompileInput } from '../index'
import { LifecycleState } from '../index'
import { Decimal } from '../index'

function makePlan(mode: CurveMode = 'EVENT_ADAPTIVE', segments = 8, threshold = '100000'): DbcPlan {
  const curve = buildTransitionCurve({
    referencePrice: '150',
    referenceConfidenceBps: '20',
    eventIntensity: '0.7',
    mode,
    segments,
    liquidityTarget: threshold,
  })
  return buildDbcPlan({
    curve,
    feePolicy: computeFeePolicy({ eventIntensity: '0.7', referenceConfidenceBps: '20' }),
    activation: computeActivation({ asOf: '2026-09-23T00:00:00Z' }),
    quoteMint: 'So11111111111111111111111111111111111111112',
    migrationQuoteThreshold: threshold,
  })
}

describe('DBC inspector (Section 32)', () => {
  it('exposes human rows and raw JSON', () => {
    const inspection = buildDbcInspection(makePlan())
    expect(inspection.rows.map((row) => row.label)).toContain('MIGRATION THRESHOLD')
    expect(inspection.rows.map((row) => row.label)).toContain('BASE FEE MODE')
    expect(inspection.segments).toBe(8)
    expect(inspection.liquidityWeights).toHaveLength(8)
    expect(() => JSON.stringify(inspection.raw)).not.toThrow()
  })
})

describe('liquidity gap (Section 53)', () => {
  it('does not assume zero when liquidity is unobserved', () => {
    const view = buildLiquidityGap({ targetLiquidity: '250000' })
    expect(view.current.valueClass).toBe('UNKNOWN')
    expect(view.gap.value).toBe('NOT COMPUTABLE')
  })

  it('marks the gap as modelled and names the direction', () => {
    const view = buildLiquidityGap({
      targetLiquidity: '250000',
      currentObservedLiquidity: '90000',
      observedSource: 'pyth',
    })
    expect(view.current.valueClass).toBe('OBSERVED')
    expect(view.gap.valueClass).toBe('MODEL')
    expect(view.gap.direction).toBe('SHORTFALL')
  })
})

describe('configuration diff (Section 55)', () => {
  it('reports exact parameter differences', () => {
    const diff = diffDbcPlans(makePlan('TRANSITION_WIDE', 8), makePlan('EVENT_ADAPTIVE', 12))
    expect(diff.curve.find((d) => d.parameter === 'segments')?.delta).toBe('4')
    expect(Number(diff.liquidity[0].delta)).not.toBe(0)
    expect(diff.summary).toContain('differ')
  })
})

describe('Pyth price comparison (Section 52)', () => {
  it('is unavailable without a conversion ratio', () => {
    const comparison = buildReferenceComparison({ sourceValue: '100', targetReference: '153.46' })
    expect(comparison.status).toBe('UNAVAILABLE')
    expect(comparison.reason).toContain('conversionRatio')
  })

  it('shows the transformation explicitly when one exists', () => {
    const comparison = buildReferenceComparison({
      sourceValue: '100',
      sourceSymbol: 'XAI',
      conversionRatio: '0.7165',
      targetReference: '153.46',
      targetSymbol: 'SPACEX',
    })
    expect(comparison.status).toBe('COMPARABLE')
    expect(comparison.transformation).toContain('x 0.7165')
    expect(comparison.normalizedSourceValue?.toFixed(4)).toBe('71.6500')
  })
})

describe('transition timeline (Section 40)', () => {
  it('orders nodes and flags future ones', () => {
    const nodes = buildTransitionTimeline(
      [
        {
          id: 'ev-1',
          assetId: 'spacex',
          type: 'IPO',
          title: 'SPACEX: IPO',
          observedAt: '2026-09-23T00:00:00Z',
          conversionDeadline: '2027-03-12T23:59:00Z',
          sourceType: 'PRESTOCKS_PAGE',
          confidence: 0.6,
        },
      ],
      '2026-12-01T00:00:00Z',
    )
    for (let i = 1; i < nodes.length; i += 1) {
      expect(Date.parse(nodes[i].timestamp)).toBeGreaterThanOrEqual(Date.parse(nodes[i - 1].timestamp))
    }
    expect(nodes.some((node) => node.future)).toBe(true)
    expect(nodes[0].source).toBe('PRESTOCKS_PAGE')
  })
})

describe('policy JSON export (Section 46)', () => {
  it('serializes with hashes and version and parses back', () => {
    const planInput: CompileInput = {
      asOf: '2026-09-23T00:00:00Z',
      sourceAsset: {
        id: 'spacex',
        symbol: 'SPACEX',
        name: 'SpaceX PreStocks',
        mintAddress: 'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh',
        source: 'prestocks',
        retrievedAt: '2026-09-23T00:00:00Z',
      },
      lifecycleEvent: {
        id: 'ev-1',
        assetId: 'spacex',
        type: 'IPO',
        title: 'SPACEX: IPO',
        observedAt: '2026-09-23T00:00:00Z',
        sourceType: 'PRESTOCKS_PAGE',
        confidence: 0.6,
      },
      currentState: LifecycleState.PUBLIC_TRANSITION,
      liquidity: {
        mode: 'EVENT_ADAPTIVE',
        segments: 8,
        referencePrice: '150',
        targetLiquidity: '250000',
        quoteMint: 'So11111111111111111111111111111111111111112',
        migrationQuoteThreshold: '100000',
      },
    }
    const plan = compileTransitionPlan(planInput)
    const parsed = JSON.parse(serializePolicy(plan))
    expect(parsed.algorithmVersion).toBe(plan.algorithmVersion)
    expect(parsed.inputHash).toBe(plan.inputHash)
    expect(parsed.outputHash).toBe(plan.outputHash)
    expect(parsed.dbcPlan.segments).toBe(8)
    expect(typeof parsed.dbcPlan.migrationQuoteThreshold).toBe('string')
    expect(plan.sourceAsset.mintAddress).toBe('PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh')
    expect(new Decimal('1').toString()).toBe('1')
  })
})
