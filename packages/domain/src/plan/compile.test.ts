import { describe, expect, it } from 'vitest'
import {
  LifecycleState,
  buildTransitionCurve,
  compileTransitionPlan,
  computePremium,
  computeTransitionGap,
  makeConversionSpec,
  recomputeOutputHash,
  type CompileInput,
} from '../index'

function baseInput(overrides: Partial<CompileInput> = {}): CompileInput {
  const conversionSpec = makeConversionSpec({
    sourceAssetMint: 'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh',
    targetAssetMint: 'SPCXx',
    ratioNumerator: '1',
    ratioDenominator: '1',
    deadline: '2027-03-12T23:59:00Z',
    sourceUrl: 'https://www.prestocks.com/spacex',
    verifiedAt: '2026-09-23T00:00:00Z',
  })

  return {
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
      id: 'ev-ipo-spacex',
      assetId: 'spacex',
      type: 'IPO',
      title: 'SpaceX has gone public',
      announcedAt: '2026-01-01T00:00:00Z',
      effectiveAt: '2026-06-01T00:00:00Z',
      conversionDeadline: '2027-03-12T23:59:00Z',
      sourceUrl: 'https://www.prestocks.com/spacex',
      sourceType: 'PRESTOCKS_PAGE',
      confidence: 0.9,
    },
    currentState: LifecycleState.PUBLIC_TRANSITION,
    conversionSpec,
    transitionGap: computeTransitionGap({
      sourceReference: '112.496991575484',
      targetReference: '153.46590420780728',
      conversionRatio: '1',
    }),
    premium: computePremium({
      tokenPrice: '112.496991575484',
      markPrice: '153.46590420780728',
    }),
    liquidity: {
      mode: 'EVENT_ADAPTIVE',
      segments: 8,
      referencePrice: '150',
      targetLiquidity: '250000',
      quoteMint: 'So11111111111111111111111111111111111111112',
      migrationQuoteThreshold: '100000',
    },
    ...overrides,
  }
}

describe('transition plan compilation (Sections 20, 46, 47)', () => {
  it('is reproducible: identical inputs produce identical hashes and id', () => {
    const a = compileTransitionPlan(baseInput())
    const b = compileTransitionPlan(baseInput())
    expect(a.id).toBe(b.id)
    expect(a.inputHash).toBe(b.inputHash)
    expect(a.outputHash).toBe(b.outputHash)
  })

  it('changes the hash when an input changes', () => {
    const a = compileTransitionPlan(baseInput())
    const b = compileTransitionPlan(
      baseInput({ liquidity: { ...baseInput().liquidity, segments: 10 } }),
    )
    expect(a.inputHash).not.toBe(b.inputHash)
  })

  it('re-derives the output hash from the plan itself', () => {
    const plan = compileTransitionPlan(baseInput())
    expect(recomputeOutputHash(plan)).toBe(plan.outputHash)
  })

  it('produces a DBC plan within protocol constraints', () => {
    const plan = compileTransitionPlan(baseInput())
    expect(plan.dbcPlan.segments).toBeLessThanOrEqual(16)
    expect(plan.dbcPlan.migrationOption).toBe('MET_DAMM_V2')
    expect(plan.dbcPlan.activationType).toBe('Timestamp')
    expect(plan.dbcPlan.liquidityWeights.length).toBe(plan.dbcPlan.segments)
    expect(plan.dbcPlan.warnings.length).toBe(0)
  })

  it('keeps the NOT COMPUTABLE gap honest in the compiled plan', () => {
    const plan = compileTransitionPlan(
      baseInput({
        transitionGap: computeTransitionGap({ sourceReference: '112.5' }),
      }),
    )
    expect(plan.transitionGap?.status).toBe('NOT_COMPUTABLE')
  })

  it('carries provenance on liquidity-plan values', () => {
    const plan = compileTransitionPlan(baseInput())
    expect(plan.liquidityPlan.targetLiquidity.provenance).toBe('PROPOSED')
    expect(plan.liquidityPlan.concentration.provenance).toBe('CALCULATED')
    expect(plan.liquidityPlan.activation.provenance).toBe('PROPOSED')
  })
})
