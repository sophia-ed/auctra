import { normalizeLifecycleEvents, type LifecycleEvent } from '../lifecycle/events'
import {
  DEFAULT_LIFECYCLE_CONFIG,
  eventTimeline,
  type LifecycleConfig,
} from '../lifecycle/machine'

/**
 * Transition timeline (AUCTRA.md Section 40).
 * Each node shows timestamp, state, source and confidence.
 */
export interface TimelineNode {
  timestamp: string
  state: string
  source: string
  confidence: number
  reason: string
  eventId?: string
  title: string
  future: boolean
}

export function buildTransitionTimeline(
  events: readonly LifecycleEvent[],
  asOf: string,
  config: LifecycleConfig = DEFAULT_LIFECYCLE_CONFIG,
): TimelineNode[] {
  const asOfMs = Date.parse(asOf)
  if (Number.isNaN(asOfMs)) throw new Error('buildTransitionTimeline: invalid asOf')

  return normalizeLifecycleEvents(events)
    .flatMap((event) => eventTimeline(event, config))
    .sort((a, b) => a.at - b.at || (a.event.id < b.event.id ? -1 : 1))
    .map((entry) => ({
      timestamp: new Date(entry.at).toISOString(),
      state: entry.state,
      source: entry.event.sourceType,
      confidence: entry.event.confidence,
      reason: entry.reason,
      eventId: entry.event.id,
      title: entry.event.title,
      future: entry.at > asOfMs,
    }))
}
