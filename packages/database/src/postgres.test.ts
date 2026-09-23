import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { newDb } from 'pg-mem'
import type { Pool } from 'pg'
import { describe, expect, it, beforeEach } from 'vitest'
import { createPostgresRepositories } from './postgres'
import { PlanImmutabilityError, type PreStockAssetRecord } from './repositories'

const here = dirname(fileURLToPath(import.meta.url))
const schema = readFileSync(join(here, '..', 'sql', '0001_init.sql'), 'utf8')

/**
 * The Postgres repositories are exercised against pg-mem, an in-process
 * Postgres emulator, so the real SQL runs in CI without a database server.
 */
function makePool(): Pool {
  const db = newDb()
  db.public.none(schema)
  const { Pool: PgPool } = db.adapters.createPg()
  return new PgPool() as unknown as Pool
}

let pool: Pool
beforeEach(() => {
  pool = makePool()
})

describe('Postgres repositories (Section 48)', () => {
  it('round-trips assets', async () => {
    const repos = createPostgresRepositories({ pool })
    await repos.assets.upsert({
      id: 'spacex',
      symbol: 'SPACEX',
      name: 'SpaceX PreStocks',
      mintAddress: 'PreANxu',
      markPrice: '153.46590420780728',
      markValuation: '2012108521836',
      tokenPrice: '112.496991575484',
      impliedValuation: '1474960556212',
      supply: '43712.532115040005',
      source: 'prestocks',
      retrievedAt: '2026-09-23T00:00:00.000Z',
    })
    const loaded = await repos.assets.getBySymbol('spacex')
    expect(loaded?.markPrice).toBe('153.46590420780728')
    expect(await repos.assets.list()).toHaveLength(1)

    // upsert updates in place
    await repos.assets.upsert({ ...(loaded as PreStockAssetRecord), markPrice: '150' })
    expect((await repos.assets.getById('spacex'))?.markPrice).toBe('150')
  })

  it('stores events and references', async () => {
    const repos = createPostgresRepositories({ pool })
    await repos.events.insert({
      id: 'ev-1',
      assetId: 'spacex',
      type: 'IPO',
      title: 'SPACEX: IPO',
      observedAt: '2026-09-23T00:00:00.000Z',
      sourceType: 'PRESTOCKS_PAGE',
      confidence: '0.6',
      createdAt: '2026-09-23T00:00:00.000Z',
    })
    expect(await repos.events.listByAsset('spacex')).toHaveLength(1)

    await repos.references.insert({
      id: 'ref-1',
      assetSymbol: 'SPACEX',
      feedId: 'feed',
      symbol: 'Equity.Index.SPCX/USD',
      price: '100',
      confidence: '0.07',
      exponent: -8,
      publishTime: '2026-09-23T00:00:00.000Z',
      freshness: 'FRESH',
      source: 'pyth',
      retrievedAt: '2026-09-23T00:00:00.000Z',
    })
    expect(await repos.references.list()).toHaveLength(1)
  })

  it('keeps plans append-only', async () => {
    const repos = createPostgresRepositories({ pool })
    const record = {
      id: 'tp_1',
      assetId: 'spacex',
      state: 'PUBLIC_TRANSITION',
      algorithmVersion: '1.0.0',
      inputHash: 'in',
      outputHash: 'out',
      generatedAt: '2026-09-23T00:00:00.000Z',
      payload: { id: 'tp_1' },
      createdAt: '2026-09-23T00:00:00.000Z',
    }
    const first = await repos.plans.insert(record)
    expect(first.created).toBe(true)
    expect(first.version).toBe(1)

    const again = await repos.plans.insert(record)
    expect(again.created).toBe(false)

    await expect(repos.plans.insert({ ...record, outputHash: 'different' })).rejects.toThrowError(
      PlanImmutabilityError,
    )
    expect(await repos.plans.listVersions('tp_1')).toHaveLength(1)
  })

  it('records audit events and pools with snapshots', async () => {
    const repos = createPostgresRepositories({ pool })
    const entry = await repos.audit.append({ kind: 'asset_imported', assetId: 'spacex' })
    expect(entry.id).toBeGreaterThan(0)
    expect((await repos.audit.list())[0].kind).toBe('asset_imported')

    await repos.pools.upsert({
      address: 'POOL',
      config: 'cfg',
      baseMint: 'base',
      quoteMint: 'quote',
      createdAt: '2026-09-23T00:00:00.000Z',
    })
    await repos.pools.addSnapshot({
      poolAddress: 'POOL',
      quoteReserve: '40000',
      progress: '0.4',
      migrationReady: false,
      observedAt: '2026-09-23T00:00:00.000Z',
    })
    expect(await repos.pools.listSnapshots('POOL')).toHaveLength(1)
  })
})
