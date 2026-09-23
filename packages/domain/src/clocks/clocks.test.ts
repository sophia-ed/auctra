import { describe, expect, it } from 'vitest'
import { LifecycleState, computeClockModel } from '../index'

describe('dual-clock model (Section 17)', () => {
  it('shows the three clocks during a public transition with a closed market', () => {
    const clocks = computeClockModel({
      asOf: '2026-09-23T12:59:10.000Z',
      lifecycleState: LifecycleState.PUBLIC_TRANSITION,
      marketSession: 'closed',
      referenceFreshness: 'FRESH',
      mainnetEnabled: false,
    })
    expect(clocks.private.status).toBe('CLOSED')
    expect(clocks.public.status).toBe('CLOSED')
    expect(clocks.public.label).toBe('PUBLIC CLOCK')
    expect(clocks.onchain.status).toBe('LIVE')
    expect(clocks.transition.status).toBe('PENDING')
    expect(clocks.onchain.detail).toContain('24/7')
  })

  it('shows a private asset active with a regular public session', () => {
    const clocks = computeClockModel({
      asOf: '2026-09-23T12:59:10.000Z',
      lifecycleState: LifecycleState.PRIVATE_ACTIVE,
      marketSession: 'regular',
    })
    expect(clocks.private.status).toBe('ACTIVE')
    expect(clocks.public.status).toBe('ACTIVE')
    expect(clocks.transition.status).toBe('NONE')
  })

  it('does not invent a session when Pyth provides none', () => {
    const clocks = computeClockModel({
      asOf: '2026-09-23T12:59:10.000Z',
      lifecycleState: LifecycleState.EVENT_ANNOUNCED,
    })
    expect(clocks.public.status).toBe('UNKNOWN')
    expect(clocks.public.detail).toContain('unavailable')
  })

  it('marks an expired transition as closed', () => {
    const clocks = computeClockModel({
      asOf: '2026-09-23T12:59:10.000Z',
      lifecycleState: LifecycleState.EXPIRED,
    })
    expect(clocks.private.status).toBe('CLOSED')
    expect(clocks.transition.status).toBe('CLOSED')
  })
})
