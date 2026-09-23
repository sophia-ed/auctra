/**
 * Lifecycle states (AUCTRA.md Section 8).
 *
 * Lifecycle state is ALWAYS derived from stored events via the machine in
 * `machine.ts`. UI code must never assign a state directly.
 */
export enum LifecycleState {
  PRIVATE_ACTIVE = 'PRIVATE_ACTIVE',
  EVENT_ANNOUNCED = 'EVENT_ANNOUNCED',
  CONVERSION_OPEN = 'CONVERSION_OPEN',
  PUBLIC_TRANSITION = 'PUBLIC_TRANSITION',
  POST_EVENT = 'POST_EVENT',
  EXPIRING = 'EXPIRING',
  EXPIRED = 'EXPIRED',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Rank used only to break ties between two states derived at the same instant.
 * Higher = more advanced. This is NOT the transition graph.
 */
export const STATE_RANK: Record<LifecycleState, number> = {
  [LifecycleState.UNKNOWN]: 0,
  [LifecycleState.PRIVATE_ACTIVE]: 1,
  [LifecycleState.EVENT_ANNOUNCED]: 2,
  [LifecycleState.CONVERSION_OPEN]: 3,
  [LifecycleState.PUBLIC_TRANSITION]: 4,
  [LifecycleState.EXPIRING]: 5,
  [LifecycleState.POST_EVENT]: 6,
  [LifecycleState.EXPIRED]: 7,
}

export function isTerminal(state: LifecycleState): boolean {
  return state === LifecycleState.EXPIRED || state === LifecycleState.POST_EVENT
}

/**
 * Allowed transitions (AUCTRA.md Section 11). The reducer derives transitions
 * from event time lines; this table is used to assert that the derivation never
 * emits an implausible edge.
 */
export const ALLOWED_TRANSITIONS: Record<LifecycleState, readonly LifecycleState[]> = {
  [LifecycleState.UNKNOWN]: Object.values(LifecycleState),
  [LifecycleState.PRIVATE_ACTIVE]: [LifecycleState.EVENT_ANNOUNCED, LifecycleState.UNKNOWN],
  [LifecycleState.EVENT_ANNOUNCED]: [
    LifecycleState.CONVERSION_OPEN,
    LifecycleState.PUBLIC_TRANSITION,
    LifecycleState.EXPIRING,
    LifecycleState.EXPIRED,
    LifecycleState.UNKNOWN,
  ],
  [LifecycleState.CONVERSION_OPEN]: [
    LifecycleState.PUBLIC_TRANSITION,
    LifecycleState.EXPIRING,
    LifecycleState.EXPIRED,
    LifecycleState.POST_EVENT,
    LifecycleState.UNKNOWN,
  ],
  [LifecycleState.PUBLIC_TRANSITION]: [
    LifecycleState.POST_EVENT,
    LifecycleState.EXPIRING,
    LifecycleState.EXPIRED,
    LifecycleState.UNKNOWN,
  ],
  [LifecycleState.EXPIRING]: [
    LifecycleState.EXPIRED,
    LifecycleState.POST_EVENT,
    LifecycleState.UNKNOWN,
  ],
  [LifecycleState.POST_EVENT]: [LifecycleState.UNKNOWN],
  [LifecycleState.EXPIRED]: [LifecycleState.UNKNOWN],
}

export function isAllowedTransition(from: LifecycleState, to: LifecycleState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}
