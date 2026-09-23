import { describe, expect, it } from 'vitest'
import {
  PlanImmutabilityError,
  createInMemoryRepositories,
  newId,
  type TransitionPlanRecord,
} from './index'

function planRecord(overrides: Partial<TransitionPlanRecord> = {}): TransitionPlanRecord {
  return {
    id: 'tp_abc',
    assetId: 'spacex',
    state: 'PUBLIC_TRANSITION',
    algorithmVersion: '1.0.0',
    inputHash: 'in-hash',
    outputHash: 'out-hash',
    generatedAt: '2026-09-23T00:00:00Z',
    payload: { id: 'tp_abc' },
    createdAt: '2026-09-23T00:00:00Z',
    ...overrides,
  }
}

describe('repositories (Section 48)', () => {
  it('treats plans as append-only and idempotent', async () => {
    const repos = createInMemoryRepositories()
    const first = await repos.plans.insert(planRecord())
    expect(first.created).toBe(true)
    expect(first.version).toBe(1)

    const again = await repos.plans.insert(planRecord())
    expect(again.created).toBe(false)
    expect(again.version).toBe(1)

    expect(await repos.plans.listVersions('tp_abc')).toHaveLength(1)
  })

  it('refuses to overwrite a plan with different content', async () => {
    const repos = createInMemoryRepositories()
    await repos.plans.insert(planRecord())
    await expect(repos.plans.insert(planRecord({ outputHash: 'different' }))).rejects.toThrowError(
      PlanImmutabilityError,
    )
  })

  it('stores events by asset and assets by symbol', async () => {
    const repos = createInMemoryRepositories()
    await repos.assets.upsert({
      id: 'spacex',
      symbol: 'SPACEX',
      name: 'SpaceX PreStocks',
      mintAddress: 'PreANxu',
      markPrice: '153.46',
      markValuation: '2012108521836',
      tokenPrice: '112.49',
      impliedValuation: '1474960556212',
      supply: '43712.5',
      source: 'prestocks',
      retrievedAt: '2026-09-23T00:00:00Z',
    })
    await repos.events.insert({
      id: 'ev-1',
      assetId: 'spacex',
      type: 'IPO',
      title: 'SPACEX: IPO',
      observedAt: '2026-09-23T00:00:00Z',
      sourceType: 'PRESTOCKS_PAGE',
      confidence: '0.6',
      createdAt: '2026-09-23T00:00:00Z',
    })
    expect((await repos.assets.getBySymbol('spacex'))?.mintAddress).toBe('PreANxu')
    expect(await repos.events.listByAsset('spacex')).toHaveLength(1)
  })

  it('records an append-only audit trail', async () => {
    const repos = createInMemoryRepositories()
    await repos.audit.append({ kind: 'asset_imported', assetId: 'spacex' })
    await repos.audit.append({ kind: 'policy_compiled', planId: 'tp_abc' })
    const events = await repos.audit.list()
    expect(events.map((event) => event.kind)).toEqual(['asset_imported', 'policy_compiled'])
    expect(events[0].id).toBeLessThan(events[1].id)
  })

  it('tracks pools and their snapshots', async () => {
    const repos = createInMemoryRepositories()
    await repos.pools.upsert({
      address: 'POOL',
      config: 'CONFIG',
      baseMint: 'BASE',
      quoteMint: 'QUOTE',
      createdAt: '2026-09-23T00:00:00Z',
    })
    await repos.pools.addSnapshot({
      poolAddress: 'POOL',
      quoteReserve: '40000',
      progress: '0.4',
      migrationReady: false,
      observedAt: '2026-09-23T00:00:00Z',
    })
    expect(await repos.pools.listSnapshots('POOL')).toHaveLength(1)
  })

  it('generates unique ids', () => {
    expect(newId('sim')).not.toBe(newId('sim'))
  })
})
