import { describe, expect, it } from 'vitest'
import {
  Decimal,
  buildTransitionDossier,
  compareToBaseline,
  compileTransitionPlan,
  computePremium,
  computeTransitionGap,
  deriveLifecycleState,
  getScenarioPreset,
  makeConversionSpec,
  type SimulationConfig,
  type TransitionPlan,
} from '@auctra/domain'
import { validateDbcPlan } from '@auctra/meteora'
import { DemoLifecycleProvider, normalizePreStockAsset } from '@auctra/prestocks'
import { MockPythProvider, computeFreshness, toReferenceState } from '@auctra/pyth'

/**
 * One complete pipeline test (AUCTRA.md Section 80):
 *
 *   PreStock asset -> lifecycle event -> reference state -> transition gap
 *   -> Auctra policy -> Meteora configuration -> simulation -> result
 *
 * It runs the real domain engine and the real provider adapters (with a mock
 * Pyth source), and asserts the reproducibility hashes.
 */

const RETRIEVED_AT = '2026-09-23T12:59:10.000Z'

const spacex = normalizePreStockAsset(
  {
    name: 'SpaceX PreStocks',
    symbol: 'SPACEX',
    contract_address: 'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh',
    markPrice: 153.46590420780728,
    markValuation: 2012108521836,
    tokenPrice: 112.496991575484,
    impliedValuation: 1474960556212,
    supply: 43712.532115040005,
  },
  RETRIEVED_AT,
)

describe('Auctra end-to-end transition (Section 80)', () => {
  it('compiles a reproducible plan and simulates it', async () => {
    // 1. Lifecycle event from the official disclosure.
    const events = await new DemoLifecycleProvider().getEvents(spacex)
    expect(events).toHaveLength(1)
    const event = events[0]

    // 2. Derived lifecycle state.
    const currentState = deriveLifecycleState(events, RETRIEVED_AT)
    expect(currentState).toBe('PUBLIC_TRANSITION')

    // 3. Reference state from the market/reference layer.
    const observation = await new MockPythProvider({
      symbol: 'SPACEX',
      price: '150',
      confidence: '0.07',
      now: () => RETRIEVED_AT,
    }).getReference({ symbol: 'SPACEX' })
    const freshness = computeFreshness({
      now: RETRIEVED_AT,
      feedUpdateTimestamp: observation.feedUpdateTimestamp,
      publishTime: observation.publishTime,
    })
    const referenceState = toReferenceState(observation, freshness)
    expect(referenceState.freshness).toBe('FRESH')

    // 4. Conversion and transition gap.
    const conversionSpec = makeConversionSpec({
      sourceAssetMint: spacex.mintAddress,
      targetAssetMint: 'SPCXx_MINT',
      ratioNumerator: '0.7165',
      ratioDenominator: '1',
      sourceUrl: 'https://www.prestocks.com/xai',
      verifiedAt: RETRIEVED_AT,
    })
    const transitionGap = computeTransitionGap({
      sourceReference: spacex.tokenPrice,
      targetReference: referenceState.price,
      conversionRatio: '0.7165',
      confidenceBps: referenceState.confidenceBps.toNumber(),
    })
    expect(transitionGap.status).toBe('COMPUTABLE')
    expect(transitionGap.impliedTargetValue).toBeDefined()

    const premium = computePremium({
      tokenPrice: spacex.tokenPrice,
      markPrice: spacex.markPrice,
      impliedValuation: spacex.impliedValuation,
      markValuation: spacex.markValuation,
    })

    // 5. Policy + plan (compiled twice to prove reproducibility).
    const compileInput = {
      asOf: RETRIEVED_AT,
      sourceAsset: {
        id: spacex.id,
        symbol: spacex.symbol,
        name: spacex.name,
        mintAddress: spacex.mintAddress,
        source: spacex.source,
        retrievedAt: spacex.retrievedAt,
      },
      lifecycleEvent: event,
      currentState,
      referenceState,
      conversionSpec,
      transitionGap,
      premium,
      liquidity: {
        mode: 'EVENT_ADAPTIVE' as const,
        segments: 8,
        referencePrice: spacex.tokenPrice,
        targetLiquidity: '250000',
        quoteMint: 'So11111111111111111111111111111111111111112',
        migrationQuoteThreshold: '100000',
      },
      tokenType: 'Token2022' as const,
    }
    const plan: TransitionPlan = compileTransitionPlan(compileInput)
    const again = compileTransitionPlan(compileInput)
    expect(again.id).toBe(plan.id)
    expect(again.inputHash).toBe(plan.inputHash)
    expect(again.outputHash).toBe(plan.outputHash)
    expect(plan.inputHash).toMatch(/^[0-9a-f]{64}$/)

    // 6. Meteora DBC configuration.
    expect(validateDbcPlan(plan.dbcPlan)).toEqual([])
    expect(plan.dbcPlan.segments).toBe(8)
    expect(plan.dbcPlan.migrationOption).toBe('MET_DAMM_V2')

    // 7. Baseline vs Auctra simulation with identical trades.
    const preset = getScenarioPreset('IPO_IMMINENT')
    const auctraConfig: SimulationConfig = {
      id: `${plan.id}:auctra`,
      referencePrice: plan.transitionCurve.referencePrice,
      migrationQuoteThreshold: plan.dbcPlan.migrationQuoteThreshold,
      feeBps: plan.dbcPlan.feePolicy.startingFeeBps,
      curve: {
        pricePoints: plan.dbcPlan.pricePoints,
        weights: plan.dbcPlan.liquidityWeights,
        referencePrice: plan.transitionCurve.referencePrice,
      },
    }
    const baselineConfig: SimulationConfig = {
      id: `${plan.id}:baseline`,
      referencePrice: plan.transitionCurve.referencePrice,
      migrationQuoteThreshold: plan.dbcPlan.migrationQuoteThreshold,
      feeBps: preset.feeBps,
      curve: {
        pricePoints: plan.dbcPlan.pricePoints,
        weights: plan.dbcPlan.pricePoints.map(() => new Decimal(1).div(plan.dbcPlan.segments)),
        referencePrice: plan.transitionCurve.referencePrice,
      },
    }

    const comparison = compareToBaseline(auctraConfig, baselineConfig, preset.sequence)
    expect(comparison.auctra.trades).toHaveLength(preset.sequence.instructions.length)
    expect(comparison.baseline.trades).toHaveLength(preset.sequence.instructions.length)
    expect(comparison.note).toContain('No winner')
    expect(Number.isFinite(comparison.deltas.averageSlippageBps)).toBe(true)

    // 8. Dossier ties it together.
    const dossier = buildTransitionDossier({
      plan,
      asset: {
        id: spacex.id,
        symbol: spacex.symbol,
        name: spacex.name,
        mintAddress: spacex.mintAddress,
        markPrice: spacex.markPrice,
        tokenPrice: spacex.tokenPrice,
        premiumBps: premium.tokenPremiumBps,
      },
      targetAsset: { symbol: 'SPCXx', mintAddress: 'SPCXx_MINT' },
    })
    expect(dossier.conversionStatus.status).toBe('VERIFIED')
    expect(dossier.transitionGap.status).toBe('COMPUTABLE')
    expect(dossier.currentState).toBe('PUBLIC_TRANSITION')
  })
})
