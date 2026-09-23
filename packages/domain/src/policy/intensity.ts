import { Decimal, dec, type DecimalInput } from '../math/decimal'
import { clamp01 } from '../math/bps'
import type { LifecycleEventType } from '../lifecycle/events'
import { explain, type PolicyExplanation } from './explanation'

/**
 * Event severity is an internal policy weight, NOT a prediction of price
 * movement or volatility (AUCTRA.md Sections 26 and 66).
 */
export const EVENT_SEVERITY: Record<LifecycleEventType, number> = {
  IPO: 0.9,
  ACQUISITION: 0.85,
  MERGER: 0.8,
  CONVERSION: 0.7,
  EXPIRATION: 0.6,
  CORPORATE_ACTION: 0.5,
  CUSTOM: 0.4,
}

/** Time constant for the documented temporal decay, in days. */
export const EVENT_INTENSITY_TAU_DAYS = 30
/** Reference uncertainty (bps) treated as the saturation point. */
export const UNCERTAINTY_SATURATION_BPS = 100

export interface EventIntensityInput {
  eventType: LifecycleEventType
  /** event confidence, 0..1 */
  eventConfidence: number
  deadlineDistanceSeconds?: number
  referenceConfidenceBps?: DecimalInput
  marketSession?: string
}

export interface EventIntensityResult {
  intensity: Decimal
  components: {
    severity: Decimal
    confidenceFactor: Decimal
    timeFactor: Decimal
    uncertaintyFactor: Decimal
  }
  explanation: PolicyExplanation[]
}

/**
 * Event intensity in [0, 1] (AUCTRA.md Section 26).
 *
 *   timeFactor(seconds) = 1 / (1 + days / TAU),  days = seconds / 86400
 *   uncertaintyFactor   = min(confidenceBps / saturation, 1)
 *   base                = 0.55*severity + 0.25*confidenceFactor + 0.20*uncertaintyFactor
 *   intensity           = base * (0.5 + 0.5*timeFactor)
 *
 * With no deadline, timeFactor is neutral (0.5). The output is an internal
 * policy variable and is never labelled "predicted volatility".
 */
export function computeEventIntensity(input: EventIntensityInput): EventIntensityResult {
  const severity = dec(EVENT_SEVERITY[input.eventType])
  const confidenceFactor = clamp01(input.eventConfidence)

  let timeFactor: Decimal
  let timeLabel: string
  if (input.deadlineDistanceSeconds === undefined) {
    timeFactor = new Decimal(0.5)
    timeLabel = 'no deadline (neutral)'
  } else {
    const days = new Decimal(Math.max(0, input.deadlineDistanceSeconds)).div(86400)
    timeFactor = new Decimal(1).div(days.div(EVENT_INTENSITY_TAU_DAYS).plus(1))
    timeLabel = `${days.toFixed(2)} days to deadline`
  }

  const confBps = input.referenceConfidenceBps === undefined ? new Decimal(0) : dec(input.referenceConfidenceBps)
  const uncertaintyFactor = clamp01(confBps.div(UNCERTAINTY_SATURATION_BPS))

  const base = severity
    .times(0.55)
    .plus(confidenceFactor.times(0.25))
    .plus(uncertaintyFactor.times(0.2))
  const intensity = clamp01(base.times(timeFactor.times(0.5).plus(0.5)))

  return {
    intensity,
    components: { severity, confidenceFactor, timeFactor, uncertaintyFactor },
    explanation: [
      explain(
        `${input.eventType} severity`,
        'sets the base policy weight',
        severity.toString(),
      ),
      explain(
        `event confidence ${confidenceFactor.toString()}`,
        'scales how strongly the event drives the policy',
        confidenceFactor.toString(),
      ),
      explain(
        timeLabel,
        'applies the documented temporal decay',
        `timeFactor ${timeFactor.toFixed(4)}`,
      ),
      explain(
        `reference uncertainty ${confBps.toFixed(2)} bps`,
        'raises the policy weight when the reference is less certain',
        `uncertaintyFactor ${uncertaintyFactor.toFixed(4)}`,
      ),
      explain(
        'combined',
        'produces the internal policy variable',
        `eventIntensity ${intensity.toFixed(4)}`,
      ),
    ],
  }
}
