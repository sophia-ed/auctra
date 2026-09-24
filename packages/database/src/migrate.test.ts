import { newDb } from 'pg-mem'
import type { Pool } from 'pg'
import { describe, expect, it } from 'vitest'
import { ensureSchema, schemaStatements } from './migrate'
import { createPostgresRepositories } from './postgres'

describe('ensureSchema', () => {
  it('creates the tables on a fresh database without manual SQL', async () => {
    const db = newDb()
    const { Pool: PgPool } = db.adapters.createPg()
    const pool = new PgPool() as unknown as Pool

    await ensureSchema(pool)

    const repos = createPostgresRepositories({ pool })
    await repos.assets.upsert({
      id: 'spacex',
      symbol: 'SPACEX',
      name: 'SpaceX PreStocks',
      mintAddress: 'PreANxu',
      markPrice: '153.46',
      markValuation: '1',
      tokenPrice: '112.49',
      impliedValuation: '1',
      supply: '1',
      source: 'prestocks',
      retrievedAt: '2026-09-24T00:00:00.000Z',
    })
    expect((await repos.assets.getBySymbol('SPACEX'))?.id).toBe('spacex')
  })

  it('every schema statement is idempotent (safe to run on every startup)', () => {
    const statements = schemaStatements()
    expect(statements.length).toBeGreaterThan(0)
    for (const statement of statements) {
      expect(statement.toUpperCase()).toContain('IF NOT EXISTS')
    }
  })
})
