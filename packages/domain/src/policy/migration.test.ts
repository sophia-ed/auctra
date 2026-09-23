import { describe, expect, it } from 'vitest'
import { buildMigrationModel } from '../index'

describe('migration model (Section 29)', () => {
  it('states the protocol condition as permissionless and separate from advice', () => {
    const model = buildMigrationModel({
      migrationQuoteThreshold: '100000',
      currentQuoteReserve: '40000',
      eventIntensity: '0.7',
      deadlineDistanceSeconds: 5 * 86400,
    })
    expect(model.protocol.kind).toBe('QUOTE_THRESHOLD')
    expect(model.protocol.permissionless).toBe(true)
    expect(model.separationNote).toContain('does not gate')
    expect(model.warnings).toHaveLength(0)
    expect(model.auctraRecommendation.isAdvice).toBe(true)
  })

  it('warns when the protocol condition is already met', () => {
    const model = buildMigrationModel({
      migrationQuoteThreshold: '100000',
      currentQuoteReserve: '120000',
    })
    expect(model.warnings.some((warning) => warning.includes('permissionless'))).toBe(true)
    expect(model.auctraRecommendation.summary).toContain('migration-ready')
  })

  it('flags a non-positive threshold', () => {
    const model = buildMigrationModel({ migrationQuoteThreshold: '0' })
    expect(model.warnings.some((warning) => warning.includes('greater than zero'))).toBe(true)
  })
})
