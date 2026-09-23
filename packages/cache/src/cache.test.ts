import { describe, expect, it } from 'vitest'
import { TtlCache, cachedLoad } from './index'

function clock(start: string) {
  let current = start
  return {
    now: () => current,
    advance: (ms: number) => {
      current = new Date(Date.parse(current) + ms).toISOString()
    },
  }
}

describe('TTL cache (Section 63)', () => {
  it('stores and expires entries', () => {
    const time = clock('2026-09-23T00:00:00.000Z')
    const cache = new TtlCache<string>({ ttlMs: 60000, now: time.now })
    cache.set('k', 'v')
    expect(cache.getFresh('k')?.value).toBe('v')
    time.advance(61000)
    expect(cache.getFresh('k')).toBeUndefined()
    expect(cache.get('k')?.value).toBe('v')
  })
})

describe('cachedLoad (Section 63)', () => {
  it('returns fresh data and records metadata on success', async () => {
    const time = clock('2026-09-23T00:00:00.000Z')
    const cache = new TtlCache<number>({ ttlMs: 60000, now: time.now })
    const result = await cachedLoad({ cache, key: 'n', loader: async () => 42, hash: (value) => `h${value}` })
    expect(result).toMatchObject({ value: 42, source: 'fresh', stale: false, contentHash: 'h42' })
    expect(result.lastFetchedAt).toBe('2026-09-23T00:00:00.000Z')
  })

  it('never replaces a verified value on upstream failure', async () => {
    const time = clock('2026-09-23T00:00:00.000Z')
    const cache = new TtlCache<string[]>({ ttlMs: 60000, now: time.now })
    await cachedLoad({ cache, key: 'assets', loader: async () => ['SPACEX', 'OPENAI'] })

    time.advance(120000)
    const result = await cachedLoad({
      cache,
      key: 'assets',
      loader: async () => {
        throw new Error('upstream 503')
      },
    })
    expect(result.source).toBe('cache')
    expect(result.stale).toBe(true)
    expect(result.value).toEqual(['SPACEX', 'OPENAI'])
    expect(result.error).toContain('503')
  })

  it('propagates the error when there is no cached value', async () => {
    const time = clock('2026-09-23T00:00:00.000Z')
    const cache = new TtlCache<string>({ ttlMs: 60000, now: time.now })
    await expect(
      cachedLoad({
        cache,
        key: 'missing',
        loader: async () => {
          throw new Error('boom')
        },
      }),
    ).rejects.toThrowError('boom')
  })
})
