/**
 * Source registry (AUCTRA.md Sections 4 and 49).
 *
 * Two vocabularies coexist deliberately:
 *  - `SourceType` (lifecycle events, Section 4) is UPPERCASE: PRESTOCKS_API, ...
 *  - `SourceRecordType` (source registry, Section 49) is lowercase.
 * A source record describes where a claim came from; a lifecycle event cites one.
 */
export type SourceRecordType =
  | 'prestocks_api'
  | 'prestocks_page'
  | 'pyth'
  | 'meteora'
  | 'manual'
  | 'simulation'

export interface SourceRecord {
  id: string
  sourceType: SourceRecordType
  url?: string
  retrievedAt: string
  contentHash?: string
  description: string
}

export interface SourceRecordInput {
  id: string
  sourceType: SourceRecordType
  url?: string
  retrievedAt: string
  contentHash?: string
  description: string
}

export function makeSourceRecord(input: SourceRecordInput): SourceRecord {
  return {
    id: input.id,
    sourceType: input.sourceType,
    url: input.url,
    retrievedAt: input.retrievedAt,
    contentHash: input.contentHash,
    description: input.description,
  }
}
