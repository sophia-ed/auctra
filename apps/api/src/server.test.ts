import { describe, expect, it, beforeAll } from 'vitest'
import { loadConfig } from '@auctra/config'
import { createInMemoryRepositories, type Repositories } from '@auctra/database'
import { makeSourceRecord } from '@auctra/domain'
import { MeteoraDBCAdapter, type MeteoraDbcClient } from '@auctra/meteora'
import { DemoLifecycleProvider, normalizePreStockAsset, type PreStocksProvider } from '@auctra/prestocks'
import { MockPythProvider } from '@auctra/pyth'
import type { FastifyInstance } from 'fastify'
import { createApiServer } from './server'

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

const prestocks: PreStocksProvider = {
  async listAssets() {
    return [spacex]
  },
  async getAsset(symbol: string) {
    return symbol.toUpperCase() === 'SPACEX' ? spacex : null
  },
  async listAssetsDetailed() {
    return {
      assets: [spacex],
      issues: [],
      source: makeSourceRecord({
        id: 'prestocks:api:test',
        sourceType: 'prestocks_api',
        url: 'https://prestocks.com/api/prestocks',
        retrievedAt: RETRIEVED_AT,
        contentHash: 'a'.repeat(64),
        description: 'test fixture',
      }),
    }
  },
}

class FakeDbcClient implements MeteoraDbcClient {
  async createConfig() {
    return { transaction: 'base64-unsigned-config' }
  }
  async createPool() {
    return { transaction: 'base64-unsigned-pool' }
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
    return { kind: 'dbc-config' }
  }
  async getQuote() {
    return { inputMint: 'in', outputMint: 'out', inAmount: '1', outAmount: '1' }
  }
  async getPoolQuoteTokenCurveProgress() {
    return 0.4
  }
  async getPoolMigrationQuoteThreshold() {
    return '100000'
  }
  async migrateToDammV2() {
    return { transaction: 'base64-unsigned-migrate' }
  }
}

let app: FastifyInstance
let repos: Repositories
let planId: string
let simulationId: string

beforeAll(async () => {
  repos = createInMemoryRepositories()
  app = await createApiServer({
    config: loadConfig({ DEMO_MODE: 'true' }),
    repos,
    prestocks,
    pyth: new MockPythProvider({ symbol: 'SPACEX', price: '150', confidence: '0.07' }),
    lifecycle: new DemoLifecycleProvider(),
    dbc: new MeteoraDBCAdapter(new FakeDbcClient()),
    now: () => RETRIEVED_AT,
  })
  await app.ready()
})

describe('API contract (Section 58)', () => {
  it('reports health without exposing credentials', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      application: 'ok',
      database: 'ok',
      solana: 'unconfigured',
      prestocks: 'ok',
      pyth: 'unconfigured',
    })
  })

  it('lists and fetches normalised assets', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/assets' })
    expect(list.statusCode).toBe(200)
    expect(list.json().assets).toHaveLength(1)

    const one = await app.inject({ method: 'GET', url: '/api/assets/SPACEX' })
    expect(one.statusCode).toBe(200)
    expect(one.json().asset.mintAddress).toBe('PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh')

    const missing = await app.inject({ method: 'GET', url: '/api/assets/NOPE' })
    expect(missing.statusCode).toBe(404)
  })

  it('derives lifecycle state and a timeline for an asset', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/lifecycle/SPACEX' })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.state).toBe('PUBLIC_TRANSITION')
    expect(body.events.length).toBeGreaterThan(0)
    expect(body.timeline.length).toBeGreaterThan(0)
    expect(body.transitions[0]).toHaveProperty('previousState')
  })

  it('exposes the dual-clock model', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/clocks/SPACEX' })
    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.private.status).toBe('CLOSED')
    expect(body.public.status).toBe('ACTIVE')
    expect(body.onchain.status).toBe('LIVE')
    expect(body.transition.status).toBe('PENDING')
  })

  it('validates event input', async () => {
    const bad = await app.inject({
      method: 'POST',
      url: '/api/events',
      payload: { id: 'ev', assetId: 'spacex', type: 'IPO', title: 't', sourceType: 'MANUAL', confidence: 5 },
    })
    expect(bad.statusCode).toBe(400)

    const good = await app.inject({
      method: 'POST',
      url: '/api/events',
      payload: {
        id: 'ev-manual',
        assetId: 'spacex',
        type: 'CORPORATE_ACTION',
        title: 'manual event',
        observedAt: RETRIEVED_AT,
        sourceType: 'MANUAL',
        sourceUrl: 'https://example.invalid/notice',
        confidence: 0.5,
      },
    })
    expect(good.statusCode).toBe(201)
  })

  it('returns a reference observation', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/reference/SPACEX' })
    expect(response.statusCode).toBe(200)
    expect(response.json().referenceState.source).toBe('pyth')
    expect(response.json().referenceState.confidenceBps).toBeDefined()
  })

  it('compiles a transition plan and reads it back', async () => {
    const compile = await app.inject({
      method: 'POST',
      url: '/api/transition/compile',
      payload: {
        symbol: 'SPACEX',
        conversionRatio: '1',
        targetAssetMint: 'TARGET_MINT',
        currency: 'SPCXx',
        liquidity: {
          mode: 'EVENT_ADAPTIVE',
          segments: 8,
          referencePrice: '150',
          targetLiquidity: '250000',
          quoteMint: 'So11111111111111111111111111111111111111112',
          migrationQuoteThreshold: '100000',
        },
      },
    })
    expect(compile.statusCode).toBe(201)
    const body = compile.json()
    expect(body.plan.inputHash).toMatch(/^[0-9a-f]{64}$/)
    expect(body.plan.outputHash).toMatch(/^[0-9a-f]{64}$/)
    expect(body.dossier.conversionStatus.status).toBe('VERIFIED')
    planId = body.plan.id

    const read = await app.inject({ method: 'GET', url: `/api/transition/${planId}` })
    expect(read.statusCode).toBe(200)
    expect(read.json().versions).toHaveLength(1)
  })

  it('rejects an out-of-range curve', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/transition/compile',
      payload: {
        symbol: 'SPACEX',
        liquidity: {
          mode: 'EVENT_ADAPTIVE',
          segments: 99,
          referencePrice: '150',
          targetLiquidity: '1',
          quoteMint: 'mint',
          migrationQuoteThreshold: '1',
        },
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('runs a baseline comparison simulation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/simulations',
      payload: { planId, scenario: 'IPO_IMMINENT' },
    })
    expect(response.statusCode).toBe(201)
    const body = response.json()
    simulationId = body.simulationId
    expect(body.simulation.comparison.note).toContain('No winner')

    const read = await app.inject({ method: 'GET', url: `/api/simulations/${simulationId}` })
    expect(read.statusCode).toBe(200)
  })

  it('validates and prepares an unsigned DBC config', async () => {
    const validate = await app.inject({
      method: 'POST',
      url: '/api/dbc/validate',
      payload: { planId },
    })
    expect(validate.json().valid).toBe(true)

    const prepare = await app.inject({
      method: 'POST',
      url: '/api/dbc/prepare',
      payload: {
        planId,
        payer: 'PAYER',
        config: 'CONFIG',
        feeClaimer: 'FEE',
        leftoverReceiver: 'LEFTOVER',
        tokenDecimal: 9,
        initialMarketCap: '5000',
        migrationMarketCap: '1000000',
      },
    })
    expect(prepare.statusCode).toBe(200)
    expect(prepare.json().unsignedTransaction).toBe('base64-unsigned-config')
    expect(prepare.json().requiresWalletSignature).toBe(true)
    expect(prepare.json().network).toBe('DEMO')
  })

  it('reads a pool from the DBC adapter when not stored locally', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/pools/POOL' })
    expect(response.statusCode).toBe(200)
    expect(response.json().pool.address).toBe('POOL')
    expect(response.json().migration.ready).toBe(false)
  })

  it('returns 404 when no pool exists and no DBC adapter is configured', async () => {
    const bare = await createApiServer({
      config: loadConfig({}),
      repos: createInMemoryRepositories(),
      prestocks,
      now: () => RETRIEVED_AT,
    })
    await bare.ready()
    const response = await bare.inject({ method: 'GET', url: '/api/pools/UNKNOWN' })
    expect(response.statusCode).toBe(404)
  })
})
