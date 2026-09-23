import { describe, expect, it } from 'vitest'
import { buildDbcPlan, buildTransitionCurve, computeActivation, computeFeePolicy } from '@auctra/domain'
import {
  ActivationType,
  BaseFeeMode,
  EXPECTED_DBC_SDK_VERSION,
  MigrationOption,
  checkSdkVersion,
  readInstalledSdkVersion,
  toCurveBuilderParams,
  toFeeParams,
  validateDbcPlan,
} from './index'

function makePlan(overrides: { segments?: number; mode?: 'linear' | 'exponential' } = {}) {
  const curve = buildTransitionCurve({
    referencePrice: '150',
    referenceConfidenceBps: '20',
    eventIntensity: '0.7',
    mode: 'EVENT_ADAPTIVE',
    segments: overrides.segments ?? 8,
    liquidityTarget: '100000',
  })
  const feePolicy = computeFeePolicy({
    eventIntensity: '0.7',
    referenceConfidenceBps: '20',
  })
  if (overrides.mode) feePolicy.mode = overrides.mode
  const activation = computeActivation({ asOf: '2026-09-23T00:00:00Z', eventEffectiveAt: '2026-06-01T00:00:00Z' })
  return buildDbcPlan({
    curve,
    feePolicy,
    activation,
    quoteMint: 'So11111111111111111111111111111111111111112',
    migrationQuoteThreshold: '100000',
    tokenType: 'Token2022',
  })
}

describe('Meteora DBC adapter (Sections 30, 32, 79)', () => {
  it('validates a generated plan as protocol-safe', () => {
    expect(validateDbcPlan(makePlan())).toHaveLength(0)
  })

  it('never selects the deprecated RateLimiter fee mode', () => {
    const linear = toFeeParams(makePlan({ mode: 'linear' }))
    expect(linear.baseFeeMode).toBe(BaseFeeMode.FeeSchedulerLinear)
    expect(linear.baseFeeMode).not.toBe(BaseFeeMode.RateLimiter)
    expect(toFeeParams(makePlan({ mode: 'exponential' })).baseFeeMode).toBe(
      BaseFeeMode.FeeSchedulerExponential,
    )
  })

  it('maps to DAMM v2 with timestamp activation', () => {
    const params = toCurveBuilderParams(makePlan(), {
      initialMarketCap: '5000',
      migrationMarketCap: '1000000',
      tokenDecimal: 9,
    })
    expect(params.migrationOption).toBe(MigrationOption.MET_DAMM_V2)
    expect(params.activationType).toBe(ActivationType.Timestamp)
    expect(params.liquidityWeights.length).toBe(8)
    expect(params.warnings.some((warning) => warning.includes('verify'))).toBe(true)
  })

  it('flags an invalid plan rather than passing it through', () => {
    const plan = makePlan()
    // Corrupt the plan deliberately.
    plan.pricePoints[1] = plan.pricePoints[0].minus(1)
    const issues = validateDbcPlan(plan)
    expect(issues.some((issue) => issue.code === 'PRICES_NOT_ASCENDING')).toBe(true)
  })
})

describe('SDK version safety (Section 31)', () => {
  it('accepts the pinned version', () => {
    const result = checkSdkVersion(EXPECTED_DBC_SDK_VERSION)
    expect(result.ok).toBe(true)
  })

  it('fails clearly on a mismatch', () => {
    const result = checkSdkVersion('1.4.0')
    expect(result.ok).toBe(false)
    expect(result.message).toContain('mismatch')
  })

  it('fails clearly when the SDK is not installed', () => {
    const result = checkSdkVersion(null)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('not installed')
  })

  it('reads the installed version defensively (null when absent)', () => {
    expect(() => readInstalledSdkVersion()).not.toThrow()
  })
})
