import { Decimal, type MarketSession } from '@auctra/domain'

/**
 * Reference observation (AUCTRA.md Section 14). Mirrors the documented Pyth
 * payload: price, confidence, exponent, market session and feed freshness.
 */
export interface ReferenceObservation {
  feedId: string
  symbol: string
  price: Decimal
  confidence: Decimal
  exponent: number
  publisherCount?: number
  marketSession?: MarketSession
  publishTime: string
  /** Timestamp when the price was last generated (authoritative freshness). */
  feedUpdateTimestamp?: string
  source: 'pyth'
}

export const MARKET_SESSIONS: readonly MarketSession[] = [
  'regular',
  'preMarket',
  'postMarket',
  'overNight',
  'closed',
]

export function toMarketSession(value: string | undefined): MarketSession | undefined {
  if (!value) return undefined
  return (MARKET_SESSIONS as readonly string[]).includes(value) ? (value as MarketSession) : undefined
}

/**
 * mantissa x 10^exponent -> decimal price.
 * Pyth encodes price and confidence as integer mantissas with a decimal exponent.
 */
export function mantissaToDecimal(mantissa: bigint | number | string, exponent: number): Decimal {
  return new Decimal(mantissa.toString()).times(new Decimal(10).pow(exponent))
}
