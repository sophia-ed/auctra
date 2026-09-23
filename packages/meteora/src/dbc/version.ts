import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

/**
 * Pinned Meteora DBC SDK version (docs/sdk-versions.md, Section 31).
 * `latest` on npm at 2026-09-23T12:59Z.
 */
export const EXPECTED_DBC_SDK_VERSION = '1.5.12'

/**
 * DBC on-chain program id, recorded from the SDK test harness and public
 * integrations. NOT yet confirmed against the published IDL — confirm before use.
 */
export const DBC_PROGRAM_ID = 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN'

/** Expected exports the adapter depends on (Section 31). */
export const REQUIRED_SDK_EXPORTS: readonly string[] = [
  'buildCurveWithLiquidityWeights',
  'buildCurveWithCustomSqrtPrices',
  'DynamicBondingCurveClient',
  'getFeeSchedulerParams',
  'getPoolQuoteTokenCurveProgress',
  'getPoolMigrationQuoteThreshold',
]

export interface VersionCheckResult {
  ok: boolean
  installed: string | null
  expected: string
  message: string
}

/**
 * Compare an installed SDK version against the pin. Fails clearly (Section 31).
 */
export function checkSdkVersion(installed: string | null): VersionCheckResult {
  if (installed === null) {
    return {
      ok: false,
      installed: null,
      expected: EXPECTED_DBC_SDK_VERSION,
      message:
        `@meteora-ag/dynamic-bonding-curve-sdk is not installed. Expected ${EXPECTED_DBC_SDK_VERSION}. ` +
        `Install and re-run the version check before the deployment phase.`,
    }
  }
  if (installed !== EXPECTED_DBC_SDK_VERSION) {
    return {
      ok: false,
      installed,
      expected: EXPECTED_DBC_SDK_VERSION,
      message: `DBC SDK version mismatch: installed ${installed}, expected ${EXPECTED_DBC_SDK_VERSION}.`,
    }
  }
  return {
    ok: true,
    installed,
    expected: EXPECTED_DBC_SDK_VERSION,
    message: `DBC SDK OK (${installed}).`,
  }
}

/**
 * Best-effort read of the installed SDK version. Returns null when the SDK is
 * not installed; never throws, and never imports the SDK at module load.
 */
export function readInstalledSdkVersion(): string | null {
  try {
    const require = createRequire(import.meta.url)
    const pkgPath = require.resolve('@meteora-ag/dynamic-bonding-curve-sdk/package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string }
    return pkg.version ?? null
  } catch {
    return null
  }
}
