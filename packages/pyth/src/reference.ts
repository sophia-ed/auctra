import { ratioToBps, type ReferenceState } from '@auctra/domain'
import { type ReferenceObservation } from './observation'
import { type FreshnessResult } from './freshness'

/**
 * confidenceBps = confidence / price x 10,000 (AUCTRA.md Section 15).
 */
export function confidenceBps(price: ReferenceObservation['price'], confidence: ReferenceObservation['confidence']) {
  if (price.isZero()) throw new Error('confidenceBps: price is zero')
  return ratioToBps(confidence, price)
}

/** Map a Pyth observation + freshness into the domain reference state. */
export function toReferenceState(
  observation: ReferenceObservation,
  freshness: FreshnessResult,
): ReferenceState {
  return {
    feedId: observation.feedId,
    symbol: observation.symbol,
    price: observation.price,
    confidence: observation.confidence,
    exponent: observation.exponent,
    publisherCount: observation.publisherCount,
    marketSession: observation.marketSession,
    publishTime: observation.publishTime,
    feedUpdateTimestamp: observation.feedUpdateTimestamp,
    confidenceBps: confidenceBps(observation.price, observation.confidence),
    ageSeconds: freshness.ageSeconds,
    freshness: freshness.status,
    source: 'pyth',
  }
}
