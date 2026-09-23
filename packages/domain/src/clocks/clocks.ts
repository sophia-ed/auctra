import { LifecycleState } from '../lifecycle/states'
import type { Freshness, MarketSession } from '../plan/types'

/**
 * Dual-clock model (AUCTRA.md Section 17).
 *
 * Auctra distinguishes the private market clock, the public market clock (from
 * Pyth's market session, never from local browser time) and the 24/7 onchain
 * clock, and states where the transition currently sits.
 */
export type ClockVenue = 'PRIVATE' | 'PUBLIC' | 'ONCHAIN' | 'TRANSITION'
export type ClockStatus = 'ACTIVE' | 'CLOSED' | 'LIVE' | 'PENDING' | 'NONE' | 'UNKNOWN'

export interface ClockReading {
  venue: ClockVenue
  status: ClockStatus
  label: string
  detail?: string
}

export interface ClockModel {
  asOf: string
  private: ClockReading
  public: ClockReading
  onchain: ClockReading
  transition: ClockReading
}

export interface ClockInput {
  asOf: string
  lifecycleState: LifecycleState
  marketSession?: MarketSession
  referenceFreshness?: Freshness
  mainnetEnabled?: boolean
}

/** Display labels for Pyth market sessions (Section 16). */
const SESSION_READING: Record<MarketSession, { status: ClockStatus; label: string }> = {
  regular: { status: 'ACTIVE', label: 'REGULAR' },
  preMarket: { status: 'ACTIVE', label: 'PRE MARKET' },
  postMarket: { status: 'ACTIVE', label: 'POST MARKET' },
  overNight: { status: 'ACTIVE', label: 'OVERNIGHT' },
  closed: { status: 'CLOSED', label: 'CLOSED' },
}

const PRIVATE_ACTIVE_STATES: readonly LifecycleState[] = [
  LifecycleState.PRIVATE_ACTIVE,
  LifecycleState.EVENT_ANNOUNCED,
  LifecycleState.CONVERSION_OPEN,
  LifecycleState.EXPIRING,
]

const TRANSITION_PENDING_STATES: readonly LifecycleState[] = [
  LifecycleState.EVENT_ANNOUNCED,
  LifecycleState.CONVERSION_OPEN,
  LifecycleState.PUBLIC_TRANSITION,
  LifecycleState.EXPIRING,
]

function privateClock(state: LifecycleState): ClockReading {
  if (state === LifecycleState.UNKNOWN) {
    return { venue: 'PRIVATE', status: 'UNKNOWN', label: 'PRIVATE CLOCK', detail: 'lifecycle state unknown' }
  }
  const active = PRIVATE_ACTIVE_STATES.includes(state)
  return {
    venue: 'PRIVATE',
    status: active ? 'ACTIVE' : 'CLOSED',
    label: 'PRIVATE CLOCK',
    detail: active ? `PreStock lifecycle: ${state}` : `asset has left the private state (${state})`,
  }
}

function publicClock(session: MarketSession | undefined, freshness: Freshness | undefined): ClockReading {
  if (!session) {
    return {
      venue: 'PUBLIC',
      status: 'UNKNOWN',
      label: 'PUBLIC CLOCK',
      detail: 'Pyth market session unavailable',
    }
  }
  const reading = SESSION_READING[session]
  const freshnessNote = freshness && freshness !== 'FRESH' ? ` · reference ${freshness}` : ''
  return {
    venue: 'PUBLIC',
    status: reading.status,
    label: 'PUBLIC CLOCK',
    detail: `${reading.label}${freshnessNote}`,
  }
}

function onchainClock(mainnetEnabled: boolean | undefined): ClockReading {
  return {
    venue: 'ONCHAIN',
    status: 'LIVE',
    label: 'ONCHAIN CLOCK',
    detail: mainnetEnabled === false ? '24/7 (mainnet disabled; read-only/devnet)' : '24/7',
  }
}

function transitionClock(state: LifecycleState): ClockReading {
  switch (state) {
    case LifecycleState.PRIVATE_ACTIVE:
      return { venue: 'TRANSITION', status: 'NONE', label: 'AUCTRA STATE', detail: 'no event announced' }
    case LifecycleState.EXPIRED:
    case LifecycleState.POST_EVENT:
      return { venue: 'TRANSITION', status: 'CLOSED', label: 'AUCTRA STATE', detail: `transition complete (${state})` }
    case LifecycleState.UNKNOWN:
      return { venue: 'TRANSITION', status: 'UNKNOWN', label: 'AUCTRA STATE', detail: 'state unknown' }
    default:
      return {
        venue: 'TRANSITION',
        status: 'PENDING',
        label: 'AUCTRA STATE',
        detail: TRANSITION_PENDING_STATES.includes(state) ? `transition pending (${state})` : state,
      }
  }
}

export function computeClockModel(input: ClockInput): ClockModel {
  return {
    asOf: input.asOf,
    private: privateClock(input.lifecycleState),
    public: publicClock(input.marketSession, input.referenceFreshness),
    onchain: onchainClock(input.mainnetEnabled),
    transition: transitionClock(input.lifecycleState),
  }
}
