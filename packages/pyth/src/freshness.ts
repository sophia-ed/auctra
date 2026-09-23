import type { Freshness } from '@auctra/domain'

export type { Freshness }

export interface FreshnessThresholds {
  freshSeconds: number
  agingSeconds: number
}

export const DEFAULT_FRESHNESS_THRESHOLDS: FreshnessThresholds = {
  freshSeconds: 60,
  agingSeconds: 300,
}

export function classifyFreshness(
  ageSeconds: number | undefined,
  thresholds: FreshnessThresholds = DEFAULT_FRESHNESS_THRESHOLDS,
): Freshness {
  if (ageSeconds === undefined || !Number.isFinite(ageSeconds)) return 'UNKNOWN'
  if (ageSeconds < 0) return 'UNKNOWN'
  if (ageSeconds < thresholds.freshSeconds) return 'FRESH'
  if (ageSeconds < thresholds.agingSeconds) return 'AGING'
  return 'STALE'
}

export type AgeSource = 'feedUpdateTimestamp' | 'publishTime' | 'none'

export interface FreshnessResult {
  status: Freshness
  ageSeconds?: number
  ageSource: AgeSource
  /** True when the payload carried a price forward from an earlier update. */
  carriedForward: boolean
}

export interface FreshnessInput {
  now: string
  feedUpdateTimestamp?: string
  publishTime?: string
  thresholds?: FreshnessThresholds
}

function ageBetween(now: string, then: string | undefined): number | undefined {
  if (!then) return undefined
  const nowMs = Date.parse(now)
  const thenMs = Date.parse(then)
  if (Number.isNaN(nowMs) || Number.isNaN(thenMs)) return undefined
  return Math.max(0, Math.round((nowMs - thenMs) / 1000))
}

/**
 * Freshness engine (AUCTRA.md Section 15).
 *
 *   age = now - feedUpdateTimestamp
 *
 * The freshness origin is `feedUpdateTimestamp`, never the payload receipt time,
 * so a carried-forward price is not mistaken for a freshly generated one.
 */
export function computeFreshness(input: FreshnessInput): FreshnessResult {
  const fromFeedUpdate = ageBetween(input.now, input.feedUpdateTimestamp)
  const fromPublish = ageBetween(input.now, input.publishTime)

  const ageSeconds = fromFeedUpdate ?? fromPublish
  const ageSource: AgeSource =
    fromFeedUpdate !== undefined ? 'feedUpdateTimestamp' : fromPublish !== undefined ? 'publishTime' : 'none'

  const carriedForward =
    input.feedUpdateTimestamp !== undefined &&
    input.publishTime !== undefined &&
    Date.parse(input.feedUpdateTimestamp) < Date.parse(input.publishTime)

  return {
    status: classifyFreshness(ageSeconds, input.thresholds),
    ageSeconds,
    ageSource,
    carriedForward,
  }
}
