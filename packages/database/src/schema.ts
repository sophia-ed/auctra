import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * PostgreSQL schema (AUCTRA.md Section 48).
 *
 * Monetary and ratio values are stored as text to preserve decimal precision;
 * complex objects are stored as jsonb. Historical plans are append-only: the
 * `transition_plans` row is immutable and every revision is recorded in
 * `transition_plan_versions`.
 */

export const preStockAssets = pgTable('prestock_assets', {
  id: text('id').primaryKey(),
  symbol: text('symbol').notNull(),
  name: text('name').notNull(),
  mintAddress: text('mint_address').notNull(),
  markPrice: text('mark_price').notNull(),
  markValuation: text('mark_valuation').notNull(),
  tokenPrice: text('token_price').notNull(),
  impliedValuation: text('implied_valuation').notNull(),
  supply: text('supply').notNull(),
  source: text('source').notNull(),
  retrievedAt: timestamp('retrieved_at', { withTimezone: true }).notNull(),
  raw: jsonb('raw'),
})

export const lifecycleEvents = pgTable('lifecycle_events', {
  id: text('id').primaryKey(),
  assetId: text('asset_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  announcedAt: timestamp('announced_at', { withTimezone: true }),
  effectiveAt: timestamp('effective_at', { withTimezone: true }),
  conversionDeadline: timestamp('conversion_deadline', { withTimezone: true }),
  observedAt: timestamp('observed_at', { withTimezone: true }),
  sourceType: text('source_type').notNull(),
  sourceUrl: text('source_url'),
  confidence: text('confidence').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const referenceObservations = pgTable('reference_observations', {
  id: text('id').primaryKey(),
  assetSymbol: text('asset_symbol').notNull(),
  feedId: text('feed_id').notNull(),
  symbol: text('symbol').notNull(),
  price: text('price').notNull(),
  confidence: text('confidence').notNull(),
  exponent: integer('exponent').notNull(),
  marketSession: text('market_session'),
  publisherCount: integer('publisher_count'),
  publishTime: timestamp('publish_time', { withTimezone: true }).notNull(),
  feedUpdateTimestamp: timestamp('feed_update_timestamp', { withTimezone: true }),
  freshness: text('freshness').notNull(),
  source: text('source').notNull(),
  retrievedAt: timestamp('retrieved_at', { withTimezone: true }).notNull(),
})

export const conversionSpecs = pgTable('conversion_specs', {
  id: text('id').primaryKey(),
  sourceAssetMint: text('source_asset_mint').notNull(),
  targetAssetMint: text('target_asset_mint').notNull(),
  ratioNumerator: text('ratio_numerator').notNull(),
  ratioDenominator: text('ratio_denominator').notNull(),
  effectiveAt: timestamp('effective_at', { withTimezone: true }),
  deadline: timestamp('deadline', { withTimezone: true }),
  sourceUrl: text('source_url').notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull(),
})

export const transitionPlans = pgTable('transition_plans', {
  id: text('id').primaryKey(),
  assetId: text('asset_id').notNull(),
  state: text('state').notNull(),
  algorithmVersion: text('algorithm_version').notNull(),
  inputHash: text('input_hash').notNull(),
  outputHash: text('output_hash').notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const transitionPlanVersions = pgTable('transition_plan_versions', {
  id: serial('id').primaryKey(),
  planId: text('plan_id').notNull(),
  version: integer('version').notNull(),
  inputHash: text('input_hash').notNull(),
  outputHash: text('output_hash').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const liquidityPlans = pgTable('liquidity_plans', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull(),
  payload: jsonb('payload').notNull(),
})

export const dbcPlans = pgTable('dbc_plans', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull(),
  payload: jsonb('payload').notNull(),
})

export const simulationScenarios = pgTable('simulation_scenarios', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  payload: jsonb('payload').notNull(),
})

export const simulationRuns = pgTable('simulation_runs', {
  id: text('id').primaryKey(),
  planId: text('plan_id'),
  scenario: text('scenario').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const pools = pgTable('pools', {
  address: text('address').primaryKey(),
  config: text('config').notNull(),
  baseMint: text('base_mint').notNull(),
  quoteMint: text('quote_mint').notNull(),
  creationSignature: text('creation_signature'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const poolSnapshots = pgTable('pool_snapshots', {
  id: serial('id').primaryKey(),
  poolAddress: text('pool_address').notNull(),
  quoteReserve: text('quote_reserve').notNull(),
  progress: text('progress').notNull(),
  migrationReady: boolean('migration_ready').notNull(),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
  payload: jsonb('payload'),
})

export const sourceRecords = pgTable('source_records', {
  id: text('id').primaryKey(),
  sourceType: text('source_type').notNull(),
  url: text('url'),
  retrievedAt: timestamp('retrieved_at', { withTimezone: true }).notNull(),
  contentHash: text('content_hash'),
  description: text('description').notNull(),
})

export const auditEvents = pgTable('audit_events', {
  id: serial('id').primaryKey(),
  kind: text('kind').notNull(),
  actor: text('actor'),
  source: text('source'),
  assetId: text('asset_id'),
  planId: text('plan_id'),
  poolAddress: text('pool_address'),
  transactionSignature: text('transaction_signature'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
