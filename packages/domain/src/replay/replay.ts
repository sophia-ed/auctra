import { Decimal, dec, type DecimalInput } from '../math/decimal'
import { deriveLifecycleState, DEFAULT_LIFECYCLE_CONFIG, type LifecycleConfig } from '../lifecycle/machine'
import type { LifecycleEvent } from '../lifecycle/events'

/**
 * Historical replay (AUCTRA.md Section 39).
 *
 * Replays stored observations across PRE-EVENT / EVENT / POST-EVENT. If no
 * authorized historical Pyth data exists, every value is labelled SIMULATED or
 * MANUAL HISTORICAL INPUT — never presented as live history.
 */
export type ReplayPhase = 'PRE_EVENT' | 'EVENT' | 'POST_EVENT'
export type ReplayProvenance = 'PYTH' | 'SIMULATED' | 'MANUAL_HISTORICAL_INPUT'

export interface ReplayObservation {
  timestamp: string
  label: string
  value: DecimalInput
  provenance: ReplayProvenance
}

export interface ReplayPoint {
  phase: ReplayPhase
  timestamp: string
  label: string
  value: Decimal
  provenance: ReplayProvenance
  lifecycleState: string
}

export interface ReplayResult {
  eventEffectiveAt?: string
  phases: Record<ReplayPhase, ReplayPoint[]>
  provenanceSummary: string
  note: string
}

export interface ReplayInput {
  events: readonly LifecycleEvent[]
  observations: readonly ReplayObservation[]
  eventEffectiveAt?: string
  lifecycleConfig?: LifecycleConfig
  postEventWindowSeconds?: number
}

const DEFAULT_POST_EVENT_WINDOW_SECONDS = 30 * 24 * 60 * 60

function resolveEffectiveAt(input: ReplayInput): string | undefined {
  if (input.eventEffectiveAt) return input.eventEffectiveAt
  const withEffective = input.events
    .map((event) => event.effectiveAt)
    .filter((value): value is string => value !== undefined)
    .sort()
  return withEffective[0]
}

export function replayTransition(input: ReplayInput): ReplayResult {
  const config = input.lifecycleConfig ?? DEFAULT_LIFECYCLE_CONFIG
  const effectiveAt = resolveEffectiveAt(input)
  const effectiveMs = effectiveAt ? Date.parse(effectiveAt) : undefined
  const postEventWindowMs =
    (input.postEventWindowSeconds ?? DEFAULT_POST_EVENT_WINDOW_SECONDS) * 1000

  const phases: Record<ReplayPhase, ReplayPoint[]> = {
    PRE_EVENT: [],
    EVENT: [],
    POST_EVENT: [],
  }

  for (const observation of input.observations) {
    const ts = Date.parse(observation.timestamp)
    if (Number.isNaN(ts)) continue

    let phase: ReplayPhase
    if (effectiveMs === undefined) {
      phase = 'PRE_EVENT'
    } else if (ts < effectiveMs) {
      phase = 'PRE_EVENT'
    } else if (ts <= effectiveMs + postEventWindowMs) {
      phase = 'EVENT'
    } else {
      phase = 'POST_EVENT'
    }

    phases[phase].push({
      phase,
      timestamp: new Date(ts).toISOString(),
      label: observation.label,
      value: dec(observation.value),
      provenance: observation.provenance,
      lifecycleState: deriveLifecycleState(input.events, observation.timestamp, config),
    })
  }

  for (const key of Object.keys(phases) as ReplayPhase[]) {
    phases[key].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
  }

  const hasNonLive = input.observations.some((observation) => observation.provenance !== 'PYTH')
  const provenanceSummary = hasNonLive
    ? 'Replay contains SIMULATED or MANUAL HISTORICAL INPUT values; these are not live Pyth history.'
    : 'Replay uses stored Pyth observations.'

  return {
    eventEffectiveAt: effectiveAt,
    phases,
    provenanceSummary,
    note:
      effectiveAt === undefined
        ? 'No event effective time was supplied; all observations are shown as PRE-EVENT.'
        : 'Replay is a controlled historical reconstruction, not a forecast.',
  }
}
