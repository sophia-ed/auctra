import { hashValue, makeSourceRecord, validateLifecycleEvent, type LifecycleEvent } from '@auctra/domain'
import type { PreStockAsset } from '../normalize'
import { PreStocksUnavailableError } from '../provider'
import { disclosureToEvent, parsePreStocksDisclosure, type ParsedDisclosure } from './disclosure'
import type { DetailedLifecycleProvider, LifecycleProviderResult } from './types'

function conversionFrom(parsed: ParsedDisclosure, assetSymbol: string, sourceUrl: string, retrievedAt: string) {
  return {
    sourceSymbol: assetSymbol,
    targetSymbol: parsed.targetSymbol,
    ratioNumerator: parsed.ratioNumerator,
    ratioDenominator: parsed.ratioDenominator,
    deadline: parsed.deadline,
    sourceUrl,
    retrievedAt,
  }
}

// --- PreStocks page provider ------------------------------------------------

export interface PreStocksLifecycleProviderOptions {
  baseUrl?: string
  fetchImpl?: typeof fetch
  now?: () => string
  confidence?: number
}

export const DEFAULT_PRESTOCKS_SITE_URL = 'https://www.prestocks.com'

/**
 * Reads lifecycle disclosures from the official PreStocks asset page
 * (AUCTRA.md Section 9: the API carries no lifecycle fields, so page evidence
 * is used, stored with its source and timestamp, and labelled PRESTOCKS_PAGE).
 */
export class PreStocksLifecycleProvider implements DetailedLifecycleProvider {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly now: () => string
  private readonly confidence: number

  constructor(options: PreStocksLifecycleProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_PRESTOCKS_SITE_URL
    this.fetchImpl = options.fetchImpl ?? fetch
    this.now = options.now ?? (() => new Date().toISOString())
    this.confidence = options.confidence ?? 0.7
  }

  async getEventsDetailed(asset: PreStockAsset): Promise<LifecycleProviderResult> {
    const retrievedAt = this.now()
    const url = `${this.baseUrl}/${asset.symbol.toLowerCase()}`

    let text: string
    try {
      const response = await this.fetchImpl(url, { headers: { accept: 'text/html' } })
      if (!response.ok) {
        throw new PreStocksUnavailableError(`PreStocks page returned HTTP ${response.status}`)
      }
      text = await response.text()
    } catch (error) {
      if (error instanceof PreStocksUnavailableError) throw error
      throw new PreStocksUnavailableError(
        `PreStocks page request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    const parsed = parsePreStocksDisclosure(text)
    const { event, issues } = disclosureToEvent(parsed, {
      assetId: asset.id,
      assetSymbol: asset.symbol,
      sourceUrl: url,
      retrievedAt,
      sourceType: 'PRESTOCKS_PAGE',
      confidence: this.confidence,
    })

    const source = makeSourceRecord({
      id: `prestocks:page:${asset.symbol}:${hashValue(text).slice(0, 12)}`,
      sourceType: 'prestocks_page',
      url,
      retrievedAt,
      contentHash: hashValue(text),
      description: `PreStocks asset page for ${asset.symbol}`,
    })

    return {
      events: event ? [event] : [],
      sources: [source],
      issues,
      conversion: conversionFrom(parsed, asset.symbol, url, retrievedAt),
    }
  }

  async getEvents(asset: PreStockAsset): Promise<LifecycleEvent[]> {
    return (await this.getEventsDetailed(asset)).events
  }
}

// --- Manual provider --------------------------------------------------------

export interface ManualLifecycleProviderOptions {
  now?: () => string
  seed?: Record<string, LifecycleEvent[]>
}

/**
 * Verified manual events (AUCTRA.md Section 9, step 2). Manual events must
 * still carry a source URL; `validateLifecycleEvent` flags any that do not.
 */
export class ManualLifecycleProvider implements DetailedLifecycleProvider {
  private readonly now: () => string
  private readonly events = new Map<string, LifecycleEvent[]>()

  constructor(options: ManualLifecycleProviderOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString())
    for (const [symbol, list] of Object.entries(options.seed ?? {})) {
      this.events.set(symbol.toLowerCase(), [...list])
    }
  }

  add(assetSymbol: string, event: LifecycleEvent): void {
    const key = assetSymbol.toLowerCase()
    const list = this.events.get(key) ?? []
    list.push({ ...event, sourceType: 'MANUAL' })
    this.events.set(key, list)
  }

  async getEventsDetailed(asset: PreStockAsset): Promise<LifecycleProviderResult> {
    const retrievedAt = this.now()
    const events = (this.events.get(asset.symbol.toLowerCase()) ?? []).map((event) => ({
      ...event,
      sourceType: 'MANUAL' as const,
    }))
    const issues = events.flatMap(validateLifecycleEvent)
    const sources = events
      .filter((event) => event.sourceUrl)
      .map((event) =>
        makeSourceRecord({
          id: `manual:${event.id}`,
          sourceType: 'manual',
          url: event.sourceUrl,
          retrievedAt: event.observedAt ?? retrievedAt,
          description: `Manual lifecycle event ${event.id}`,
        }),
      )
    return { events, sources, issues }
  }

  async getEvents(asset: PreStockAsset): Promise<LifecycleEvent[]> {
    return (await this.getEventsDetailed(asset)).events
  }
}

// --- Demo provider ----------------------------------------------------------

export interface DemoSeed {
  assetSymbol: string
  sourceUrl: string
  retrievedAt: string
  /** Verbatim disclosure text, transcribed from the official page. */
  text: string
}

/**
 * Historical/known lifecycle seeds (AUCTRA.md Section 10). These are cached
 * snapshots of real, official disclosures — not invented data — and every
 * result is flagged `CACHED_SNAPSHOT` so it is never shown as live.
 */
export const DEMO_LIFECYCLE_SEEDS: readonly DemoSeed[] = [
  {
    assetSymbol: 'SPACEX',
    sourceUrl: 'https://www.prestocks.com/spacex',
    retrievedAt: '2026-09-23T12:59:10.000Z',
    text: 'SpaceX has gone public! SpaceX PreStocks tokens must be swapped into $SPCXx or any other token before 11:59pm UTC on 12 March 2027, or they will expire worthless.',
  },
  {
    assetSymbol: 'XAI',
    sourceUrl: 'https://www.prestocks.com/xai',
    retrievedAt: '2026-09-23T12:59:10.000Z',
    text: 'xAI was acquired by SpaceX. Each XAI token must be swapped into 0.7165 SPACEX before 11:59pm UTC on 12 September 2026, or it will expire worthless.',
  },
]

export interface DemoLifecycleProviderOptions {
  seeds?: readonly DemoSeed[]
}

export class DemoLifecycleProvider implements DetailedLifecycleProvider {
  private readonly seeds: readonly DemoSeed[]

  constructor(options: DemoLifecycleProviderOptions = {}) {
    this.seeds = options.seeds ?? DEMO_LIFECYCLE_SEEDS
  }

  async getEventsDetailed(asset: PreStockAsset): Promise<LifecycleProviderResult> {
    const seed = this.seeds.find(
      (candidate) => candidate.assetSymbol.toLowerCase() === asset.symbol.toLowerCase(),
    )
    if (!seed) {
      return {
        events: [],
        sources: [],
        issues: [
          { code: 'NO_DEMO_SEED', message: `no demo lifecycle seed for ${asset.symbol}` },
        ],
      }
    }

    const parsed = parsePreStocksDisclosure(seed.text)
    const { event, issues } = disclosureToEvent(parsed, {
      assetId: asset.id,
      assetSymbol: asset.symbol,
      sourceUrl: seed.sourceUrl,
      retrievedAt: seed.retrievedAt,
      sourceType: 'PRESTOCKS_PAGE',
      confidence: 0.6,
    })
    issues.push({
      code: 'CACHED_SNAPSHOT',
      message: `DEMO: cached snapshot retrieved ${seed.retrievedAt}; re-fetch the live page before presenting as current`,
    })

    const source = makeSourceRecord({
      id: `demo:${asset.symbol}`,
      sourceType: 'prestocks_page',
      url: seed.sourceUrl,
      retrievedAt: seed.retrievedAt,
      contentHash: hashValue(seed.text),
      description: `DEMO cached PreStocks disclosure for ${asset.symbol}`,
    })

    return {
      events: event ? [event] : [],
      sources: [source],
      issues,
      conversion: conversionFrom(parsed, asset.symbol, seed.sourceUrl, seed.retrievedAt),
    }
  }

  async getEvents(asset: PreStockAsset): Promise<LifecycleEvent[]> {
    return (await this.getEventsDetailed(asset)).events
  }
}
