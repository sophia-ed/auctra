import { describe, expect, it } from 'vitest'
import { createInMemoryRepositories } from '@auctra/database'
import { makeSourceRecord } from '@auctra/domain'
import { MeteoraDBCAdapter, type MeteoraDbcClient } from '@auctra/meteora'
import { DemoLifecycleProvider, normalizePreStockAsset, type PreStocksProvider } from '@auctra/prestocks'
import { MockPythProvider } from '@auctra/pyth'
import { AuctraWorker } from './worker'

const RETRIEVED_AT = '2026-09-23T12:59:10.000Z'

const spacex = normalizePreStockAsset(
  {
    name: 'SpaceX PreStocks',
    symbol: 'SPACEX',
    contract_address: 'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh',
    markPrice: 153.46590420780728,
    markValuation: 2012108521836,
    tokenPrice: 112.496991575484,
    impliedValuation: 1474960556212,
    supply: 43712.532115040005,
  },
  RETRIEVED_AT,
)

function providerReturning(load: () => Promise<ReturnType<typeof normalizePreStockAsset>[]>): PreStocksProvider {
  return {
    async listAssets() {
      return load()
    },
    async getAsset(symbol: string) {
      return (await load()).find((asset) => asset.symbol === symbol) ?? null
    },
    async listAssetsDetailed() {
      return {
        assets: await load(),
        issues: [],
        source: makeSourceRecord({
          id: 'prestocks:api:test',
          sourceType: 'prestocks_api',
          url: 'https://prestocks.com/api/prestocks',
          retrievedAt: RETRIEVED_AT,
          contentHash: 'a'.repeat(64),
          description: 'worker fixture',
        }),
      }
    },
  }
}

/** A DBC client that fails loudly if the worker ever tries to submit. */
class ReadOnlyDbcClient implements MeteoraDbcClient {
  createConfig(): never {
    throw new Error('worker must not create configs')
  }
  createPool(): never {
    throw new Error('worker must not create pools')
  }
  migrateToDammV2(): never {
    throw new Error('worker must not migrate')
  }
  async getPool(address: string) {
    return {
      address,
      config: 'cfg',
      baseMint: 'base',
      quoteMint: 'quote',
      quoteReserve: '40000',
      migrationQuoteThreshold: '100000',
      progress: 0.4,
      migrated: false,
    }
  }
  async getConfig() {
    return {}
  }
  async getQuote(): Promise<never> {
    throw new Error('worker must not quote')
  }
  async getPoolQuoteTokenCurveProgress() {
    return 0.4
  }
  async getPoolMigrationQuoteThreshold() {
    return '100000'
  }
}

describe('worker (Section 62)', () => {
  it('refreshes assets, events, references and lifecycle without submitting', async () => {
    const repos = createInMemoryRepositories()
    repos.pools.upsert({
      address: 'POOL',
      config: 'cfg',
      baseMint: 'base',
      quoteMint: 'quote',
      createdAt: RETRIEVED_AT,
    })

    const worker = new AuctraWorker({
      repos,
      prestocks: providerReturning(async () => [spacex]),
      lifecycle: new DemoLifecycleProvider(),
      pyth: new MockPythProvider({ symbol: 'SPACEX' }),
      dbc: new MeteoraDBCAdapter(new ReadOnlyDbcClient()),
      now: () => RETRIEVED_AT,
    })

    const report = await worker.runOnce()
    expect(report.assetsRefreshed).toBe(1)
    expect(report.eventsAdded).toBe(1)
    expect(report.referencesObserved).toBe(1)
    expect(report.poolSnapshots).toBe(1)
    expect(report.lifecycleRecalculated).toBe(1)
    expect(report.errors).toEqual([])
    expect(report.stale).toEqual([])

    expect(repos.assets.getBySymbol('SPACEX')).toBeDefined()
    expect(repos.events.listByAsset('spacex')).toHaveLength(1)
    expect(repos.pools.listSnapshots('POOL')).toHaveLength(1)
  })

  it('keeps the last good snapshot when PreStocks fails', async () => {
    const repos = createInMemoryRepositories()
    let failing = false
    const worker = new AuctraWorker({
      repos,
      prestocks: providerReturning(async () => {
        if (failing) throw new Error('prestocks 503')
        return [spacex]
      }),
      now: () => RETRIEVED_AT,
    })

    const first = await worker.runOnce()
    expect(first.assetsRefreshed).toBe(1)

    failing = true
    const second = await worker.runOnce()
    expect(second.stale).toContain('prestocks')
    expect(second.assetsRefreshed).toBe(1)
    // the previously verified asset was not replaced with empty data
    expect(repos.assets.getBySymbol('SPACEX')?.mintAddress).toBe(spacex.mintAddress)
  })

  it('does not throw when an upstream reference is unavailable', async () => {
    const repos = createInMemoryRepositories()
    const worker = new AuctraWorker({
      repos,
      prestocks: providerReturning(async () => [spacex]),
      pyth: {
        async getReference() {
          throw new Error('reference unavailable')
        },
      },
      now: () => RETRIEVED_AT,
    })
    const report = await worker.runOnce()
    expect(report.referencesObserved).toBe(0)
    expect(report.errors.some((error) => error.stage === 'pyth')).toBe(true)
    expect(report.assetsRefreshed).toBe(1)
  })

  it('starts and stops cleanly', async () => {
    const repos = createInMemoryRepositories()
    const worker = new AuctraWorker({
      repos,
      prestocks: providerReturning(async () => [spacex]),
      now: () => RETRIEVED_AT,
    })
    await worker.runOnce()
    worker.start(100000)
    worker.stop()
    expect(true).toBe(true)
  })
})
