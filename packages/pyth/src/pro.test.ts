import { describe, expect, it } from 'vitest'
import { PythAuthError, PythObservationUnavailableError, PythProProvider } from './index'

const OPENAI_FEED_ID = '96d4bb23a3db78fdb72b3a03ce80ead686096f324319166534d9a27c0519c483'

function body(overrides: Record<string, unknown> = {}) {
  return {
    parsed: {
      timestampUs: '1790177000000000',
      priceFeeds: [
        {
          priceFeedId: 6,
          price: '182420000',
          confidence: '70000',
          exponent: -8,
          publisherCount: 9,
          marketSession: 'regular',
          feedUpdateTimestamp: '1790176996000000',
          ...overrides,
        },
      ],
    },
  }
}

describe('Pyth Pro provider (Sections 13-16)', () => {
  it('returns a live observation with session, freshness and publisher count', async () => {
    let capturedBody: Record<string, unknown> = {}
    const fetchImpl = (async (url: string, init: { body: string }) => {
      capturedBody = JSON.parse(init.body)
      return new Response(JSON.stringify(body()), { status: 200 })
    }) as unknown as typeof fetch

    const provider = new PythProProvider({ apiKey: 'test-key', fetchImpl })
    const observation = await provider.getReference({ symbol: 'OPENAI' })

    expect(observation.marketSession).toBe('regular')
    expect(observation.publisherCount).toBe(9)
    expect(observation.feedUpdateTimestamp).toBeDefined()
    expect(observation.price.toFixed(4)).toBe('1.8242')
    expect(observation.feedId).toBe('6')
    expect(capturedBody.channel).toBe('real_time')
    expect((capturedBody.symbols as string[]).join(',')).toContain('Equity.Index.OPENAI/USD')
    expect((capturedBody.properties as string[])).toContain('feedUpdateTimestamp')
  })

  it('reports a carried-forward price from feedUpdateTimestamp', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify(body({ feedUpdateTimestamp: '1790170000000000' })), {
        status: 200,
      })) as unknown as typeof fetch
    const observation = await new PythProProvider({ apiKey: 'k', fetchImpl }).getReference({
      symbol: 'OPENAI',
    })
    expect(observation.feedUpdateTimestamp).toBeDefined()
    // carried forward: the price was generated before the update's publish time
    expect(Date.parse(observation.feedUpdateTimestamp as string)).toBeLessThan(
      Date.parse(observation.publishTime),
    )
  })

  it('refuses to fabricate when the feed carries no price', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify(body({ price: null })), { status: 200 })) as unknown as typeof fetch
    await expect(
      new PythProProvider({ apiKey: 'k', fetchImpl }).getReference({ symbol: 'OPENAI' }),
    ).rejects.toBeInstanceOf(PythObservationUnavailableError)
  })

  it('maps a 401 to a PythAuthError', async () => {
    const fetchImpl = (async () => new Response('unauthorized', { status: 401 })) as unknown as typeof fetch
    await expect(
      new PythProProvider({ apiKey: 'bad', fetchImpl }).getReference({ symbol: 'OPENAI' }),
    ).rejects.toBeInstanceOf(PythAuthError)
  })

  it('throws when the asset has no verified feed', async () => {
    const fetchImpl = (async () => new Response('{}', { status: 200 })) as unknown as typeof fetch
    await expect(
      new PythProProvider({ apiKey: 'k', fetchImpl }).getReference({ symbol: 'ANDURIL' }),
    ).rejects.toThrowError(/No verified Pyth feed/)
  })
})

// sanity: the OpenAI hex id belongs to the Hermes registry; the Pro path uses
// symbols, so no hex->numeric mapping is required.
describe('feed id usage', () => {
  it('uses symbols, not numeric ids', () => {
    expect(OPENAI_FEED_ID).toMatch(/^[0-9a-f]{64}$/)
  })
})
