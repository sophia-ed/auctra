import { Decimal, dec, type DecimalInput } from '../math/decimal'
import { ratioToBps } from '../math/bps'
import { explanationFrom, type PolicyExplanation } from './explanation'

/**
 * Migration model (AUCTRA.md Section 29).
 *
 * The DBC migration threshold is a protocol configuration. Auctra must not
 * invent an oracle-based gate, and must not claim it can prevent permissionless
 * migration. The protocol condition and the Auctra recommendation are shown as
 * separate concepts.
 */
export interface MigrationProtocolCondition {
  kind: 'QUOTE_THRESHOLD'
  threshold: Decimal
  permissionless: boolean
  description: string
}

export interface AuctraMigrationRecommendation {
  summary: string
  factors: string[]
  isAdvice: boolean
}

export interface MigrationModel {
  protocol: MigrationProtocolCondition
  auctraRecommendation: AuctraMigrationRecommendation
  separationNote: string
  warnings: string[]
  explanation: PolicyExplanation[]
}

export interface MigrationInput {
  migrationQuoteThreshold: DecimalInput
  currentQuoteReserve?: DecimalInput
  eventIntensity?: DecimalInput
  deadlineDistanceSeconds?: number
}

export function buildMigrationModel(input: MigrationInput): MigrationModel {
  const threshold = dec(input.migrationQuoteThreshold)
  const warnings: string[] = []
  const factors: string[] = []

  const protocol: MigrationProtocolCondition = {
    kind: 'QUOTE_THRESHOLD',
    threshold,
    permissionless: true,
    description:
      "Meteora migrates a DBC pool to DAMM v2 once the pool's quote balance reaches the config's migrationQuoteThreshold. The condition is protocol-enforced and permissionless.",
  }

  if (input.eventIntensity !== undefined) {
    factors.push(`event intensity ${dec(input.eventIntensity).toFixed(3)}`)
  }
  if (input.deadlineDistanceSeconds !== undefined) {
    factors.push(`${(input.deadlineDistanceSeconds / 86400).toFixed(1)} days to deadline`)
  }

  let recommendation = 'Hold the proposed configuration; no migration-specific action is indicated by the current inputs.'

  if (input.currentQuoteReserve !== undefined) {
    const reserve = dec(input.currentQuoteReserve)
    const progress = threshold.gt(0) ? reserve.div(threshold) : new Decimal(0)
    factors.push(`quote reserve ${reserve.toString()} (${ratioToBps(reserve, threshold).toFixed(1)} bps of threshold)`)
    if (progress.gte(1)) {
      warnings.push(
        'the protocol migration condition is already met; migration is permissionless and cannot be blocked by Auctra',
      )
      recommendation =
        'The protocol condition is met. Auctra recommends treating the pool as migration-ready and preparing the DAMM v2 migration rather than adding transition liquidity.'
    } else if (progress.gte('0.75')) {
      recommendation =
        'The pool is close to the migration threshold. Auctra recommends planning the DAMM v2 handoff and avoiding a large last-minute liquidity change.'
    }
  }

  if (!threshold.gt(0)) {
    warnings.push('migrationQuoteThreshold must be greater than zero')
  }

  return {
    protocol,
    auctraRecommendation: { summary: recommendation, factors, isAdvice: true },
    separationNote:
      'The protocol migration condition is enforced by Meteora. The Auctra recommendation is analysis only and does not gate, delay or prevent migration.',
    warnings,
    explanation: [
      explanationFrom('migrationQuoteThreshold', 'sets the protocol migration condition', threshold.toString()),
      explanationFrom(
        'current quote reserve',
        'measures distance to the protocol condition',
        input.currentQuoteReserve === undefined ? 'not observed' : dec(input.currentQuoteReserve).toString(),
      ),
      explanationFrom('event intensity and deadline', 'inform the Auctra recommendation only', factors.join('; ') || 'none'),
    ],
  }
}
