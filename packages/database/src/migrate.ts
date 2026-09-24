import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Pool } from 'pg'

export function schemaStatements(): string[] {
  const schemaPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'sql', '0001_init.sql')
  return readFileSync(schemaPath, 'utf8')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
}

/**
 * Apply the schema statement by statement. All DDL uses IF NOT EXISTS, so a
 * deployment self-initialises on startup and re-running is a no-op on a real
 * PostgreSQL server. This replaces the need to run SQL by hand when using a
 * dedicated or managed database.
 */
export async function ensureSchema(pool: Pool): Promise<void> {
  for (const statement of schemaStatements()) {
    await pool.query(statement)
  }
}
