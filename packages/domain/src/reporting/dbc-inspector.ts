import type { DbcPlan } from '../policy/dbc'
import { toJsonValue } from '../serialize/json'

/**
 * DBC configuration inspector (AUCTRA.md Section 32).
 *
 * Exposes the generated configuration both as human-readable rows and as raw
 * JSON, so a reviewer can inspect exactly what would be deployed.
 */
export interface InspectorRow {
  field: string
  label: string
  value: string
}

export interface DbcInspection {
  curveMode: string
  segments: number
  liquidityWeights: number[]
  baseFeeMode: string
  feeSchedule: {
    mode: string
    startingFeeBps: number
    endingFeeBps: number
    durationSeconds: number
  }
  activationType: string
  activationPoint?: string
  dynamicFee: string
  quoteMint: string
  migrationOption: string
  migrationFee: string
  migrationThreshold: string
  warnings: string[]
  rows: InspectorRow[]
  raw: unknown
}

export function buildDbcInspection(plan: DbcPlan): DbcInspection {
  const baseFeeMode = plan.feePolicy.mode === 'exponential' ? 'FEE SCHEDULER EXPONENTIAL' : 'FEE SCHEDULER LINEAR'
  const rows: InspectorRow[] = [
    { field: 'curveMode', label: 'BUILD CURVE MODE', value: plan.curveMode },
    { field: 'segments', label: 'CURVE SEGMENTS', value: String(plan.segments) },
    {
      field: 'liquidityWeights',
      label: 'LIQUIDITY WEIGHTS',
      value: plan.liquidityWeights.map((weight) => weight.toFixed(6)).join(', '),
    },
    { field: 'baseFeeMode', label: 'BASE FEE MODE', value: baseFeeMode },
    {
      field: 'feeSchedule',
      label: 'FEE SCHEDULE',
      value: `${plan.feePolicy.startingFeeBps} bps -> ${plan.feePolicy.endingFeeBps} bps over ${plan.feePolicy.durationSeconds}s`,
    },
    { field: 'activationType', label: 'ACTIVATION TYPE', value: plan.activationType },
    {
      field: 'activationPoint',
      label: 'ACTIVATION POINT',
      value: plan.activation.timestamp ?? 'n/a',
    },
    { field: 'dynamicFee', label: 'DYNAMIC FEE', value: 'see fee policy; dynamic fee is capped by the protocol' },
    { field: 'quoteMint', label: 'QUOTE MINT', value: plan.quoteMint },
    { field: 'migrationOption', label: 'MIGRATION OPTION', value: plan.migrationOption },
    { field: 'migrationFee', label: 'MIGRATION FEE', value: 'set by migrationFeeOption at config creation' },
    {
      field: 'migrationThreshold',
      label: 'MIGRATION THRESHOLD',
      value: plan.migrationQuoteThreshold.toString(),
    },
  ]

  return {
    curveMode: plan.curveMode,
    segments: plan.segments,
    liquidityWeights: plan.liquidityWeights.map((weight) => weight.toNumber()),
    baseFeeMode,
    feeSchedule: {
      mode: plan.feePolicy.mode,
      startingFeeBps: plan.feePolicy.startingFeeBps,
      endingFeeBps: plan.feePolicy.endingFeeBps,
      durationSeconds: plan.feePolicy.durationSeconds,
    },
    activationType: plan.activationType,
    activationPoint: plan.activation.timestamp,
    dynamicFee: 'configuration-dependent',
    quoteMint: plan.quoteMint,
    migrationOption: plan.migrationOption,
    migrationFee: 'protocol-configured',
    migrationThreshold: plan.migrationQuoteThreshold.toString(),
    warnings: plan.warnings,
    rows,
    raw: toJsonValue({
      curveMode: plan.curveMode,
      segments: plan.segments,
      pricePoints: plan.pricePoints,
      sqrtPrices: plan.sqrtPrices,
      liquidityWeights: plan.liquidityWeights,
      liquidityWeightsRelative: plan.liquidityWeightsRelative,
      feePolicy: plan.feePolicy,
      activation: plan.activation,
      quoteMint: plan.quoteMint,
      migrationOption: plan.migrationOption,
      collectFeeMode: plan.collectFeeMode,
      tokenType: plan.tokenType,
      activationType: plan.activationType,
      migrationQuoteThreshold: plan.migrationQuoteThreshold,
      warnings: plan.warnings,
    }),
  }
}
