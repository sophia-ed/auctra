import type { SourceRecord } from './source'

export class SourceConflictError extends Error {
  constructor(readonly id: string) {
    super(`source record "${id}" already exists with a different content hash`)
    this.name = 'SourceConflictError'
  }
}

/**
 * In-memory source registry (AUCTRA.md Sections 4, 49, 85).
 *
 * Every externally sourced claim resolves to a record here. Registering the
 * same id twice is idempotent; registering the same id with a *different*
 * content hash is a conflict and fails loudly rather than overwriting evidence.
 * A persistent registry replaces this when the database package lands.
 */
export class SourceRegistry {
  private readonly records = new Map<string, SourceRecord>()

  register(record: SourceRecord): SourceRecord {
    const existing = this.records.get(record.id)
    if (existing) {
      if (existing.contentHash && record.contentHash && existing.contentHash !== record.contentHash) {
        throw new SourceConflictError(record.id)
      }
      return existing
    }
    this.records.set(record.id, record)
    return record
  }

  registerAll(records: readonly SourceRecord[]): SourceRecord[] {
    return records.map((record) => this.register(record))
  }

  get(id: string): SourceRecord | undefined {
    return this.records.get(id)
  }

  has(id: string): boolean {
    return this.records.has(id)
  }

  list(): SourceRecord[] {
    return [...this.records.values()]
  }

  findByUrl(url: string): SourceRecord[] {
    return this.list().filter((record) => record.url === url)
  }

  get size(): number {
    return this.records.size
  }
}
