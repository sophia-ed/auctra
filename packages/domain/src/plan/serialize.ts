import type { TransitionPlan } from './types'
import { toJsonValue } from '../serialize/json'

/**
 * Policy JSON export (AUCTRA.md Section 46).
 * Includes algorithmVersion, generatedAt, inputHash and outputHash.
 */
export function toPolicyJson(plan: TransitionPlan): Record<string, unknown> {
  return toJsonValue({
    algorithmVersion: plan.algorithmVersion,
    generatedAt: plan.generatedAt,
    inputHash: plan.inputHash,
    outputHash: plan.outputHash,
    id: plan.id,
    asset: plan.sourceAsset,
    currentState: plan.currentState,
    event: plan.lifecycleEvent,
    reference: plan.referenceState,
    conversion: plan.conversionSpec,
    premium: plan.premium,
    transitionGap: plan.transitionGap,
    eventIntensity: plan.eventIntensity,
    transitionCurve: plan.transitionCurve,
    liquidityPlan: plan.liquidityPlan,
    dbcPlan: plan.dbcPlan,
    simulation: plan.simulationPlan,
  }) as Record<string, unknown>
}

export function serializePolicy(plan: TransitionPlan): string {
  return JSON.stringify(toPolicyJson(plan), null, 2)
}
