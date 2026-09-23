import { describe, expect, it } from 'vitest'
import {
  Decimal,
  LifecycleState,
  buildTransitionDossier,
  compileTransitionPlan,
  computePremium,
  computeTransitionGap,
  makeConversionSpec,
  type CompileInput,
} from '../index'

function planInput(overrides: Partial<CompileInput> = {}): CompileInput {
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
      id: 'ev-spacex-ipo',
      assetId: 'spacex',
      type: 'IPO',
      title: 'SPACEX: IPO',
      observedAt: '2026-09-23T00:00:00Z',
      conversionDeadline: '2027-03-12T23:59:00Z',
      sourceUrl: 'https://www.prestocks.com/spacex',
      sourceType: 'PRESTOCKS_PAGE',
      confidence: 0.6,
    },
    currentState: LifecycleState.PUBLIC_TRANSITION,
    premium: computePremium({ tokenPrice: '112.5', markPrice: '153.46' }),
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

const ASSET = {
  id: 'spacex',
  symbol: 'SPACEX',
  name: 'SpaceX PreStocks',
  mintAddress: 'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh',
  markPrice: new Decimal('153.46'),
  tokenPrice: new Decimal('112.5'),
  premiumBps: new Decimal('-2662.06'),
}

describe('transition dossier (Section 12)', () => {
  it('reports an unknown target and conversion honestly', () => {
    const plan = compileTransitionPlan(planInput())
    const dossier = buildTransitionDossier({ plan, asset: ASSET })
    expect(dossier.targetAsset.status).toBe('UNKNOWN')
    expect(dossier.conversionStatus.status).toBe('UNKNOWN')
    expect(dossier.conversionStatus.description).toContain('UNKNOWN')
    expect(dossier.transitionGap.status).toBe('NOT_COMPUTABLE')
    expect(dossier.clocks.transition.status).toBe('PENDING')
  })

  it('reports a verified conversion when one is supplied', () => {
    const conversionSpec = makeConversionSpec({
      sourceAssetMint: 'SOURCE_MINT',
      targetAssetMint: 'TARGET_MINT',
      ratioNumerator: '0.7165',
      ratioDenominator: '1',
      sourceUrl: 'https://www.prestocks.com/xai',
      verifiedAt: '2026-09-23T00:00:00Z',
    })
    const plan = compileTransitionPlan(
      planInput({
        conversionSpec,
        transitionGap: computeTransitionGap({
          sourceReference: '100',
          targetReference: '153.46',
          conversionRatio: '0.7165',
        }),
      }),
    )
    const dossier = buildTransitionDossier({
      plan,
      asset: ASSET,
      targetAsset: { symbol: 'SPCXx', mintAddress: 'TARGET_MINT' },
    })
    expect(dossier.targetAsset.status).toBe('VERIFIED')
    expect(dossier.conversionStatus.status).toBe('VERIFIED')
    expect(dossier.conversionStatus.description).toContain('0.7165')
    expect(dossier.transitionGap.status).toBe('COMPUTABLE')
  })

  it('carries the plan hash versions and liquidity state', () => {
    const plan = compileTransitionPlan(planInput())
    const dossier = buildTransitionDossier({ plan, asset: ASSET })
    expect(dossier.algorithmVersion).toBe(plan.algorithmVersion)
    expect(dossier.generatedAt).toBe(plan.generatedAt)
    expect(dossier.liquidityState.migrationThreshold.toFixed(0)).toBe('100000')
    expect(dossier.liquidityState.provenance).toBe('PROPOSED')
  })
})
