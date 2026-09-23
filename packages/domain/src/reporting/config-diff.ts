import { Decimal, dec, type DecimalInput } from '../math/decimal'
import { ratioToBps } from '../math/bps'
import type { DbcPlan } from '../policy/dbc'

/**
 * Configuration diff (AUCTRA.md Section 55).
 * BASELINE vs AUCTRA, parameter by parameter.
 */
export interface ParameterDiff {
  parameter: string
  baseline: string
  auctra: string
  delta?: string
}

export interface ConfigurationDiff {
  curve: ParameterDiff[]
  liquidity: ParameterDiff[]
  fees: ParameterDiff[]
  activation: ParameterDiff[]
  migration: ParameterDiff[]
  summary: string
}

function concentration(weights: Decimal[]): Decimal {
  return weights.reduce((sum, weight) => sum.plus(weight.times(weight)), new Decimal(0))
}

export function diffDbcPlans(baseline: DbcPlan, auctra: DbcPlan): ConfigurationDiff {
  const baselineConcentration = concentration(baseline.liquidityWeights)
  const auctraConcentration = concentration(auctra.liquidityWeights)

  const curve: ParameterDiff[] = [
    {
      parameter: 'curveMode',
      baseline: baseline.curveMode,
      auctra: auctra.curveMode,
    },
    {
      parameter: 'segments',
      baseline: String(baseline.segments),
      auctra: String(auctra.segments),
      delta: String(auctra.segments - baseline.segments),
    },
    {
      parameter: 'topPrice',
      baseline: baseline.pricePoints[baseline.pricePoints.length - 1].toFixed(6),
      auctra: auctra.pricePoints[auctra.pricePoints.length - 1].toFixed(6),
    },
  ]

  const liquidity: ParameterDiff[] = [
    {
      parameter: 'concentration (HHI)',
      baseline: baselineConcentration.toFixed(6),
      auctra: auctraConcentration.toFixed(6),
      delta: auctraConcentration.minus(baselineConcentration).toFixed(6),
    },
  ]

  const fees: ParameterDiff[] = [
    {
      parameter: 'startingFeeBps',
      baseline: String(baseline.feePolicy.startingFeeBps),
      auctra: String(auctra.feePolicy.startingFeeBps),
      delta: String(auctra.feePolicy.startingFeeBps - baseline.feePolicy.startingFeeBps),
    },
    {
      parameter: 'endingFeeBps',
      baseline: String(baseline.feePolicy.endingFeeBps),
      auctra: String(auctra.feePolicy.endingFeeBps),
      delta: String(auctra.feePolicy.endingFeeBps - baseline.feePolicy.endingFeeBps),
    },
    {
      parameter: 'feeMode',
      baseline: baseline.feePolicy.mode,
      auctra: auctra.feePolicy.mode,
    },
  ]

  const activation: ParameterDiff[] = [
    { parameter: 'activationType', baseline: baseline.activation.type, auctra: auctra.activation.type },
    {
      parameter: 'activationPoint',
      baseline: baseline.activation.timestamp ?? 'n/a',
      auctra: auctra.activation.timestamp ?? 'n/a',
    },
  ]

  const migration: ParameterDiff[] = [
    {
      parameter: 'migrationThreshold',
      baseline: baseline.migrationQuoteThreshold.toString(),
      auctra: auctra.migrationQuoteThreshold.toString(),
      delta: auctra.migrationQuoteThreshold.minus(baseline.migrationQuoteThreshold).toString(),
    },
    { parameter: 'migrationOption', baseline: baseline.migrationOption, auctra: auctra.migrationOption },
  ]

  const diffs = [...curve, ...liquidity, ...fees, ...activation, ...migration]
  const changed = diffs.filter((diff) => diff.delta !== undefined && diff.delta !== '0').length

  return {
    curve,
    liquidity,
    fees,
    activation,
    migration,
    summary: `${changed} parameter(s) differ between BASELINE and AUCTRA.`,
  }
}

/** §52 conversion-aware comparison helper reused by reporting. */
export function normalizedDifference(
  normalizedSourceValue: DecimalInput,
  targetReference: DecimalInput,
): { absolute: Decimal; bps: Decimal } {
  const normalized = dec(normalizedSourceValue)
  const target = dec(targetReference)
  const absolute = normalized.minus(target)
  return { absolute, bps: ratioToBps(absolute, target) }
}
