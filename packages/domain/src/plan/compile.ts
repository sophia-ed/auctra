import { dec, type DecimalInput } from '../math/decimal'
import { hashValue } from '../math/hash'
import { normalizeLifecycleEvents, type LifecycleEvent } from '../lifecycle/events'
import type { LifecycleState } from '../lifecycle/states'
import type { ConversionSpec } from '../transition/conversion'
import type { PremiumResult } from '../transition/premium'
import type { TransitionGap } from '../transition/gap'
import { computeEventIntensity } from '../policy/intensity'
import { buildTransitionCurve, type CurveMode } from '../policy/curve'
import { computeFeePolicy } from '../policy/fees'
import { computeActivation } from '../policy/activation'
import { buildLiquidityPlan } from '../policy/liquidity'
import { buildDbcPlan } from '../policy/dbc'
import {
  DEFAULT_LIFECYCLE_CONFIG,
  type LifecycleConfig,
} from '../lifecycle/machine'
import type { AssetReference, ReferenceState, SimulationPlan, TransitionPlan } from './types'

export const ALGORITHM_VERSION = '1.0.0'

export interface CompileLiquidityInput {
  mode: CurveMode
  segments: number
  referencePrice: DecimalInput
  targetLiquidity: DecimalInput
  quoteMint: string
  migrationQuoteThreshold: DecimalInput
  currentObservedLiquidity?: DecimalInput
  observedSource?: string
  spreadOverride?: DecimalInput
  bandwidthOverride?: DecimalInput
}

export interface CompileInput {
  asOf: string
  sourceAsset: AssetReference
  lifecycleEvent: LifecycleEvent
  currentState: LifecycleState
  referenceState?: ReferenceState
  conversionSpec?: ConversionSpec
  transitionGap?: TransitionGap
  premium?: PremiumResult
  liquidity: CompileLiquidityInput
  tokenType?: 'SPLToken' | 'Token2022'
  simulationPlan?: SimulationPlan
  lifecycleConfig?: LifecycleConfig
  algorithmVersion?: string
}

function deadlineDistanceSeconds(event: LifecycleEvent, asOf: string): number | undefined {
  if (!event.conversionDeadline) return undefined
  const deadline = Date.parse(event.conversionDeadline)
  const now = Date.parse(asOf)
  if (Number.isNaN(deadline) || Number.isNaN(now)) return undefined
  return Math.round((deadline - now) / 1000)
}

function canonicalPlanInput(input: CompileInput, algorithmVersion: string): unknown {
  const [normalizedEvent] = normalizeLifecycleEvents([input.lifecycleEvent])
  return {
    algorithmVersion,
    asOf: input.asOf,
    sourceAsset: input.sourceAsset,
    lifecycleEvent: normalizedEvent,
    currentState: input.currentState,
    referenceState: input.referenceState,
    conversionSpec: input.conversionSpec,
    premium: input.premium,
    liquidity: input.liquidity,
    tokenType: input.tokenType ?? 'SPLToken',
    lifecycleConfig: input.lifecycleConfig ?? DEFAULT_LIFECYCLE_CONFIG,
  }
}

function canonicalPlanOutput(plan: Omit<TransitionPlan, 'inputHash' | 'outputHash'>): unknown {
  return {
    eventIntensity: plan.eventIntensity,
    transitionCurve: plan.transitionCurve,
    liquidityPlan: plan.liquidityPlan,
    dbcPlan: plan.dbcPlan,
    simulationPlan: plan.simulationPlan,
    transitionGap: plan.transitionGap,
    conversionSpec: plan.conversionSpec,
  }
}

/**
 * Compile a Transition Plan (AUCTRA.md Sections 20, 44-47).
 *
 * Pure and synchronous: identical inputs produce identical `inputHash` and
 * `outputHash`, and therefore the same plan id.
 */
export function compileTransitionPlan(input: CompileInput): TransitionPlan {
  const algorithmVersion = input.algorithmVersion ?? ALGORITHM_VERSION
  const distance = deadlineDistanceSeconds(input.lifecycleEvent, input.asOf)
  const referenceConfidenceBps = input.referenceState?.confidenceBps

  const eventIntensity = computeEventIntensity({
    eventType: input.lifecycleEvent.type,
    eventConfidence: input.lifecycleEvent.confidence,
    deadlineDistanceSeconds: distance,
    referenceConfidenceBps,
    marketSession: input.referenceState?.marketSession,
  })

  const curve = buildTransitionCurve({
    referencePrice: input.liquidity.referencePrice,
    referenceConfidenceBps,
    currentPremiumBps: input.premium?.tokenPremiumBps,
    eventIntensity: eventIntensity.intensity,
    mode: input.liquidity.mode,
    segments: input.liquidity.segments,
    liquidityTarget: input.liquidity.targetLiquidity,
    spreadOverride: input.liquidity.spreadOverride,
    bandwidthOverride: input.liquidity.bandwidthOverride,
  })

  const feePolicy = computeFeePolicy({
    eventIntensity: eventIntensity.intensity,
    referenceConfidenceBps,
    deadlineDistanceSeconds: distance,
    marketSession: input.referenceState?.marketSession,
  })

  const activation = computeActivation({
    asOf: input.asOf,
    eventId: input.lifecycleEvent.id,
    eventEffectiveAt: input.lifecycleEvent.effectiveAt,
    eventAnnouncedAt: input.lifecycleEvent.announcedAt,
    conversionDeadline: input.lifecycleEvent.conversionDeadline,
  })

  const liquidityPlan = buildLiquidityPlan({
    curve,
    feePolicy,
    activation,
    migrationQuoteThreshold: input.liquidity.migrationQuoteThreshold,
    targetLiquidity: input.liquidity.targetLiquidity,
    currentObservedLiquidity: input.liquidity.currentObservedLiquidity,
    observedSource: input.liquidity.observedSource,
  })

  const dbcPlan = buildDbcPlan({
    curve,
    feePolicy,
    activation,
    quoteMint: input.liquidity.quoteMint,
    migrationQuoteThreshold: input.liquidity.migrationQuoteThreshold,
    tokenType: input.tokenType,
  })

  const inputHash = hashValue(canonicalPlanInput(input, algorithmVersion))

  const withoutHashes: Omit<TransitionPlan, 'inputHash' | 'outputHash'> = {
    id: '',
    sourceAsset: input.sourceAsset,
    lifecycleEvent: input.lifecycleEvent,
    currentState: input.currentState,
    referenceState: input.referenceState,
    conversionSpec: input.conversionSpec,
    transitionGap: input.transitionGap,
    premium: input.premium,
    eventIntensity,
    transitionCurve: curve,
    liquidityPlan,
    dbcPlan,
    simulationPlan: input.simulationPlan,
    generatedAt: input.asOf,
    algorithmVersion,
  }

  const outputHash = hashValue({
    ...(canonicalPlanOutput(withoutHashes) as Record<string, unknown>),
    inputHash,
  })

  return { ...withoutHashes, id: `tp_${inputHash.slice(0, 16)}`, inputHash, outputHash }
}

/** Re-hash a plan's outputs; used by reproducibility tests. */
export function recomputeOutputHash(plan: TransitionPlan): string {
  const { outputHash: _ignored, ...rest } = plan
  return hashValue({
    ...(canonicalPlanOutput(rest as Omit<TransitionPlan, 'inputHash' | 'outputHash'>) as Record<
      string,
      unknown
    >),
    inputHash: plan.inputHash,
  })
}

export function recompileInputHash(input: CompileInput, algorithmVersion = ALGORITHM_VERSION): string {
  return hashValue(canonicalPlanInput(input, algorithmVersion))
}
