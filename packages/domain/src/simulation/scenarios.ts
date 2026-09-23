import { Decimal } from '../math/decimal'
import type { Scenario, TradeSequence } from './types'

export interface ScenarioPreset {
  id: Scenario
  label: string
  description: string
  /** Shift applied to the reference price before compiling the curve. */
  referenceShockBps: number
  referenceConfidenceBps: number
  eventIntensityOverride?: number
  feeBps: number
  sequence: TradeSequence
}

function quote(amount: string) {
  return new Decimal(amount)
}

const BASE_SEQUENCE: TradeSequence = {
  id: 'base-5-trade',
  instructions: [
    { side: 'BUY', quoteAmount: quote('1000'), label: 'buy-1' },
    { side: 'BUY', quoteAmount: quote('2500'), label: 'buy-2' },
    { side: 'SELL', quoteAmount: quote('1500'), label: 'sell-1' },
    { side: 'BUY', quoteAmount: quote('5000'), label: 'buy-3' },
    { side: 'SELL', quoteAmount: quote('2000'), label: 'sell-2' },
  ],
}

function sequence(id: string, amounts: readonly [('BUY' | 'SELL'), string][]): TradeSequence {
  return {
    id,
    instructions: amounts.map(([side, amount], index) => ({
      side,
      quoteAmount: quote(amount),
      label: `${side.toLowerCase()}-${index + 1}`,
    })),
  }
}

const PRESETS: Record<Scenario, ScenarioPreset> = {
  NORMAL: {
    id: 'NORMAL',
    label: 'Normal',
    description: 'Baseline conditions with no announced event.',
    referenceShockBps: 0,
    referenceConfidenceBps: 5,
    feeBps: 120,
    sequence: BASE_SEQUENCE,
  },
  IPO_ANNOUNCED: {
    id: 'IPO_ANNOUNCED',
    label: 'IPO announced',
    description: 'An IPO has been announced; the deadline is distant.',
    referenceShockBps: 150,
    referenceConfidenceBps: 12,
    eventIntensityOverride: 0.45,
    feeBps: 140,
    sequence: BASE_SEQUENCE,
  },
  IPO_IMMINENT: {
    id: 'IPO_IMMINENT',
    label: 'IPO imminent',
    description: 'The IPO window is days away; the deadline is close.',
    referenceShockBps: 400,
    referenceConfidenceBps: 25,
    eventIntensityOverride: 0.8,
    feeBps: 160,
    sequence: sequence('ipo-imminent', [['BUY', '3000'], ['BUY', '6000'], ['SELL', '2500'], ['BUY', '8000']]),
  },
  PUBLIC_MARKET_OPENS: {
    id: 'PUBLIC_MARKET_OPENS',
    label: 'Public market opens',
    description: 'The public market session opens and the reference moves.',
    referenceShockBps: 900,
    referenceConfidenceBps: 30,
    eventIntensityOverride: 0.75,
    feeBps: 120,
    sequence: sequence('public-open', [['BUY', '5000'], ['BUY', '5000'], ['BUY', '5000']]),
  },
  PUBLIC_MARKET_PRICE_GAP: {
    id: 'PUBLIC_MARKET_PRICE_GAP',
    label: 'Public market price gap',
    description: 'The public reference prints far from the transition reference.',
    referenceShockBps: 2500,
    referenceConfidenceBps: 60,
    eventIntensityOverride: 0.9,
    feeBps: 120,
    sequence: sequence('price-gap', [['BUY', '10000'], ['SELL', '4000'], ['BUY', '10000']]),
  },
  HIGH_REFERENCE_UNCERTAINTY: {
    id: 'HIGH_REFERENCE_UNCERTAINTY',
    label: 'High reference uncertainty',
    description: 'The external reference has a wide confidence interval.',
    referenceShockBps: 0,
    referenceConfidenceBps: 95,
    eventIntensityOverride: 0.6,
    feeBps: 150,
    sequence: BASE_SEQUENCE,
  },
  CONVERSION_DEADLINE_APPROACHING: {
    id: 'CONVERSION_DEADLINE_APPROACHING',
    label: 'Conversion deadline approaching',
    description: 'A conversion deadline is close and holders face a decision.',
    referenceShockBps: 250,
    referenceConfidenceBps: 20,
    eventIntensityOverride: 0.85,
    feeBps: 150,
    sequence: sequence('deadline', [['SELL', '4000'], ['SELL', '4000'], ['BUY', '3000']]),
  },
  ACQUISITION_EVENT: {
    id: 'ACQUISITION_EVENT',
    label: 'Acquisition event',
    description: 'An acquisition conversion window is open.',
    referenceShockBps: 300,
    referenceConfidenceBps: 18,
    eventIntensityOverride: 0.7,
    feeBps: 140,
    sequence: BASE_SEQUENCE,
  },
  NO_TARGET_ASSET: {
    id: 'NO_TARGET_ASSET',
    label: 'No target asset',
    description: 'No verified target reference exists; the transition gap is NOT COMPUTABLE.',
    referenceShockBps: 0,
    referenceConfidenceBps: 40,
    eventIntensityOverride: 0.5,
    feeBps: 130,
    sequence: BASE_SEQUENCE,
  },
}

export function getScenarioPreset(id: Scenario): ScenarioPreset {
  return PRESETS[id]
}

export function listScenarioPresets(): ScenarioPreset[] {
  return Object.values(PRESETS)
}
