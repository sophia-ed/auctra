import { explain, type PolicyExplanation } from './explanation'

export type ActivationType = 'IMMEDIATE' | 'SCHEDULED' | 'EVENT_RELATIVE'

export interface ActivationPlan {
  type: ActivationType
  timestamp?: string
  relativeToEventId?: string
  reason: string
  explanation: PolicyExplanation[]
}

export interface ActivationInput {
  asOf: string
  eventId?: string
  eventEffectiveAt?: string
  eventAnnouncedAt?: string
  conversionDeadline?: string
}

/**
 * Timestamp activation (AUCTRA.md Section 28).
 *
 * Maps to Meteora's timestamp activation type (activationType = Timestamp).
 * Auctra does not pretend a config rewrites itself after creation; a later
 * lifecycle update produces a new plan, never a silent mutation.
 */
export function computeActivation(input: ActivationInput): ActivationPlan {
  const asOfMs = Date.parse(input.asOf)
  if (Number.isNaN(asOfMs)) throw new Error('computeActivation: invalid asOf')

  const parse = (value?: string): number | undefined => {
    if (!value) return undefined
    const t = Date.parse(value)
    return Number.isNaN(t) ? undefined : t
  }

  const effectiveMs = parse(input.eventEffectiveAt)
  const deadlineMs = parse(input.conversionDeadline)

  if (effectiveMs !== undefined && deadlineMs !== undefined && effectiveMs > asOfMs) {
    return {
      type: 'EVENT_RELATIVE',
      timestamp: new Date(effectiveMs).toISOString(),
      relativeToEventId: input.eventId,
      reason: 'activate at the conversion/transition effective time',
      explanation: [
        explain('event effective time is in the future', 'anchors activation to the event', new Date(effectiveMs).toISOString()),
      ],
    }
  }

  if (effectiveMs !== undefined && effectiveMs > asOfMs) {
    return {
      type: 'SCHEDULED',
      timestamp: new Date(effectiveMs).toISOString(),
      reason: 'activate at the scheduled event effective time',
      explanation: [explain('scheduled event effective time', 'defers activation', new Date(effectiveMs).toISOString())],
    }
  }

  return {
    type: 'IMMEDIATE',
    timestamp: input.asOf,
    reason:
      effectiveMs === undefined
        ? 'no future event time available; activation is immediate'
        : 'event effective time has passed; activation is immediate',
    explanation: [explain('no future activation anchor', 'activates the configuration immediately', input.asOf)],
  }
}
