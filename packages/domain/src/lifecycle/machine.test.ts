import { describe, expect, it } from 'vitest'
import {
  LifecycleState,
  deriveLifecycleState,
  normalizeLifecycleEvents,
  reduceLifecycle,
  type LifecycleEvent,
} from '../index'

const acquisition: LifecycleEvent = {
  id: 'ev-acq',
  assetId: 'xai',
  type: 'ACQUISITION',
  title: 'xAI acquired by SpaceX',
  announcedAt: '2024-01-01T00:00:00Z',
  effectiveAt: '2024-06-01T00:00:00Z',
  conversionDeadline: '2026-09-12T23:59:00Z',
  sourceUrl: 'https://www.prestocks.com/xai',
  sourceType: 'PRESTOCKS_PAGE',
  confidence: 0.95,
}

const ipo: LifecycleEvent = {
  id: 'ev-ipo',
  assetId: 'spacex',
  type: 'IPO',
  title: 'SpaceX has gone public',
  announcedAt: '2026-01-01T00:00:00Z',
  effectiveAt: '2026-06-01T00:00:00Z',
  conversionDeadline: '2027-03-12T23:59:00Z',
  sourceUrl: 'https://www.prestocks.com/spacex',
  sourceType: 'PRESTOCKS_PAGE',
  confidence: 0.9,
}

const mergerNoDeadline: LifecycleEvent = {
  id: 'ev-merger',
  assetId: 'a3',
  type: 'MERGER',
  title: 'Merger',
  announcedAt: '2026-01-01T00:00:00Z',
  effectiveAt: '2026-03-01T00:00:00Z',
  sourceType: 'MANUAL',
  sourceUrl: 'https://example.invalid/merger',
  confidence: 0.7,
}

describe('lifecycle state machine (Sections 8, 11, 76)', () => {
  it('is PRIVATE_ACTIVE with no events', () => {
    expect(deriveLifecycleState([], '2026-09-23T00:00:00Z')).toBe(LifecycleState.PRIVATE_ACTIVE)
  })

  it('walks private -> announced -> conversion -> expiring -> expired', () => {
    expect(deriveLifecycleState([acquisition], '2023-12-01T00:00:00Z')).toBe(
      LifecycleState.PRIVATE_ACTIVE,
    )
    expect(deriveLifecycleState([acquisition], '2024-02-01T00:00:00Z')).toBe(
      LifecycleState.EVENT_ANNOUNCED,
    )
    expect(deriveLifecycleState([acquisition], '2024-07-01T00:00:00Z')).toBe(
      LifecycleState.CONVERSION_OPEN,
    )
    // deadline is 2026-09-12; the 7-day expiring window opens 2026-09-05
    expect(deriveLifecycleState([acquisition], '2026-09-10T00:00:00Z')).toBe(
      LifecycleState.EXPIRING,
    )
    expect(deriveLifecycleState([acquisition], '2026-09-23T00:00:00Z')).toBe(LifecycleState.EXPIRED)
  })

  it('walks IPO announced -> public transition', () => {
    expect(deriveLifecycleState([ipo], '2026-03-01T00:00:00Z')).toBe(LifecycleState.EVENT_ANNOUNCED)
    expect(deriveLifecycleState([ipo], '2026-07-01T00:00:00Z')).toBe(
      LifecycleState.PUBLIC_TRANSITION,
    )
  })

  it('settles a deadline-less merger to POST_EVENT', () => {
    expect(deriveLifecycleState([mergerNoDeadline], '2026-03-15T00:00:00Z')).toBe(
      LifecycleState.PUBLIC_TRANSITION,
    )
    // effectiveAt 2026-03-01 + 30 days = 2026-03-31
    expect(deriveLifecycleState([mergerNoDeadline], '2026-06-01T00:00:00Z')).toBe(
      LifecycleState.POST_EVENT,
    )
  })

  it('emits every transition with previousState, newState, timestamp, reason and source', () => {
    const { transitions } = reduceLifecycle([acquisition], '2026-09-23T00:00:00Z')
    expect(transitions.length).toBeGreaterThanOrEqual(4)
    for (const transition of transitions) {
      expect(transition.previousState).toBeTruthy()
      expect(transition.newState).toBeTruthy()
      expect(Date.parse(transition.timestamp)).not.toBeNaN()
      expect(transition.reason.length).toBeGreaterThan(0)
      expect(transition.source).toBe('PRESTOCKS_PAGE')
    }
    expect(transitions.at(-1)?.newState).toBe(LifecycleState.EXPIRED)
  })

  it('is order-independent for the same events', () => {
    const forward = deriveLifecycleState([acquisition, ipo], '2026-09-23T00:00:00Z')
    const reversed = deriveLifecycleState([ipo, acquisition], '2026-09-23T00:00:00Z')
    expect(forward).toBe(reversed)
  })

  it('normalizes timestamps to ISO UTC', () => {
    const [normalized] = normalizeLifecycleEvents([
      { ...acquisition, announcedAt: '2024-01-01T05:00:00+05:00' },
    ])
    expect(normalized.announcedAt).toBe('2024-01-01T00:00:00.000Z')
  })
})
