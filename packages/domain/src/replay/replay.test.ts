import { describe, expect, it } from 'vitest'
import { LifecycleState, replayTransition } from '../index'

const events = [
  {
    id: 'ev-1',
    assetId: 'spacex',
    type: 'IPO' as const,
    title: 'SPACEX: IPO',
    announcedAt: '2026-01-01T00:00:00Z',
    effectiveAt: '2026-06-01T00:00:00Z',
    conversionDeadline: '2027-03-12T23:59:00Z',
    sourceType: 'PRESTOCKS_PAGE' as const,
    confidence: 0.9,
  },
]

describe('historical replay (Section 39)', () => {
  it('classifies observations into pre-event, event and post-event', () => {
    const result = replayTransition({
      events,
      eventEffectiveAt: '2026-06-01T00:00:00Z',
      postEventWindowSeconds: 30 * 86400,
      observations: [
        { timestamp: '2026-02-01T00:00:00Z', label: 'pre', value: '100', provenance: 'SIMULATED' },
        { timestamp: '2026-06-15T00:00:00Z', label: 'event', value: '110', provenance: 'MANUAL_HISTORICAL_INPUT' },
        { timestamp: '2026-09-01T00:00:00Z', label: 'post', value: '120', provenance: 'SIMULATED' },
      ],
    })
    expect(result.phases.PRE_EVENT).toHaveLength(1)
    expect(result.phases.EVENT).toHaveLength(1)
    expect(result.phases.POST_EVENT).toHaveLength(1)
    expect(result.phases.EVENT[0].lifecycleState).toBe(LifecycleState.PUBLIC_TRANSITION)
  })

  it('labels non-live provenance and never claims live history', () => {
    const result = replayTransition({
      events,
      eventEffectiveAt: '2026-06-01T00:00:00Z',
      observations: [
        { timestamp: '2026-06-15T00:00:00Z', label: 'event', value: '110', provenance: 'SIMULATED' },
      ],
    })
    expect(result.provenanceSummary).toContain('not live Pyth history')
  })

  it('falls back to PRE_EVENT when no effective time is known', () => {
    const result = replayTransition({
      events: [],
      observations: [
        { timestamp: '2026-06-15T00:00:00Z', label: 'x', value: '1', provenance: 'PYTH' },
      ],
    })
    expect(result.phases.PRE_EVENT).toHaveLength(1)
    expect(result.note).toContain('PRE-EVENT')
  })
})
