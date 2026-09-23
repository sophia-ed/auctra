import { describe, expect, it } from 'vitest'
import { buildDbcPlan, buildTransitionCurve, computeActivation, computeFeePolicy } from '@auctra/domain'
import { buildSdkCurveParameters } from './sdk-curve'
import {
  EXPECTED_DBC_SDK_VERSION,
  REQUIRED_SDK_EXPORTS,
  SDK_FEE_DENOMINATOR,
  SDK_MAX_CURVE_POINT,
  checkSdkVersion,
  readInstalledSdkVersion,
} from './version'

/**
 * These tests run against the installed @meteora-ag/dynamic-bonding-curve-sdk
 * (Section 31), so the version guard and the curve builder reflect reality.
 */
describe('installed Meteora SDK (Section 31)', () => {
  it('matches the pinned version and exposes the required surface', async () => {
    expect(readInstalledSdkVersion()).toBe(EXPECTED_DBC_SDK_VERSION)
    expect(checkSdkVersion(readInstalledSdkVersion()).ok).toBe(true)

    const sdk = await import('@meteora-ag/dynamic-bonding-curve-sdk')
    for (const name of REQUIRED_SDK_EXPORTS) {
      expect(name in sdk).toBe(true)
    }
    expect(sdk.FEE_DENOMINATOR.toString()).toBe(SDK_FEE_DENOMINATOR)
    expect(sdk.MAX_CURVE_POINT).toBe(SDK_MAX_CURVE_POINT)
  })

  it('builds real SDK curve parameters from an Auctra plan (Section 25)', async () => {
    const curve = buildTransitionCurve({
      referencePrice: '150',
      referenceConfidenceBps: '20',
      eventIntensity: '0.7',
      mode: 'EVENT_ADAPTIVE',
      segments: 8,
      liquidityTarget: '100000',
    })
    const plan = buildDbcPlan({
      curve,
      feePolicy: computeFeePolicy({ eventIntensity: '0.7', referenceConfidenceBps: '20' }),
      activation: computeActivation({ asOf: '2026-09-23T00:00:00Z' }),
      quoteMint: 'So11111111111111111111111111111111111111112',
      migrationQuoteThreshold: '100000',
      tokenType: 'Token2022',
    })

    const built = await buildSdkCurveParameters(plan, {
      initialMarketCap: 5000,
      migrationMarketCap: 1000000,
      totalTokenSupply: 1_000_000_000,
      leftover: 500_000_000,
      tokenBaseDecimal: 6,
      tokenQuoteDecimal: 9,
    })

    expect(built.curvePoints).toBeGreaterThan(0)
    expect(built.curvePoints).toBeLessThanOrEqual(SDK_MAX_CURVE_POINT)
    // The SDK accepted the curve our weights produced.
    expect(built.validation).toBe('passed')
    expect(built.liquidityWeights).toHaveLength(SDK_MAX_CURVE_POINT)
    expect(built.warnings.some((warning) => warning.includes('resampled'))).toBe(true)
  })
})
