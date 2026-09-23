import { describe, expect, it } from 'vitest'
import {
  HttpPythProvider,
  MockPythProvider,
  PythObservationUnavailableError,
  PythUnavailableError,
  classifyFreshness,
  computeFreshness,
  confidenceBps,
  feedsForAsset,
  hasMarketReference,
  mantissaToDecimal,
  parseProFeedPayload,
  toReferenceState,
} from './index'

const OPENAI_FEED = {
  feedId: '96d4bb23a3db78fdb72b3a03ce80ead686096f324319166534d9a27c0519c483',
  symbol: 'Equity.Index.OPENAI/USD',
  price: '11223872331053',
  confidence: 1373488286,
  exponent: -8,
  marketSession: 'regular',
  publisherCount: 9,
  feedUpdateTimestamp: 1_758_690_761_750_000,
  timestampUs: '1758690761750000',
}

describe('Pyth observation parsing (Sections 14, 78)', () => {
  it('applies the decimal exponent', () => {
    expect(mantissaToDecimal('11223872331053', -8).toFixed(5)).toBe('112238.72331')
  })

  it('parses the documented payload shape', () => {
    const observation = parseProFeedPayload(OPENAI_FEED)
    expect(observation.price.toFixed(5)).toBe('112238.72331')
    expect(observation.confidence.toFixed(8)).toBe('13.73488286')
    expect(observation.marketSession).toBe('regular')
    expect(observation.publisherCount).toBe(9)
    expect(Date.parse(observation.publishTime)).not.toBeNaN()
    expect(observation.feedUpdateTimestamp).toBeDefined()
  })

  it('derives confidence in basis points', () => {
    const observation = parseProFeedPayload(OPENAI_FEED)
    expect(confidenceBps(observation.price, observation.confidence).toNumber()).toBeCloseTo(1.2237, 3)
  })

  it('rejects a missing price instead of inventing one', () => {
    expect(() => parseProFeedPayload({ ...OPENAI_FEED, price: null })).toThrow(
      PythObservationUnavailableError,
    )
  })
})

describe('Pyth freshness engine (Section 15)', () => {
  it('classifies fresh, aging, stale and unknown', () => {
    expect(classifyFreshness(4)).toBe('FRESH')
    expect(classifyFreshness(120)).toBe('AGING')
    expect(classifyFreshness(9999)).toBe('STALE')
    expect(classifyFreshness(undefined)).toBe('UNKNOWN')
  })

  it('uses feedUpdateTimestamp as the freshness origin', () => {
    const result = computeFreshness({
      now: '2026-09-23T12:02:00.000Z',
      feedUpdateTimestamp: '2026-09-23T12:00:00.000Z',
      publishTime: '2026-09-23T12:02:00.000Z',
    })
    expect(result.ageSeconds).toBe(120)
    expect(result.ageSource).toBe('feedUpdateTimestamp')
    expect(result.status).toBe('AGING')
  })

  it('detects a carried-forward price', () => {
    const result = computeFreshness({
      now: '2026-09-23T12:05:00.000Z',
      feedUpdateTimestamp: '2026-09-23T12:00:00.000Z',
      publishTime: '2026-09-23T12:05:00.000Z',
    })
    expect(result.carriedForward).toBe(true)
    expect(result.ageSeconds).toBe(300)
  })

  it('falls back to publishTime when no feed update timestamp exists', () => {
    const result = computeFreshness({
      now: '2026-09-23T12:01:00.000Z',
      publishTime: '2026-09-23T12:00:30.000Z',
    })
    expect(result.ageSource).toBe('publishTime')
    expect(result.ageSeconds).toBe(30)
  })
})

describe('Pyth feed registry (Section 90)', () => {
  it('knows which PreStocks have a verified reference', () => {
    expect(hasMarketReference('OPENAI')).toBe(true)
    expect(hasMarketReference('ANTHROPIC')).toBe(true)
    expect(hasMarketReference('ANDURIL')).toBe(false)
    expect(feedsForAsset('SPCX').length).toBe(4)
  })
})

describe('reference providers (Section 13)', () => {
  it('maps an observation plus freshness into a reference state', async () => {
    const observation = await new MockPythProvider({
      symbol: 'OPENAI',
      now: () => '2026-09-23T12:00:00.000Z',
    }).getReference({ symbol: 'OPENAI' })
    const freshness = computeFreshness({
      now: '2026-09-23T12:00:00.000Z',
      feedUpdateTimestamp: observation.feedUpdateTimestamp,
    })
    const state = toReferenceState(observation, freshness)
    expect(state.source).toBe('pyth')
    expect(state.freshness).toBe('FRESH')
    expect(state.confidenceBps.toFixed(4)).toBe('4.6667')
  })

  it('fails actionably when no authenticated observation source is configured', async () => {
    const provider = new HttpPythProvider()
    await expect(provider.getReference({ symbol: 'OPENAI' })).rejects.toBeInstanceOf(
      PythObservationUnavailableError,
    )
  })

  it('fails clearly when an asset has no verified feed', async () => {
    const provider = new HttpPythProvider()
    await expect(provider.getReference({ symbol: 'ANDURIL' })).rejects.toBeInstanceOf(
      PythUnavailableError,
    )
  })
})
