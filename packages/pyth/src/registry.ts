import type { MarketSession } from '@auctra/domain'

export type PythFeedRole = 'PRIVATE_REFERENCE' | 'PUBLIC_EQUITY' | 'INDEX_24_7' | 'XSTOCK' | 'REDEMPTION_RATE'

export interface PythFeedRegistryEntry {
  /** The PreStocks (or public) symbol this feed can reference. */
  assetSymbol: string
  role: PythFeedRole
  feedId: string
  pythSymbol: string
  description: string
  retrievedAt: string
  source: 'pyth'
}

/**
 * Verified Pyth feeds recorded during the research audit (docs/research/2026-09-23-pyth.md).
 * Feed IDs are captured verbatim from `https://hermes.pyth.network/v2/price_feeds`.
 * Only assets with a confirmed feed appear here; absence is meaningful (Section 18/52).
 */
export const VERIFIED_PYTH_FEEDS: readonly PythFeedRegistryEntry[] = [
  {
    assetSymbol: 'OPENAI',
    role: 'INDEX_24_7',
    feedId: '96d4bb23a3db78fdb72b3a03ce80ead686096f324319166534d9a27c0519c483',
    pythSymbol: 'Equity.Index.OPENAI/USD',
    description: 'PYTH PRICE IN USD FOR OPENAI 24/7',
    retrievedAt: '2026-09-23T12:57:00.000Z',
    source: 'pyth',
  },
  {
    assetSymbol: 'ANTHROPIC',
    role: 'INDEX_24_7',
    feedId: '5da511a7c68b17a3bc94380cab4756bc83ab87f86307af10ea58467a64b6689d',
    pythSymbol: 'Equity.Index.ANTHROPIC/USD',
    description: 'PYTH PRICE IN USD FOR ANTHROPIC 24/7',
    retrievedAt: '2026-09-23T12:57:00.000Z',
    source: 'pyth',
  },
  {
    assetSymbol: 'SPCX',
    role: 'PUBLIC_EQUITY',
    feedId: '8a593d6edde7a3095213c88116d8840d01e93c2ddeb800bc891772eb8b93bb94',
    pythSymbol: 'Equity.US.SPCX/USD',
    description: 'SPACE EXPLORATION TECHNOLOGY CORP / US DOLLAR',
    retrievedAt: '2026-09-23T12:58:00.000Z',
    source: 'pyth',
  },
  {
    assetSymbol: 'SPCX',
    role: 'INDEX_24_7',
    feedId: '2dbfb1791e75725227a90dbd23c6bdd83b80cc9d13011973c948b6aeacdf17b9',
    pythSymbol: 'Equity.Index.SPCX/USD',
    description: 'PYTH PRICE IN USD FOR SPCX 24/7',
    retrievedAt: '2026-09-23T12:58:00.000Z',
    source: 'pyth',
  },
  {
    assetSymbol: 'SPCX',
    role: 'XSTOCK',
    feedId: 'e8e2234a06b288fedde43ae9450cb288886ecb3259ad2f41d0067f02244a0101',
    pythSymbol: 'Crypto.SPCXX/USD',
    description: 'SPACE EXPLORATION TECHNOLOGY CORP XSTOCK / US DOLLAR',
    retrievedAt: '2026-09-23T12:58:00.000Z',
    source: 'pyth',
  },
  {
    assetSymbol: 'SPCX',
    role: 'REDEMPTION_RATE',
    feedId: '3bd917356e64e4eb1355adefd2caf09cf0716bbdb58012907bdcad63ab21064e',
    pythSymbol: 'Crypto.SPCXX/SPCX.RR',
    description: 'SPCX xStock redemption rate',
    retrievedAt: '2026-09-23T12:58:00.000Z',
    source: 'pyth',
  },
  {
    assetSymbol: 'TSLA',
    role: 'PUBLIC_EQUITY',
    feedId: '16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1',
    pythSymbol: 'Equity.US.TSLA/USD',
    description: 'TESLA INC / US DOLLAR',
    retrievedAt: '2026-09-23T12:58:00.000Z',
    source: 'pyth',
  },
]

export function feedsForAsset(assetSymbol: string): PythFeedRegistryEntry[] {
  const wanted = assetSymbol.toUpperCase()
  return VERIFIED_PYTH_FEEDS.filter((entry) => entry.assetSymbol === wanted)
}

export function findFeedBySymbol(pythSymbol: string): PythFeedRegistryEntry | undefined {
  return VERIFIED_PYTH_FEEDS.find((entry) => entry.pythSymbol === pythSymbol)
}

/** Assets known to have no Pyth reference in the current registry. */
export const ASSETS_WITHOUT_REFERENCE: readonly string[] = [
  'ANDURIL',
  'FIGUREAI',
  'KALSHI',
  'NEURALINK',
  'POLYMARKET',
  'XAI',
]

export function hasMarketReference(assetSymbol: string): boolean {
  return feedsForAsset(assetSymbol).length > 0
}

/** Session semantics of a feed role, for the dual-clock model. */
export function roleSession(role: PythFeedRole): MarketSession | 'continuous' {
  return role === 'PUBLIC_EQUITY' ? 'regular' : 'continuous'
}
