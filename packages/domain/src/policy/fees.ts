import { Decimal, dec, type DecimalInput } from '../math/decimal'
import { clamp01, clampDecimal } from '../math/bps'
import { explain, type PolicyExplanation } from './explanation'

export type FeeMode = 'linear' | 'exponential'

export interface DbcFeePolicy {
  mode: FeeMode
  startingFeeBps: number
  endingFeeBps: number
  durationSeconds: number
  reason: string
  explanation: PolicyExplanation[]
}

export interface FeePolicyInput {
  eventIntensity: DecimalInput
  referenceConfidenceBps?: DecimalInput
  deadlineDistanceSeconds?: number
  launchPhase?: 'EARLY' | 'ACTIVE' | 'MATURE'
  marketSession?: string
}

const MIN_FEE_BPS = 10
const MAX_FEE_BPS = 1000
const HOUR = 3600
const DAY = 24 * HOUR

/**
 * Fee policy (AUCTRA.md Section 27).
 *
 * Values are generated from structured inputs (event intensity, reference
 * uncertainty, time to deadline, launch phase). Only the currently supported
 * fee-scheduler modes are used — RateLimiter is deprecated for new DBC configs.
 */
export function computeFeePolicy(input: FeePolicyInput): DbcFeePolicy {
  const intensity = clamp01(input.eventIntensity)
  const confBps = input.referenceConfidenceBps === undefined ? new Decimal(0) : dec(input.referenceConfidenceBps)
  const confNorm = clamp01(confBps.div(100))

  const startingExact = new Decimal(60)
    .plus(intensity.times(300))
    .plus(confNorm.times(120))
  const startingFeeBps = Math.round(
    clampDecimal(startingExact, MIN_FEE_BPS, MAX_FEE_BPS).toNumber(),
  )

  const endingExact = startingExact.times(new Decimal(0.3).plus(new Decimal(1).minus(intensity).times(0.2)))
  const endingFeeBps = Math.round(clampDecimal(endingExact, MIN_FEE_BPS, MAX_FEE_BPS).toNumber())

  const phaseMultiplier = input.launchPhase === 'MATURE' ? 0.5 : input.launchPhase === 'ACTIVE' ? 0.75 : 1
  const targetDuration =
    input.deadlineDistanceSeconds === undefined
      ? 3 * DAY
      : Math.min(input.deadlineDistanceSeconds, 7 * DAY)
  const durationSeconds = Math.round(
    clampDecimal(new Decimal(targetDuration).times(phaseMultiplier), HOUR, 30 * DAY).toNumber(),
  )

  const mode: FeeMode = intensity.gt('0.6') ? 'exponential' : 'linear'
  const reason = `intensity ${intensity.toFixed(3)} + confidence ${confBps.toFixed(1)}bps -> start ${startingFeeBps}bps, end ${endingFeeBps}bps, ${mode} over ${durationSeconds}s`

  return {
    mode,
    startingFeeBps,
    endingFeeBps,
    durationSeconds,
    reason,
    explanation: [
      explain('eventIntensity', 'sets the starting fee', `${startingFeeBps} bps`),
      explain(
        `reference uncertainty ${confBps.toFixed(2)} bps`,
        'adds a premium to the starting fee',
        `+${Math.round(confNorm.times(120).toNumber())} bps`,
      ),
      explain('eventIntensity decay', 'sets the ending fee', `${endingFeeBps} bps`),
      explain(
        input.deadlineDistanceSeconds === undefined ? 'no deadline' : 'time to deadline',
        'sets the fee schedule duration',
        `${durationSeconds}s (${mode})`,
      ),
    ],
  }
}
