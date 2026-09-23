import type { DataQualityIssue, LifecycleEvent, LifecycleEventType, SourceType } from '@auctra/domain'
import type { ConversionNotice } from './types'

/**
 * Parse a lifecycle disclosure from a PreStocks asset page (AUCTRA.md Sections
 * 9, 10, 19). The parser never invents a date, ratio or target: anything it
 * cannot read becomes an explicit data-quality issue.
 */

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
}

const DEADLINE_RE =
  /(\d{1,2}):(\d{2})\s*(am|pm)\s+UTC\s+on\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/i
const RATIO_RE = /into\s+([0-9]*\.?[0-9]+)\s+\$?([A-Za-z][A-Za-z0-9]*)/i
const TARGET_RE = /swapped\s+into\s+\$?([A-Za-z][A-Za-z0-9]*)/i
const NOTICE_RE = /(expire worthless|swapped into|has gone public|was acquired by|acquisition|merger)/i

export function parseDeadline(text: string): string | undefined {
  const match = DEADLINE_RE.exec(text)
  if (!match) return undefined
  let hour = Number(match[1])
  const minute = Number(match[2])
  const meridiem = match[3].toLowerCase()
  if (meridiem === 'pm' && hour !== 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0
  const day = Number(match[4])
  const month = MONTHS[match[5].toLowerCase()]
  const year = Number(match[6])
  if (month === undefined) return undefined
  return new Date(Date.UTC(year, month, day, hour, minute, 0, 0)).toISOString()
}

export function detectEventType(text: string): LifecycleEventType {
  if (/has gone public/i.test(text)) return 'IPO'
  if (/was acquired by|acquisiti/i.test(text)) return 'ACQUISITION'
  if (/merger|merged with/i.test(text)) return 'MERGER'
  if (/expire worthless|will expire/i.test(text)) return 'EXPIRATION'
  if (/conversion|converted/i.test(text)) return 'CONVERSION'
  return 'CORPORATE_ACTION'
}

/** Split source text into sentences that look like lifecycle notices. */
export function extractDisclosureSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0 && NOTICE_RE.test(sentence))
}

export interface ParsedDisclosure {
  eventType: LifecycleEventType | null
  targetSymbol?: string
  ratioNumerator?: string
  ratioDenominator?: string
  deadline?: string
  verbatim: string
  issues: DataQualityIssue[]
}

export function parsePreStocksDisclosure(text: string): ParsedDisclosure {
  const issues: DataQualityIssue[] = []
  const sentences = extractDisclosureSentences(text)

  if (sentences.length === 0) {
    return {
      eventType: null,
      verbatim: '',
      issues: [
        {
          code: 'NO_DISCLOSURE_FOUND',
          message: 'no lifecycle disclosure sentence found in the source text',
        },
      ],
    }
  }

  // A notice is often split across sentences ("X has gone public!" + the swap
  // terms), so parse over all matched notice text rather than just the first.
  const verbatim = sentences.join(' ')
  const eventType = detectEventType(verbatim)
  const deadline = parseDeadline(verbatim)
  if (!deadline) {
    issues.push({
      code: 'MISSING_DEADLINE',
      message: 'disclosure has no parseable deadline',
      field: 'conversionDeadline',
    })
  }

  const ratioMatch = RATIO_RE.exec(verbatim)
  const targetMatch = TARGET_RE.exec(verbatim)

  let ratioNumerator: string | undefined
  let ratioDenominator: string | undefined
  let targetSymbol: string | undefined

  if (ratioMatch) {
    ratioNumerator = ratioMatch[1]
    ratioDenominator = '1'
    targetSymbol = ratioMatch[2]
  } else if (targetMatch) {
    targetSymbol = targetMatch[1]
  }

  if (!targetSymbol) {
    issues.push({
      code: 'MISSING_TARGET',
      message: 'disclosure names no target asset',
      field: 'targetSymbol',
    })
  }

  if ((eventType === 'CONVERSION' || eventType === 'ACQUISITION') && !ratioNumerator) {
    issues.push({
      code: 'RATIO_NOT_PUBLISHED',
      message: 'the issuer published no numeric conversion ratio; conversion stays UNKNOWN',
      field: 'ratio',
    })
  }

  return { eventType, targetSymbol, ratioNumerator, ratioDenominator, deadline, verbatim, issues }
}

export interface DisclosureContext {
  assetId: string
  assetSymbol: string
  sourceUrl: string
  retrievedAt: string
  sourceType: SourceType
  confidence?: number
}

export interface DisclosureResult {
  event?: LifecycleEvent
  conversion?: ConversionNotice
  issues: DataQualityIssue[]
}

/**
 * Turn a parsed disclosure into a stored lifecycle event. The issuer's
 * announcement/effective times are NOT fabricated: `observedAt` records when
 * Auctra saw the disclosure, and the machine treats it as a labelled anchor.
 */
export function disclosureToEvent(parsed: ParsedDisclosure, ctx: DisclosureContext): DisclosureResult {
  const issues = [...parsed.issues]
  if (!parsed.eventType) return { issues }

  const event: LifecycleEvent = {
    id: `ev_${ctx.assetId}_${parsed.eventType}_${parsed.deadline ?? 'nodate'}`,
    assetId: ctx.assetId,
    type: parsed.eventType,
    title: `${ctx.assetSymbol}: ${parsed.eventType}`,
    observedAt: ctx.retrievedAt,
    conversionDeadline: parsed.deadline,
    sourceUrl: ctx.sourceUrl,
    sourceType: ctx.sourceType,
    confidence: ctx.confidence ?? 0.7,
    notes: `Observed from ${ctx.sourceUrl} at ${ctx.retrievedAt}. Verbatim: "${parsed.verbatim}"`,
  }

  const conversion: ConversionNotice = {
    sourceSymbol: ctx.assetSymbol,
    targetSymbol: parsed.targetSymbol,
    ratioNumerator: parsed.ratioNumerator,
    ratioDenominator: parsed.ratioDenominator,
    deadline: parsed.deadline,
    sourceUrl: ctx.sourceUrl,
    retrievedAt: ctx.retrievedAt,
  }

  return { event, conversion, issues }
}
