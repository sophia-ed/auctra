import {
  LifecycleState,
  STATE_RANK,
  isAllowedTransition,
} from './states'
import {
  normalizeLifecycleEvents,
  validateLifecycleEvent,
  type DataQualityIssue,
  type LifecycleEvent,
} from './events'

/**
 * Lifecycle configuration. Both windows are explicit so that state derivation is
 * a pure function of (events, asOf, config) and therefore reproducible.
 */
export interface LifecycleConfig {
  /** Time before a conversion deadline at which an asset becomes EXPIRING. */
  expiringWindowSeconds: number
  /** Time after an event's effectiveAt at which a non-expiring event settles. */
  postEventDelaySeconds: number
}

export const DEFAULT_LIFECYCLE_CONFIG: LifecycleConfig = {
  expiringWindowSeconds: 7 * 24 * 60 * 60,
  postEventDelaySeconds: 30 * 24 * 60 * 60,
}

export interface StateTransition {
  previousState: LifecycleState
  newState: LifecycleState
  timestamp: string
  reason: string
  source: string
  eventId?: string
}

interface TimelineEntry {
  at: number
  state: LifecycleState
  reason: string
  event: LifecycleEvent
}

function parseMs(value?: string): number | undefined {
  if (!value) return undefined
  const t = Date.parse(value)
  return Number.isNaN(t) ? undefined : t
}

function addSeconds(iso: string, seconds: number): string {
  return new Date(Date.parse(iso) + seconds * 1000).toISOString()
}

/**
 * Expand one event into (timestamp, state) entries.
 *
 * Rules (documented, deterministic):
 *  - the announcement edge is at `announcedAt`, falling back to `effectiveAt`
 *    so a partially-specified event never jumps straight to a later state;
 *  - CONVERSION / ACQUISITION become CONVERSION_OPEN at `effectiveAt`;
 *  - IPO / MERGER / CORPORATE_ACTION / CUSTOM become PUBLIC_TRANSITION at
 *    `effectiveAt`;
 *  - EXPIRATION announces EXPIRING and expires at `effectiveAt`;
 *  - any event with a `conversionDeadline` becomes EXPIRING one window before
 *    the deadline and EXPIRED at the deadline;
 *  - an event with an `effectiveAt` and no deadline settles to POST_EVENT after
 *    the configured delay.
 */
export function eventTimeline(
  event: LifecycleEvent,
  config: LifecycleConfig = DEFAULT_LIFECYCLE_CONFIG,
): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  const push = (iso: string | undefined, state: LifecycleState, reason: string) => {
    const at = parseMs(iso)
    if (at === undefined) return
    entries.push({ at, state, reason, event })
  }

  const announceAt = event.announcedAt ?? event.effectiveAt ?? event.conversionDeadline
  push(announceAt, LifecycleState.EVENT_ANNOUNCED, `${event.type} announced: ${event.title}`)

  switch (event.type) {
    case 'CONVERSION':
    case 'ACQUISITION':
      push(event.effectiveAt, LifecycleState.CONVERSION_OPEN, `${event.type} effective: conversion window open`)
      break
    case 'IPO':
    case 'MERGER':
    case 'CORPORATE_ACTION':
    case 'CUSTOM':
      push(event.effectiveAt, LifecycleState.PUBLIC_TRANSITION, `${event.type} effective: public transition in effect`)
      break
    case 'EXPIRATION':
      push(event.announcedAt ?? event.effectiveAt, LifecycleState.EXPIRING, 'expiration announced: deadline approaching')
      push(event.effectiveAt, LifecycleState.EXPIRED, 'expiration effective')
      break
  }

  const deadlineMs = parseMs(event.conversionDeadline)
  if (deadlineMs !== undefined) {
    entries.push({
      at: deadlineMs - config.expiringWindowSeconds * 1000,
      state: LifecycleState.EXPIRING,
      reason: 'conversion deadline approaching',
      event,
    })
    entries.push({
      at: deadlineMs,
      state: LifecycleState.EXPIRED,
      reason: 'conversion deadline passed',
      event,
    })
  }

  if (event.effectiveAt && !event.conversionDeadline) {
    push(
      addSeconds(event.effectiveAt, config.postEventDelaySeconds),
      LifecycleState.POST_EVENT,
      'post-event settlement window',
    )
  }

  return entries
}

export interface LifecycleResult {
  state: LifecycleState
  transitions: StateTransition[]
  issues: DataQualityIssue[]
}

/**
 * Derive lifecycle state and the full transition history from events as of a
 * fixed instant. Pure and deterministic (AUCTRA.md Sections 8, 11, 76).
 */
export function reduceLifecycle(
  events: readonly LifecycleEvent[],
  asOf: string,
  config: LifecycleConfig = DEFAULT_LIFECYCLE_CONFIG,
): LifecycleResult {
  const asOfMs = Date.parse(asOf)
  if (Number.isNaN(asOfMs)) throw new Error('reduceLifecycle: invalid asOf timestamp')

  const sorted = normalizeLifecycleEvents(events)
  const issues = sorted.flatMap(validateLifecycleEvent)

  const allEntries = sorted.flatMap((event) => eventTimeline(event, config))
  const entries = allEntries
    .filter((entry) => entry.at <= asOfMs)
    .sort(
      (a, b) =>
        a.at - b.at ||
        STATE_RANK[b.state] - STATE_RANK[a.state] ||
        (a.event.id < b.event.id ? -1 : a.event.id > b.event.id ? 1 : 0),
    )

  // UNKNOWN means the events exist but carry no usable timeline (a data-quality
  // failure). An event that is simply in the future leaves the asset in
  // PRIVATE_ACTIVE.
  let state: LifecycleState =
    sorted.length > 0 && allEntries.length === 0
      ? LifecycleState.UNKNOWN
      : LifecycleState.PRIVATE_ACTIVE

  const transitions: StateTransition[] = []
  for (const entry of entries) {
    if (entry.state === state) continue
    transitions.push({
      previousState: state,
      newState: entry.state,
      timestamp: new Date(entry.at).toISOString(),
      reason: entry.reason,
      source: entry.event.sourceType,
      eventId: entry.event.id,
    })
    state = entry.state
  }

  for (const transition of transitions) {
    if (!isAllowedTransition(transition.previousState, transition.newState)) {
      issues.push({
        code: 'IMPLAUSIBLE_TRANSITION',
        message: `derived transition ${transition.previousState} -> ${transition.newState} is not in the allowed graph`,
      })
    }
  }

  return { state, transitions, issues }
}

/** Convenience: state only. */
export function deriveLifecycleState(
  events: readonly LifecycleEvent[],
  asOf: string,
  config: LifecycleConfig = DEFAULT_LIFECYCLE_CONFIG,
): LifecycleState {
  return reduceLifecycle(events, asOf, config).state
}
