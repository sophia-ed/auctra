import { Decimal } from '@auctra/domain'
import { z } from 'zod'
import {
  toMarketSession,
  mantissaToDecimal,
  type ReferenceObservation,
} from './observation'
import {
  feedsForAsset,
  findFeedBySymbol,
  type PythFeedRegistryEntry,
} from './registry'

export const DEFAULT_PYTH_HERMES_URL = 'https://hermes.pyth.network'

export class PythUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PythUnavailableError'
  }
}

export class PythObservationUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PythObservationUnavailableError'
  }
}

export interface MarketAsset {
  symbol: string
}

/** AUCTRA.md Section 13. */
export interface MarketReferenceProvider {
  getReference(asset: MarketAsset): Promise<ReferenceObservation>
}

// --- Feed discovery (keyless) ------------------------------------------------

const discoveryItemSchema = z
  .object({
    id: z.string().min(1),
    market_hours: z
      .object({
        is_open: z.boolean().optional(),
        next_open: z.number().nullable().optional(),
        next_close: z.number().nullable().optional(),
      })
      .optional(),
    attributes: z
      .object({
        asset_type: z.string().optional(),
        description: z.string().optional(),
        display_symbol: z.string().optional(),
        quote_currency: z.string().optional(),
        symbol: z.string().optional(),
      })
      .optional(),
  })
  .passthrough()

export interface FeedDiscoveryItem {
  feedId: string
  pythSymbol?: string
  assetType?: string
  displaySymbol?: string
  description?: string
  isOpen?: boolean
}

/**
 * Keyless feed discovery (verified in research: this endpoint needs no API key).
 * Live price updates do require an authenticated source — see HttpPythProvider.
 */
export async function discoverFeeds(
  query: string,
  options: { baseUrl?: string; fetchImpl?: typeof fetch } = {},
): Promise<FeedDiscoveryItem[]> {
  const baseUrl = options.baseUrl ?? DEFAULT_PYTH_HERMES_URL
  const fetchImpl = options.fetchImpl ?? fetch
  const url = `${baseUrl}/v2/price_feeds?query=${encodeURIComponent(query)}`

  let response: Response
  try {
    response = await fetchImpl(url, { headers: { accept: 'application/json' } })
  } catch (error) {
    throw new PythUnavailableError(
      `Pyth feed discovery failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
  if (!response.ok) {
    throw new PythUnavailableError(`Pyth feed discovery returned HTTP ${response.status}`)
  }

  const json: unknown = await response.json()
  if (!Array.isArray(json)) {
    throw new PythUnavailableError('Pyth feed discovery did not return an array')
  }

  return json.flatMap((raw) => {
    const parsed = discoveryItemSchema.safeParse(raw)
    if (!parsed.success) return []
    const item = parsed.data
    return [
      {
        feedId: item.id,
        pythSymbol: item.attributes?.symbol,
        assetType: item.attributes?.asset_type,
        displaySymbol: item.attributes?.display_symbol,
        description: item.attributes?.description,
        isOpen: item.market_hours?.is_open,
      },
    ]
  })
}

// --- Pyth Pro / push payload parsing ----------------------------------------

export interface ProFeedPayload {
  feedId: string
  symbol: string
  /** Spot aggregate price mantissa. May be absent off-hours / for new feeds. */
  price?: string | number | bigint | null
  confidence: string | number | bigint
  exponent: number
  marketSession?: string
  publisherCount?: number
  /** Microseconds since epoch. */
  feedUpdateTimestamp?: string | number
  /** Microseconds since epoch. */
  timestampUs: string | number
}

function microsToIso(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined
  return new Date(Number(value) / 1000).toISOString()
}

/**
 * Parse a documented Pyth Pro feed object (docs/research/2026-09-23-pyth.md).
 * Uses `feedUpdateTimestamp` as the freshness origin, never the receipt time.
 */
export function parseProFeedPayload(payload: ProFeedPayload): ReferenceObservation {
  if (payload.price === undefined || payload.price === null) {
    throw new PythObservationUnavailableError(
      `Pyth feed ${payload.symbol} carried no price (off-hours or newly activated)`,
    )
  }
  return {
    feedId: payload.feedId,
    symbol: payload.symbol,
    price: mantissaToDecimal(payload.price, payload.exponent),
    confidence: mantissaToDecimal(payload.confidence, payload.exponent),
    exponent: payload.exponent,
    publisherCount: payload.publisherCount,
    marketSession: toMarketSession(payload.marketSession),
    publishTime: microsToIso(payload.timestampUs) ?? new Date(0).toISOString(),
    feedUpdateTimestamp: microsToIso(payload.feedUpdateTimestamp),
    source: 'pyth',
  }
}

// --- HTTP provider -----------------------------------------------------------

export interface HttpPythProviderOptions {
  baseUrl?: string
  fetchImpl?: typeof fetch
  /** Resolves a live observation for a feed using your authenticated Pyth source. */
  fetchObservation?: (feed: PythFeedRegistryEntry) => Promise<ReferenceObservation>
}

/** Prefer the 24/7 index feed for a private asset, otherwise the first verified feed. */
export function resolveFeed(assetSymbol: string): PythFeedRegistryEntry | undefined {
  const feeds = feedsForAsset(assetSymbol)
  return feeds.find((feed) => feed.role === 'INDEX_24_7') ?? feeds[0]
}

/**
 * HTTP reference provider.
 *
 * Discovery is keyless. Producing a live price requires an authenticated source
 * (Pyth Pro / Hermes with a key), so this class requires `fetchObservation`.
 * Without it, `getReference` fails with an actionable error rather than
 * inventing a price.
 */
export class HttpPythProvider implements MarketReferenceProvider {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly fetchObservation?: (feed: PythFeedRegistryEntry) => Promise<ReferenceObservation>

  constructor(options: HttpPythProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_PYTH_HERMES_URL
    this.fetchImpl = options.fetchImpl ?? fetch
    this.fetchObservation = options.fetchObservation
  }

  async getReference(asset: MarketAsset): Promise<ReferenceObservation> {
    const feed = resolveFeed(asset.symbol)
    if (!feed) {
      throw new PythUnavailableError(`No verified Pyth feed for ${asset.symbol}`)
    }

    if (!this.fetchObservation) {
      throw new PythObservationUnavailableError(
        `Pyth feed for ${asset.symbol} resolved as ${feed.pythSymbol} (${feed.feedId}), but live updates ` +
          `require an authenticated source. Provide fetchObservation or configure PYTH_API_KEY. ` +
          `Discovery at ${this.baseUrl}/v2/price_feeds remains available keyless.`,
      )
    }

    return this.fetchObservation(feed)
  }

  /** Discover feeds by symbol using the keyless endpoint. */
  async discover(query: string): Promise<FeedDiscoveryItem[]> {
    return discoverFeeds(query, { baseUrl: this.baseUrl, fetchImpl: this.fetchImpl })
  }
}

// --- Mock provider -----------------------------------------------------------

export interface MockPythProviderOptions {
  now?: () => string
  feedId?: string
  symbol?: string
  price?: string
  confidence?: string
  exponent?: number
  marketSession?: string
}

/** Deterministic provider for tests and demo mode. Clearly a mock, not live. */
export class MockPythProvider implements MarketReferenceProvider {
  constructor(private readonly options: MockPythProviderOptions = {}) {}

  async getReference(asset: MarketAsset): Promise<ReferenceObservation> {
    const now = this.options.now?.() ?? new Date().toISOString()
    return {
      feedId: this.options.feedId ?? 'mock-feed',
      symbol: this.options.symbol ?? asset.symbol,
      price: new Decimal(this.options.price ?? '150'),
      confidence: new Decimal(this.options.confidence ?? '0.07'),
      exponent: this.options.exponent ?? -8,
      publisherCount: 9,
      marketSession: toMarketSession(this.options.marketSession ?? 'regular'),
      publishTime: now,
      feedUpdateTimestamp: now,
      source: 'pyth',
    }
  }
}

export { findFeedBySymbol }
