/**
 * Caching for public external data (AUCTRA.md Section 63).
 *
 * The important property: a temporary upstream failure must never replace a
 * previously verified value with empty data. The last good value is returned
 * and marked stale, with the error surfaced.
 */

export interface CacheEntry<T> {
  value: T
  lastFetchedAt: string
  expiresAt: string
  etag?: string
  contentHash?: string
}

export interface TtlCacheOptions {
  ttlMs: number
  now: () => string
}

export class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>()

  constructor(private readonly options: TtlCacheOptions) {}

  set(key: string, value: T, extra: { etag?: string; contentHash?: string } = {}): CacheEntry<T> {
    const lastFetchedAt = this.options.now()
    const entry: CacheEntry<T> = {
      value,
      lastFetchedAt,
      expiresAt: new Date(Date.parse(lastFetchedAt) + this.options.ttlMs).toISOString(),
      etag: extra.etag,
      contentHash: extra.contentHash,
    }
    this.entries.set(key, entry)
    return entry
  }

  get(key: string): CacheEntry<T> | undefined {
    return this.entries.get(key)
  }

  /** Fresh = present and not past its expiry. */
  getFresh(key: string): CacheEntry<T> | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    return this.isStale(entry) ? undefined : entry
  }

  isStale(entry: CacheEntry<T>): boolean {
    return Date.parse(entry.expiresAt) <= Date.parse(this.options.now())
  }

  delete(key: string): void {
    this.entries.delete(key)
  }

  keys(): string[] {
    return [...this.entries.keys()]
  }

  get size(): number {
    return this.entries.size
  }
}

export interface CachedLoadResult<T> {
  value: T
  /** 'fresh' when the loader succeeded, 'cache' when a previous value was served. */
  source: 'fresh' | 'cache'
  stale: boolean
  lastFetchedAt: string
  expiresAt?: string
  contentHash?: string
  error?: string
}

export interface CachedLoadOptions<T> {
  cache: TtlCache<T>
  key: string
  loader: () => Promise<T>
  /** Optional content hash of the loaded value. */
  hash?: (value: T) => string
}

/**
 * Load through the cache. On success the cache is refreshed. On failure the
 * previous entry is returned (marked stale) if one exists, otherwise the error
 * propagates — never an empty value.
 */
export async function cachedLoad<T>(options: CachedLoadOptions<T>): Promise<CachedLoadResult<T>> {
  const { cache, key, loader, hash } = options
  const previous = cache.get(key)

  try {
    const value = await loader()
    const entry = cache.set(key, value, { contentHash: hash?.(value) })
    return {
      value,
      source: 'fresh',
      stale: false,
      lastFetchedAt: entry.lastFetchedAt,
      expiresAt: entry.expiresAt,
      contentHash: entry.contentHash,
    }
  } catch (thrown) {
    const message = thrown instanceof Error ? thrown.message : String(thrown)
    if (previous) {
      return {
        value: previous.value,
        source: 'cache',
        stale: true,
        lastFetchedAt: previous.lastFetchedAt,
        expiresAt: previous.expiresAt,
        contentHash: previous.contentHash,
        error: message,
      }
    }
    throw thrown
  }
}
