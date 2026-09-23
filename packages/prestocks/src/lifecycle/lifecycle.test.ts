import { describe, expect, it } from 'vitest'
import {
  LifecycleState,
  SourceRegistry,
  computeTransitionGap,
  deriveLifecycleState,
  makeSourceRecord,
} from '@auctra/domain'
import {
  DemoLifecycleProvider,
  ManualLifecycleProvider,
  PreStocksLifecycleProvider,
  normalizePreStockAsset,
  parsePreStocksDisclosure,
  type PreStockAsset,
} from '../index'

const SPACEX_DISCLOSURE =
  'SpaceX has gone public! SpaceX PreStocks tokens must be swapped into $SPCXx or any other token before 11:59pm UTC on 12 March 2027, or they will expire worthless.'

const XAI_DISCLOSURE =
  'xAI was acquired by SpaceX. Each XAI token must be swapped into 0.7165 SPACEX before 11:59pm UTC on 12 September 2026, or it will expire worthless.'

const RETRIEVED_AT = '2026-09-23T12:59:10.000Z'

const SPACEX: PreStockAsset = normalizePreStockAsset(
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

const XAI: PreStockAsset = normalizePreStockAsset(
  {
    name: 'xAI PreStocks',
    symbol: 'XAI',
    contract_address: 'UNKNOWN',
    markPrice: 0,
    markValuation: 0,
    tokenPrice: 0,
    impliedValuation: 0,
    supply: 0,
  },
  RETRIEVED_AT,
)

describe('PreStocks disclosure parser (Sections 9, 10, 19)', () => {
  it('parses the real SpaceX post-IPO notice', () => {
    const parsed = parsePreStocksDisclosure(SPACEX_DISCLOSURE)
    expect(parsed.eventType).toBe('IPO')
    expect(parsed.targetSymbol).toBe('SPCXx')
    expect(parsed.deadline).toBe('2027-03-12T23:59:00.000Z')
    // no numeric ratio is published for SpaceX: it must stay UNKNOWN
    expect(parsed.ratioNumerator).toBeUndefined()
    expect(parsed.issues.some((issue) => issue.code === 'RATIO_NOT_PUBLISHED')).toBe(false)
  })

  it('parses the real xAI acquisition notice with its ratio', () => {
    const parsed = parsePreStocksDisclosure(XAI_DISCLOSURE)
    expect(parsed.eventType).toBe('ACQUISITION')
    expect(parsed.ratioNumerator).toBe('0.7165')
    expect(parsed.ratioDenominator).toBe('1')
    expect(parsed.targetSymbol).toBe('SPACEX')
    expect(parsed.deadline).toBe('2026-09-12T23:59:00.000Z')
  })

  it('finds a notice inside a larger page and flags empty sources', () => {
    const page = `Products. SpaceX Get SpaceX. ${SPACEX_DISCLOSURE} PreStocks provide only economic exposure.`
    expect(parsePreStocksDisclosure(page).eventType).toBe('IPO')
    const empty = parsePreStocksDisclosure('Nothing to see here.')
    expect(empty.eventType).toBeNull()
    expect(empty.issues[0].code).toBe('NO_DISCLOSURE_FOUND')
  })
})

describe('lifecycle providers (Section 9)', () => {
  it('reads a disclosure from the PreStocks page and records its source', async () => {
    const fetchImpl = (async () =>
      new Response(SPACEX_DISCLOSURE, { status: 200 })) as unknown as typeof fetch
    const provider = new PreStocksLifecycleProvider({ fetchImpl, now: () => RETRIEVED_AT })
    const result = await provider.getEventsDetailed(SPACEX)

    expect(result.events).toHaveLength(1)
    expect(result.events[0].sourceType).toBe('PRESTOCKS_PAGE')
    expect(result.events[0].observedAt).toBe(RETRIEVED_AT)
    expect(result.sources[0].sourceType).toBe('prestocks_page')
    expect(result.sources[0].contentHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('requires manual events to carry a source', async () => {
    const provider = new ManualLifecycleProvider({ now: () => RETRIEVED_AT })
    provider.add('OPENAI', {
      id: 'manual-1',
      assetId: 'openai',
      type: 'CORPORATE_ACTION',
      title: 'Manual event',
      observedAt: RETRIEVED_AT,
      sourceType: 'MANUAL',
      confidence: 0.5,
    })
    const result = await provider.getEventsDetailed(
      normalizePreStockAsset(
        {
          name: 'OpenAI PreStocks',
          symbol: 'OPENAI',
          contract_address: 'PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF',
          markPrice: 1,
          markValuation: 1,
          tokenPrice: 1,
          impliedValuation: 1,
          supply: 1,
        },
        RETRIEVED_AT,
      ),
    )
    expect(result.issues.some((issue) => issue.code === 'MANUAL_WITHOUT_SOURCE')).toBe(true)
  })

  it('labels demo seeds as cached snapshots', async () => {
    const result = await new DemoLifecycleProvider().getEventsDetailed(SPACEX)
    expect(result.events).toHaveLength(1)
    expect(result.issues.some((issue) => issue.code === 'CACHED_SNAPSHOT')).toBe(true)
  })
})

describe('verified lifecycle examples (Section 10)', () => {
  it('derives PUBLIC_TRANSITION for the open SpaceX window', async () => {
    const events = await new DemoLifecycleProvider().getEvents(SPACEX)
    expect(deriveLifecycleState(events, RETRIEVED_AT)).toBe(LifecycleState.PUBLIC_TRANSITION)
  })

  it('derives EXPIRED for the closed xAI window', async () => {
    const events = await new DemoLifecycleProvider().getEvents(XAI)
    expect(deriveLifecycleState(events, RETRIEVED_AT)).toBe(LifecycleState.EXPIRED)
  })

  it('feeds a computable transition gap from an issuer ratio', async () => {
    const { conversion } = await new DemoLifecycleProvider().getEventsDetailed(XAI)
    expect(conversion?.ratioNumerator).toBe('0.7165')
    const gap = computeTransitionGap({
      sourceReference: '100',
      targetReference: SPACEX.markPrice.toString(),
      conversionRatio: conversion?.ratioNumerator,
    })
    expect(gap.status).toBe('COMPUTABLE')
    expect(gap.gapBps).toBeLessThan(0)
  })
})

describe('source registry (Sections 4, 49)', () => {
  it('deduplicates identical records and rejects conflicting content', () => {
    const registry = new SourceRegistry()
    const record = makeSourceRecord({
      id: 'prestocks:api:2026-09-23',
      sourceType: 'prestocks_api',
      url: 'https://prestocks.com/api/prestocks',
      retrievedAt: RETRIEVED_AT,
      contentHash: 'a'.repeat(64),
      description: 'PreStocks API snapshot',
    })
    registry.register(record)
    registry.register(record)
    expect(registry.size).toBe(1)

    expect(() =>
      registry.register({ ...record, contentHash: 'b'.repeat(64) }),
    ).toThrowError(/different content hash/)
  })
})
