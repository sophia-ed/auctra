import { TtlCache, cachedLoad } from '@auctra/cache'
import { newId, type PreStockAssetRecord, type Repositories } from '@auctra/database'
import {
  Decimal,
  deriveLifecycleState,
  hashValue,
  type LifecycleEventType,
  type SourceRecord,
  type SourceType,
} from '@auctra/domain'
import type { MeteoraDBCAdapter } from '@auctra/meteora'
import type { DetailedLifecycleProvider, PreStockAsset, PreStocksProvider } from '@auctra/prestocks'
import { computeFreshness, type MarketReferenceProvider } from '@auctra/pyth'

/**
 * Background worker (AUCTRA.md Section 62).
 *
 * Performs PreStocks refresh, reference refresh, event refresh, pool snapshots
 * and lifecycle recalculation. It NEVER submits a financial transaction: pool
 * handling is read-only, and any action needing user approval stays wallet-signed.
 */

export interface WorkerReport {
  startedAt: string
  finishedAt: string
  assetsRefreshed: number
  eventsAdded: number
  referencesObserved: number
  poolSnapshots: number
  lifecycleRecalculated: number
  stale: string[]
  errors: { stage: string; message: string }[]
}

export interface WorkerLog {
  event: 'worker_report'
  report: WorkerReport
}

export interface WorkerDeps {
  repos: Repositories
  prestocks: PreStocksProvider
  lifecycle?: DetailedLifecycleProvider
  pyth?: MarketReferenceProvider
  dbc?: MeteoraDBCAdapter
  now?: () => string
  /** Cache TTL for the PreStocks snapshot (Section 63). Default 60s. */
  ttlMs?: number
  onLog?: (log: WorkerLog) => void
}

interface AssetSnapshot {
  assets: PreStockAsset[]
  source: SourceRecord
}

function toRecord(asset: PreStockAsset): PreStockAssetRecord {
  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    mintAddress: asset.mintAddress,
    markPrice: asset.markPrice.toString(),
    markValuation: asset.markValuation.toString(),
    tokenPrice: asset.tokenPrice.toString(),
    impliedValuation: asset.impliedValuation.toString(),
    supply: asset.supply.toString(),
    source: asset.source,
    retrievedAt: asset.retrievedAt,
  }
}

function toAsset(record: PreStockAssetRecord): PreStockAsset {
  return {
    id: record.id,
    name: record.name,
    symbol: record.symbol,
    mintAddress: record.mintAddress,
    markPrice: new Decimal(record.markPrice),
    markValuation: new Decimal(record.markValuation),
    tokenPrice: new Decimal(record.tokenPrice),
    impliedValuation: new Decimal(record.impliedValuation),
    supply: new Decimal(record.supply),
    source: 'prestocks',
    retrievedAt: record.retrievedAt,
  }
}

export class AuctraWorker {
  private readonly now: () => string
  private readonly assetCache: TtlCache<AssetSnapshot>
  private timer: ReturnType<typeof setInterval> | undefined
  private running = false

  constructor(private readonly deps: WorkerDeps) {
    this.now = deps.now ?? (() => new Date().toISOString())
    this.assetCache = new TtlCache<AssetSnapshot>({ ttlMs: deps.ttlMs ?? 60000, now: this.now })
  }

  async runOnce(): Promise<WorkerReport> {
    const startedAt = this.now()
    const report: WorkerReport = {
      startedAt,
      finishedAt: startedAt,
      assetsRefreshed: 0,
      eventsAdded: 0,
      referencesObserved: 0,
      poolSnapshots: 0,
      lifecycleRecalculated: 0,
      stale: [],
      errors: [],
    }

    const fail = (stage: string, thrown: unknown) => {
      const message = thrown instanceof Error ? thrown.message : String(thrown)
      if (!report.errors.some((entry) => entry.stage === stage && entry.message === message)) {
        report.errors.push({ stage, message })
      }
    }

    // 1. PreStocks refresh (cached; a temporary upstream failure keeps the last good snapshot).
    try {
      const loaded = await cachedLoad<AssetSnapshot>({
        cache: this.assetCache,
        key: 'prestocks:assets',
        loader: async () => {
          const detailed = await this.deps.prestocks.listAssetsDetailed()
          return { assets: detailed.assets, source: detailed.source }
        },
        hash: (snapshot) =>
          hashValue(snapshot.assets.map((asset) => `${asset.symbol}:${asset.markPrice}:${asset.tokenPrice}`)),
      })
      if (loaded.stale) report.stale.push('prestocks')
      for (const asset of loaded.value.assets) {
        const isNew = this.deps.repos.assets.getById(asset.id) === undefined
        this.deps.repos.assets.upsert(toRecord(asset))
        if (isNew) {
          this.deps.repos.audit.append({ kind: 'asset_imported', assetId: asset.id, source: 'worker' })
        }
      }
      this.deps.repos.sources.register({
        id: loaded.value.source.id,
        sourceType: loaded.value.source.sourceType,
        url: loaded.value.source.url,
        retrievedAt: loaded.value.source.retrievedAt,
        contentHash: loaded.value.source.contentHash,
        description: loaded.value.source.description,
      })
      report.assetsRefreshed = loaded.value.assets.length
    } catch (thrown) {
      fail('prestocks', thrown)
    }

    const assets = this.deps.repos.assets.list()

    // 2. Event refresh.
    if (this.deps.lifecycle) {
      for (const record of assets) {
        try {
          const result = await this.deps.lifecycle.getEventsDetailed(toAsset(record))
          for (const event of result.events) {
            if (this.deps.repos.events.get(event.id)) continue
            this.deps.repos.events.insert({
              id: event.id,
              assetId: event.assetId,
              type: event.type,
              title: event.title,
              announcedAt: event.announcedAt,
              effectiveAt: event.effectiveAt,
              conversionDeadline: event.conversionDeadline,
              observedAt: event.observedAt,
              sourceType: event.sourceType,
              sourceUrl: event.sourceUrl,
              confidence: String(event.confidence),
              notes: event.notes,
              createdAt: this.now(),
            })
            report.eventsAdded += 1
            this.deps.repos.audit.append({ kind: 'event_added', assetId: event.assetId, source: 'worker' })
          }
          for (const source of result.sources) {
            this.deps.repos.sources.register({
              id: source.id,
              sourceType: source.sourceType,
              url: source.url,
              retrievedAt: source.retrievedAt,
              contentHash: source.contentHash,
              description: source.description,
            })
          }
        } catch (thrown) {
          fail('lifecycle', thrown)
        }
      }
    }

    // 3. Reference refresh.
    if (this.deps.pyth) {
      for (const record of assets) {
        try {
          const observation = await this.deps.pyth.getReference({ symbol: record.symbol })
          const freshness = computeFreshness({
            now: this.now(),
            feedUpdateTimestamp: observation.feedUpdateTimestamp,
            publishTime: observation.publishTime,
          })
          this.deps.repos.references.insert({
            id: newId('ref'),
            assetSymbol: record.symbol,
            feedId: observation.feedId,
            symbol: observation.symbol,
            price: observation.price.toString(),
            confidence: observation.confidence.toString(),
            exponent: observation.exponent,
            marketSession: observation.marketSession,
            publisherCount: observation.publisherCount,
            publishTime: observation.publishTime,
            feedUpdateTimestamp: observation.feedUpdateTimestamp,
            freshness: freshness.status,
            source: 'pyth',
            retrievedAt: this.now(),
          })
          report.referencesObserved += 1
          this.deps.repos.audit.append({ kind: 'reference_observed', assetId: record.id, source: 'worker' })
        } catch (thrown) {
          fail('pyth', thrown)
        }
      }
    }

    // 4. Pool snapshots (read-only).
    if (this.deps.dbc) {
      for (const pool of this.deps.repos.pools.list()) {
        try {
          const state = await this.deps.dbc.getPool(pool.address)
          const migration = await this.deps.dbc.getMigrationStatus(pool.address)
          this.deps.repos.pools.addSnapshot({
            poolAddress: pool.address,
            quoteReserve: state.quoteReserve,
            progress: String(state.progress),
            migrationReady: migration.ready,
            observedAt: this.now(),
            payload: migration.model,
          })
          report.poolSnapshots += 1
        } catch (thrown) {
          fail('meteora', thrown)
        }
      }
    }

    // 5. Lifecycle recalculation.
    for (const record of assets) {
      try {
        deriveLifecycleState(
          this.deps.repos.events.listByAsset(record.id).map((event) => ({
            id: event.id,
            assetId: event.assetId,
            type: event.type as LifecycleEventType,
            title: event.title,
            announcedAt: event.announcedAt,
            effectiveAt: event.effectiveAt,
            conversionDeadline: event.conversionDeadline,
            observedAt: event.observedAt,
            sourceType: event.sourceType as SourceType,
            sourceUrl: event.sourceUrl,
            confidence: Number(event.confidence),
            notes: event.notes,
          })),
          this.now(),
        )
        report.lifecycleRecalculated += 1
      } catch (thrown) {
        fail('lifecycle-recalculation', thrown)
      }
    }

    report.finishedAt = this.now()
    this.deps.onLog?.({ event: 'worker_report', report })
    return report
  }

  start(intervalMs: number): void {
    if (this.timer) return
    void this.tick()
    this.timer = setInterval(() => void this.tick(), intervalMs)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
  }

  private async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.runOnce()
    } finally {
      this.running = false
    }
  }
}
