export type LifecycleEventType =
  | 'IPO'
  | 'ACQUISITION'
  | 'MERGER'
  | 'CONVERSION'
  | 'EXPIRATION'
  | 'CORPORATE_ACTION'
  | 'CUSTOM'

/** Provenance labels (AUCTRA.md Sections 4 and 49). */
export type SourceType =
  | 'PRESTOCKS_API'
  | 'PRESTOCKS_PAGE'
  | 'PYTH'
  | 'SOLANA'
  | 'METEORA'
  | 'MANUAL'
  | 'SIMULATION'

export interface LifecycleEvent {
  id: string
  assetId: string
  type: LifecycleEventType
  title: string
  announcedAt?: string
  effectiveAt?: string
  conversionDeadline?: string
  sourceUrl?: string
  sourceType: SourceType
  /** 0..1 */
  confidence: number
  notes?: string
}

export interface DataQualityIssue {
  code: string
  message: string
  field?: string
  eventId?: string
}

function parseIso(value: string): number | null {
  const t = Date.parse(value)
  return Number.isNaN(t) ? null : t
}

export function validateLifecycleEvent(event: LifecycleEvent): DataQualityIssue[] {
  const issues: DataQualityIssue[] = []
  const push = (code: string, message: string, field?: string) =>
    issues.push({ code, message, field, eventId: event.id })

  if (!event.id) push('MISSING_ID', 'event has no id', 'id')
  if (!event.assetId) push('MISSING_ASSET_ID', 'event has no assetId', 'assetId')
  if (!event.title) push('MISSING_TITLE', 'event has no title', 'title')

  for (const field of ['announcedAt', 'effectiveAt', 'conversionDeadline'] as const) {
    const value = event[field]
    if (value !== undefined && parseIso(value) === null) {
      push('INVALID_TIMESTAMP', `${field} is not a valid ISO timestamp`, field)
    }
  }

  if (!Number.isFinite(event.confidence) || event.confidence < 0 || event.confidence > 1) {
    push('INVALID_CONFIDENCE', 'confidence must be within [0, 1]', 'confidence')
  }

  if (event.sourceType === 'MANUAL' && !event.sourceUrl) {
    push(
      'MANUAL_WITHOUT_SOURCE',
      'manual events must still record a sourceUrl or note where the fact came from',
      'sourceUrl',
    )
  }

  if (!event.announcedAt && !event.effectiveAt && !event.conversionDeadline) {
    push('NO_TIMESTAMPS', 'event has no usable timestamp', 'announcedAt')
  }

  return issues
}

function toIsoIfValid(value?: string): string | undefined {
  if (value === undefined) return undefined
  const t = parseIso(value)
  return t === null ? value : new Date(t).toISOString()
}

/**
 * Canonical ordering and timestamp normalization (AUCTRA.md Section 47).
 * Events are ordered by their earliest meaningful timestamp, then by id, so the
 * derived lifecycle and its hash are stable regardless of input array order.
 */
export function normalizeLifecycleEvents(events: readonly LifecycleEvent[]): LifecycleEvent[] {
  return events
    .map((event) => ({
      ...event,
      announcedAt: toIsoIfValid(event.announcedAt),
      effectiveAt: toIsoIfValid(event.effectiveAt),
      conversionDeadline: toIsoIfValid(event.conversionDeadline),
    }))
    .sort((a, b) => {
      const at = Date.parse(a.announcedAt ?? a.effectiveAt ?? a.conversionDeadline ?? '') || 0
      const bt = Date.parse(b.announcedAt ?? b.effectiveAt ?? b.conversionDeadline ?? '') || 0
      if (at !== bt) return at - bt
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })
}
