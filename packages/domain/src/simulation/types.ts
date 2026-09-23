import type { Decimal } from '../math/decimal'

export type Scenario =
  | 'NORMAL'
  | 'IPO_ANNOUNCED'
  | 'IPO_IMMINENT'
  | 'PUBLIC_MARKET_OPENS'
  | 'PUBLIC_MARKET_PRICE_GAP'
  | 'HIGH_REFERENCE_UNCERTAINTY'
  | 'CONVERSION_DEADLINE_APPROACHING'
  | 'ACQUISITION_EVENT'
  | 'NO_TARGET_ASSET'

export const SCENARIOS: readonly Scenario[] = [
  'NORMAL',
  'IPO_ANNOUNCED',
  'IPO_IMMINENT',
  'PUBLIC_MARKET_OPENS',
  'PUBLIC_MARKET_PRICE_GAP',
  'HIGH_REFERENCE_UNCERTAINTY',
  'CONVERSION_DEADLINE_APPROACHING',
  'ACQUISITION_EVENT',
  'NO_TARGET_ASSET',
]

export interface SimulationCurve {
  pricePoints: Decimal[]
  /** normalized, sum to 1 */
  weights: Decimal[]
  referencePrice: Decimal
}

export interface SimulationConfig {
  id: string
  referencePrice: Decimal
  migrationQuoteThreshold: Decimal
  feeBps: number
  curve: SimulationCurve
}

export interface TradeInstruction {
  side: 'BUY' | 'SELL'
  /** Quote-denominated notional. Trades are symmetric in quote units. */
  quoteAmount: Decimal
  label?: string
}

export interface TradeSequence {
  id: string
  instructions: TradeInstruction[]
}

export interface TradeResult {
  label: string
  side: 'BUY' | 'SELL'
  quoteNotional: Decimal
  feePaid: Decimal
  baseDelta: Decimal
  avgPrice: Decimal
  entryPrice: Decimal
  exitPrice: Decimal
  priceImpactBps: number
  referenceDeviationBps: number
  slippageBps: number
  curveProgress: number
}

export interface SimulationResult {
  configId: string
  provenance: 'SIMULATED'
  assumptions: string[]
  trades: TradeResult[]
  finalPrice: Decimal
  totalQuoteConsumed: Decimal
  totalFees: Decimal
  netBase: Decimal
  averageSlippageBps: number
  maxSlippageBps: number
  finalCurveProgress: number
  finalReferenceDeviationBps: number
  migrationReady: boolean
}

export interface BaselineComparison {
  baseline: SimulationResult
  auctra: SimulationResult
  deltas: {
    averageSlippageBps: number
    maxSlippageBps: number
    totalFees: string
    finalCurveProgress: number
    finalReferenceDeviationBps: number
    liquidityConcentration: number
  }
  note: string
}
