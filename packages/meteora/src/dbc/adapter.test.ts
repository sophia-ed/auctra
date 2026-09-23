import { describe, expect, it } from 'vitest'
import {
  buildDbcPlan,
  buildTransitionCurve,
  computeActivation,
  computeFeePolicy,
  type DbcPlan,
} from '@auctra/domain'
import {
  MeteoraDBCAdapter,
  createSdkBackedClient,
  type DbcConfigRequest,
  type DbcPoolCreateRequest,
  type MeteoraDbcClient,
} from '../index'

function makePlan(): DbcPlan {
  const curve = buildTransitionCurve({
    referencePrice: '150',
    referenceConfidenceBps: '20',
    eventIntensity: '0.7',
    mode: 'EVENT_ADAPTIVE',
    segments: 8,
    liquidityTarget: '100000',
  })
  return buildDbcPlan({
    curve,
    feePolicy: computeFeePolicy({ eventIntensity: '0.7', referenceConfidenceBps: '20' }),
    activation: computeActivation({ asOf: '2026-09-23T00:00:00Z' }),
    quoteMint: 'So11111111111111111111111111111111111111112',
    migrationQuoteThreshold: '100000',
    tokenType: 'Token2022',
  })
}

class FakeClient implements MeteoraDbcClient {
  createdConfigs: DbcConfigRequest[] = []
  createdPools: DbcPoolCreateRequest[] = []
  migrations: { payer: string; pool: string }[] = []
  reserve = '40000'
  threshold = '100000'
  progress = 0.4

  async createConfig(params: DbcConfigRequest) {
    this.createdConfigs.push(params)
    return { transaction: 'base64-config' }
  }
  async createPool(params: DbcPoolCreateRequest) {
    this.createdPools.push(params)
    return { transaction: 'base64-pool' }
  }
  async getPool(address: string) {
    return {
      address,
      config: 'cfg',
      baseMint: 'base',
      quoteMint: 'quote',
      quoteReserve: this.reserve,
      migrationQuoteThreshold: this.threshold,
      progress: this.progress,
      migrated: false,
    }
  }
  async getConfig() {
    return { kind: 'dbc-config' }
  }
  async getQuote() {
    return { inputMint: 'in', outputMint: 'out', inAmount: '1000', outAmount: '900' }
  }
  async getPoolQuoteTokenCurveProgress() {
    return this.progress
  }
  async getPoolMigrationQuoteThreshold() {
    return this.threshold
  }
  async migrateToDammV2(params: { payer: string; pool: string; dammConfig: string }) {
    this.migrations.push(params)
    return { transaction: 'base64-migrate' }
  }
}

const request = {
  plan: makePlan(),
  tokenDecimal: 9,
  initialMarketCap: '5000',
  migrationMarketCap: '1000000',
  totalTokenSupply: 1_000_000_000,
  leftover: 500_000_000,
  payer: 'PAYER',
  config: 'CONFIG',
  feeClaimer: 'FEE',
  leftoverReceiver: 'LEFTOVER',
}

describe('Meteora DBC adapter (Section 30)', () => {
  it('validates and builds a config from a plan', () => {
    const adapter = new MeteoraDBCAdapter(new FakeClient())
    expect(adapter.validateConfig(request.plan)).toHaveLength(0)
    const config = adapter.buildConfig(request)
    expect(config.migrationOption).toBe(1)
    expect(config.activationType).toBe(1)
    expect(config.tokenType).toBe(1)
    expect(config.initialMarketCap).toBe('5000')
    expect(config.migrationMarketCap).toBe('1000000')
    expect(config.liquidityWeights).toHaveLength(8)
  })

  it('rejects an invalid plan before touching the client', () => {
    const adapter = new MeteoraDBCAdapter(new FakeClient())
    const bad = makePlan()
    bad.pricePoints[1] = bad.pricePoints[0].minus(1)
    expect(() => adapter.buildConfig({ ...request, plan: bad })).toThrowError(/invalid DBC plan/)
  })

  it('creates a config and a pool as unsigned transactions', async () => {
    const client = new FakeClient()
    const adapter = new MeteoraDBCAdapter(client)
    const configTx = await adapter.createConfig(request)
    const poolTx = await adapter.createPool({
      payer: 'PAYER',
      config: 'CONFIG',
      baseMint: 'BASE',
      name: 'Auctra Demo',
      symbol: 'AUCTRA',
      uri: 'https://example.invalid/meta.json',
      poolCreator: 'CREATOR',
    })
    expect(configTx.transaction).toBe('base64-config')
    expect(poolTx.transaction).toBe('base64-pool')
    expect(client.createdConfigs).toHaveLength(1)
    expect(client.createdPools).toHaveLength(1)
  })

  it('reads pool state, quotes and curve progress', async () => {
    const adapter = new MeteoraDBCAdapter(new FakeClient())
    expect((await adapter.getPool('POOL')).quoteReserve).toBe('40000')
    expect(await adapter.getCurveProgress('POOL')).toBe(0.4)
    expect((await adapter.getQuote({ pool: 'POOL', inputMint: 'in', amount: '1000' })).outAmount).toBe('900')
  })

  it('separates the protocol migration condition from the Auctra recommendation', async () => {
    const client = new FakeClient()
    const adapter = new MeteoraDBCAdapter(client)
    const below = await adapter.getMigrationStatus('POOL')
    expect(below.ready).toBe(false)
    expect(below.model.separationNote).toContain('does not gate')

    client.reserve = '120000'
    const above = await adapter.getMigrationStatus('POOL')
    expect(above.ready).toBe(true)
    expect(above.model.warnings.length).toBeGreaterThan(0)
  })

  it('prepares an unsigned migration transaction and never submits', async () => {
    const client = new FakeClient()
    const adapter = new MeteoraDBCAdapter(client)
    const tx = await adapter.prepareMigration({ payer: 'PAYER', pool: 'POOL', dammConfig: 'DAMM' })
    expect(tx.transaction).toBe('base64-migrate')
    expect(client.migrations).toEqual([{ payer: 'PAYER', pool: 'POOL', dammConfig: 'DAMM' }])
  })

  it('constructs an SDK-backed client offline and exposes the full interface', async () => {
    const client = await createSdkBackedClient()
    const methods = [
      'createConfig',
      'createPool',
      'getPool',
      'getConfig',
      'getQuote',
      'getPoolQuoteTokenCurveProgress',
      'getPoolMigrationQuoteThreshold',
      'migrateToDammV2',
    ] as const
    for (const method of methods) {
      expect(typeof client[method]).toBe('function')
    }
  })
})
