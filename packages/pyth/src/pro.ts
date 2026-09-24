import { z } from 'zod'
import { mantissaToDecimal, toMarketSession, type ReferenceObservation } from './observation'
import type { PythFeedRegistryEntry } from './registry'
import type { MarketAsset, MarketReferenceProvider } from './provider'
import {
  PythAuthError,
  PythObservationUnavailableError,
  PythUnavailableError,
  resolveFeed,
} from './provider'

/**
 * Pyth Pro (Lazer) REST access (AUCTRA.md Section 13-16).
 *
 * This is the product that actually returns marketSession, feedUpdateTimestamp
 * and publisherCount — Hermes Core does not. Read from the Pro OpenAPI schema at
 * pyth-lazer-0.dourolabs.app/docs/openapi.json; not guessed.
 */
export const DEFAULT_PRO_BASE_URL = 'https://pyth-lazer.dourolabs.app'

/** Real-time is always >= every feed's minimum supported channel. */
export const DEFAULT_PRO_CHANNEL = 'real_time'

export const PRO_PROPERTIES = [
  'price',
  'confidence',
  'exponent',
  'marketSession',
  'publisherCount',
  'feedUpdateTimestamp',
] as const

const proFeedSchema = z.object({
  priceFeedId: z.number(),
  price: z.union([z.string(), z.number()]).nullish(),
  confidence: z.union([z.string(), z.number()]).nullish(),
  exponent: z.number().nullish(),
  publisherCount: z.number().nullish(),
  marketSession: z.string().nullish(),
  feedUpdateTimestamp: z.union([z.string(), z.number()]).nullish(),
})

const proUpdateSchema = z.object({
  parsed: z
    .object({
      timestampUs: z.union([z.string(), z.number()]).optional(),
      priceFeeds: z.array(proFeedSchema),
    })
    .nullish(),
})

function microsToIso(value: string | number | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined
  return new Date(Number(value) / 1000).toISOString()
}

function toObservation(
  feed: PythFeedRegistryEntry,
  item: z.infer<typeof proFeedSchema>,
  updateTimestampUs: string | number | undefined,
): ReferenceObservation {
  if (item.price === undefined || item.price === null) {
    // Documented Pro behaviour: price may be absent off-hours or for a new feed.
    throw new PythObservationUnavailableError(
      `Pyth Pro carried no price for ${feed.pythSymbol} (off-hours or newly activated feed)`,
    )
  }
  const exponent = item.exponent ?? 0
  return {
    feedId: String(item.priceFeedId),
    symbol: feed.pythSymbol,
    price: mantissaToDecimal(item.price, exponent),
    confidence: mantissaToDecimal(item.confidence ?? 0, exponent),
    exponent,
    publisherCount: item.publisherCount ?? undefined,
    marketSession: toMarketSession(item.marketSession ?? undefined),
    publishTime: microsToIso(updateTimestampUs) ?? new Date(0).toISOString(),
    feedUpdateTimestamp: microsToIso(item.feedUpdateTimestamp),
    source: 'pyth',
  }
}

interface ProOptions {
  baseUrl?: string
  fetchImpl?: typeof fetch
  apiKey: string
  channel?: string
}

async function postUpdate(
  path: '/v1/latest_price' | '/v1/price',
  symbols: string[],
  options: ProOptions,
  extra: Record<string, unknown> = {},
): Promise<z.infer<typeof proUpdateSchema>> {
  if (!options.apiKey) throw new PythAuthError('a Pyth Pro API key is required')
  const baseUrl = options.baseUrl ?? DEFAULT_PRO_BASE_URL
  const fetchImpl = options.fetchImpl ?? fetch

  let response: Response
  try {
    response = await fetchImpl(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        channel: options.channel ?? DEFAULT_PRO_CHANNEL,
        formats: [],
        properties: [...PRO_PROPERTIES],
        parsed: true,
        symbols,
        ...extra,
      }),
    })
  } catch (error) {
    throw new PythUnavailableError(
      `Pyth Pro request failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (response.status === 401 || response.status === 403) {
    throw new PythAuthError(`Pyth Pro rejected the API key (HTTP ${response.status})`)
  }
  if (!response.ok) {
    throw new PythUnavailableError(`Pyth Pro returned HTTP ${response.status}`)
  }

  const json: unknown = await response.json()
  const parsed = proUpdateSchema.safeParse(json)
  if (!parsed.success) {
    throw new PythUnavailableError('Pyth Pro response did not match the expected shape')
  }
  return parsed.data
}

/** Latest observation via POST /v1/latest_price. */
export async function fetchProLatestObservation(
  feed: PythFeedRegistryEntry,
  options: ProOptions,
): Promise<ReferenceObservation> {
  const update = await postUpdate('/v1/latest_price', [feed.pythSymbol], options)
  const item = update.parsed?.priceFeeds[0]
  if (!item) throw new PythObservationUnavailableError(`Pyth Pro returned no feed for ${feed.pythSymbol}`)
  return toObservation(feed, item, update.parsed?.timestampUs)
}

/** Historical observation via POST /v1/price at a microsecond timestamp (Section 39). */
export async function fetchProPriceAt(
  feed: PythFeedRegistryEntry,
  timestampUs: number,
  options: ProOptions,
): Promise<ReferenceObservation> {
  const update = await postUpdate('/v1/price', [feed.pythSymbol], options, { timestamp: timestampUs })
  const item = update.parsed?.priceFeeds[0]
  if (!item) throw new PythObservationUnavailableError(`Pyth Pro returned no feed for ${feed.pythSymbol}`)
  return toObservation(feed, item, update.parsed?.timestampUs)
}

export interface PythProProviderOptions extends Omit<ProOptions, 'apiKey'> {
  apiKey: string
}

/**
 * Pyth Pro reference provider. Uses the real marketSession and
 * feedUpdateTimestamp so freshness and session are measured, not assumed.
 */
export class PythProProvider implements MarketReferenceProvider {
  constructor(private readonly options: PythProProviderOptions) {}

  async getReference(asset: MarketAsset): Promise<ReferenceObservation> {
    const feed = resolveFeed(asset.symbol)
    if (!feed) {
      throw new PythUnavailableError(`No verified Pyth feed for ${asset.symbol}`)
    }
    return fetchProLatestObservation(feed, this.options)
  }
}
