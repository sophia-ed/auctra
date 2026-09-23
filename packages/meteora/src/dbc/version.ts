import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

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

/** Expected exports the adapter depends on, verified against the installed SDK (dist/index.d.ts). */
export const REQUIRED_SDK_EXPORTS: readonly string[] = [
  'buildCurveWithLiquidityWeights',
  'buildCurveWithCustomSqrtPrices',
  'DynamicBondingCurveClient',
  'getFeeSchedulerParams',
  'validateCurve',
  'validateConfigParameters',
]

/**
 * Fee denominator confirmed from the installed SDK (`FEE_DENOMINATOR`), which
 * matches `PROVISIONAL_FEE_DENOMINATOR`. Curve points are capped at 16
 * (`MAX_CURVE_POINT`).
 */
export const SDK_FEE_DENOMINATOR = '1000000000'
export const SDK_MAX_CURVE_POINT = 16

/**
 * Pool reads are methods on the client, not top-level exports. Confirmed in the
 * installed `dist/index.d.ts`:
 *   state.getPool(poolAddress)
 *   state.getPoolConfig(configAddress)
 *   state.getPoolQuoteTokenCurveProgress(poolAddress)
 *   state.getPoolMigrationQuoteThreshold(poolAddress)
 */
export const CLIENT_POOL_READ_METHODS: readonly string[] = [
  'getPool',
  'getPoolConfig',
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
 *
 * The package's `exports` map only exposes the root entry, so `package.json`
 * cannot be resolved directly; we resolve the entry and walk up to its
 * package.json instead.
 */
export function readInstalledSdkVersion(): string | null {
  try {
    const require = createRequire(import.meta.url)
    const entry = require.resolve('@meteora-ag/dynamic-bonding-curve-sdk')
    let dir = dirname(entry)
    for (let depth = 0; depth < 6; depth += 1) {
      const candidate = join(dir, 'package.json')
      if (existsSync(candidate)) {
        const pkg = JSON.parse(readFileSync(candidate, 'utf8')) as { name?: string; version?: string }
        if (pkg.name === '@meteora-ag/dynamic-bonding-curve-sdk') return pkg.version ?? null
      }
      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
    return null
  } catch {
    return null
  }
}
