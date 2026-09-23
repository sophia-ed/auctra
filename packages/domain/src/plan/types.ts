import type { Decimal } from '../math/decimal'
import type { LifecycleEvent } from '../lifecycle/events'
import type { LifecycleState } from '../lifecycle/states'
import type { ConversionSpec } from '../transition/conversion'
import type { PremiumResult } from '../transition/premium'
import type { TransitionGap } from '../transition/gap'
import type { ActivationPlan } from '../policy/activation'
import type { TransitionCurve } from '../policy/curve'
import type { DbcPlan } from '../policy/dbc'
import type { DbcFeePolicy } from '../policy/fees'
import type { EventIntensityResult } from '../policy/intensity'
import type { LiquidityPlan } from '../policy/liquidity'
import type { BaselineComparison, Scenario } from '../simulation/types'

export type MarketSession = 'regular' | 'preMarket' | 'postMarket' | 'overNight' | 'closed'
export type Freshness = 'FRESH' | 'AGING' | 'STALE' | 'UNKNOWN'

/** Minimal, provenance-carrying reference to an asset. */
export interface AssetReference {
  id: string
  symbol: string
  name: string
  mintAddress: string
  source: string
  retrievedAt: string
}

/** External market/reference state (AUCTRA.md Section 14). */
export interface ReferenceState {
  feedId: string
  symbol: string
  price: Decimal
  confidence: Decimal
  exponent: number
  publisherCount?: number
  marketSession?: MarketSession
  publishTime: string
  feedUpdateTimestamp?: string
  confidenceBps: Decimal
  ageSeconds?: number
  freshness: Freshness
  source: 'pyth'
}

export interface SimulationPlan {
  scenario: Scenario
  sequenceId: string
  comparison: BaselineComparison
}

/**
 * The central artifact (AUCTRA.md Sections 3, 20, 46, 47).
 * Never mutated in place; a later lifecycle update produces a new plan.
 */
export interface TransitionPlan {
  id: string

  sourceAsset: AssetReference
  lifecycleEvent: LifecycleEvent
  currentState: LifecycleState

  referenceState?: ReferenceState
  conversionSpec?: ConversionSpec
  transitionGap?: TransitionGap

  premium?: PremiumResult
  eventIntensity: EventIntensityResult
  transitionCurve: TransitionCurve

  liquidityPlan: LiquidityPlan
  dbcPlan: DbcPlan
  simulationPlan?: SimulationPlan

  generatedAt: string
  algorithmVersion: string

  inputHash: string
  outputHash: string
}

export interface PlanComponentInput {
  eventId: string
  curve: TransitionCurve
  feePolicy: DbcFeePolicy
  activation: ActivationPlan
}

export type { ActivationPlan, DbcFeePolicy }
