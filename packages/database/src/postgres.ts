import type { Pool } from 'pg'
import {
  PlanImmutabilityError,
  type AssetsRepository,
  type AuditEventRecord,
  type AuditRepository,
  type EventsRepository,
  type LifecycleEventRecord,
  type PlansRepository,
  type PoolRecord,
  type PoolSnapshotRecord,
  type PoolsRepository,
  type PreStockAssetRecord,
  type ReferenceObservationRecord,
  type ReferenceRepository,
  type Repositories,
  type SimulationRunRecord,
  type SimulationsRepository,
  type SourceRecordRow,
  type SourcesRepository,
  type TransitionPlanRecord,
  type TransitionPlanVersionRecord,
} from './repositories'

/**
 * PostgreSQL-backed repositories (AUCTRA.md Section 48).
 *
 * Values are stored as text to preserve decimal precision. Historical plans are
 * append-only: a re-insert with a different output hash throws rather than
 * overwriting.
 */

function toIso(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function toIsoRequired(value: unknown): string {
  return toIso(value) ?? new Date(0).toISOString()
}

function json(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value)
}

class PostgresAssets implements AssetsRepository {
  constructor(private readonly pool: Pool) {}

  async upsert(record: PreStockAssetRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO prestock_assets
        (id, symbol, name, mint_address, mark_price, mark_valuation, token_price, implied_valuation, supply, source, retrieved_at, raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         symbol=EXCLUDED.symbol, name=EXCLUDED.name, mint_address=EXCLUDED.mint_address,
         mark_price=EXCLUDED.mark_price, mark_valuation=EXCLUDED.mark_valuation,
         token_price=EXCLUDED.token_price, implied_valuation=EXCLUDED.implied_valuation,
         supply=EXCLUDED.supply, source=EXCLUDED.source, retrieved_at=EXCLUDED.retrieved_at, raw=EXCLUDED.raw`,
      [record.id, record.symbol, record.name, record.mintAddress, record.markPrice, record.markValuation,
       record.tokenPrice, record.impliedValuation, record.supply, record.source, record.retrievedAt, json(record.raw)],
    )
  }

  async getById(id: string): Promise<PreStockAssetRecord | undefined> {
    const result = await this.pool.query('SELECT * FROM prestock_assets WHERE id=$1', [id])
    return result.rows[0] ? mapAsset(result.rows[0]) : undefined
  }
  async getBySymbol(symbol: string): Promise<PreStockAssetRecord | undefined> {
    const result = await this.pool.query('SELECT * FROM prestock_assets WHERE lower(symbol)=lower($1)', [symbol])
    return result.rows[0] ? mapAsset(result.rows[0]) : undefined
  }
  async list(): Promise<PreStockAssetRecord[]> {
    const result = await this.pool.query('SELECT * FROM prestock_assets ORDER BY symbol')
    return result.rows.map(mapAsset)
  }
}

function mapAsset(row: Record<string, unknown>): PreStockAssetRecord {
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    name: String(row.name),
    mintAddress: String(row.mint_address),
    markPrice: String(row.mark_price),
    markValuation: String(row.mark_valuation),
    tokenPrice: String(row.token_price),
    impliedValuation: String(row.implied_valuation),
    supply: String(row.supply),
    source: String(row.source),
    retrievedAt: toIsoRequired(row.retrieved_at),
  }
}

class PostgresEvents implements EventsRepository {
  constructor(private readonly pool: Pool) {}
  async insert(record: LifecycleEventRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO lifecycle_events
        (id,asset_id,type,title,announced_at,effective_at,conversion_deadline,observed_at,source_type,source_url,confidence,notes,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO NOTHING`,
      [record.id, record.assetId, record.type, record.title, record.announcedAt ?? null, record.effectiveAt ?? null,
       record.conversionDeadline ?? null, record.observedAt ?? null, record.sourceType, record.sourceUrl ?? null,
       record.confidence, record.notes ?? null, record.createdAt],
    )
  }
  async get(id: string): Promise<LifecycleEventRecord | undefined> {
    const result = await this.pool.query('SELECT * FROM lifecycle_events WHERE id=$1', [id])
    return result.rows[0] ? mapEvent(result.rows[0]) : undefined
  }
  async listByAsset(assetId: string): Promise<LifecycleEventRecord[]> {
    const result = await this.pool.query('SELECT * FROM lifecycle_events WHERE asset_id=$1 ORDER BY created_at', [assetId])
    return result.rows.map(mapEvent)
  }
  async list(): Promise<LifecycleEventRecord[]> {
    const result = await this.pool.query('SELECT * FROM lifecycle_events ORDER BY created_at')
    return result.rows.map(mapEvent)
  }
}

function mapEvent(row: Record<string, unknown>): LifecycleEventRecord {
  return {
    id: String(row.id),
    assetId: String(row.asset_id),
    type: String(row.type),
    title: String(row.title),
    announcedAt: toIso(row.announced_at),
    effectiveAt: toIso(row.effective_at),
    conversionDeadline: toIso(row.conversion_deadline),
    observedAt: toIso(row.observed_at),
    sourceType: String(row.source_type),
    sourceUrl: toIso(row.source_url),
    confidence: String(row.confidence),
    notes: row.notes === null || row.notes === undefined ? undefined : String(row.notes),
    createdAt: toIsoRequired(row.created_at),
  }
}

class PostgresReferences implements ReferenceRepository {
  constructor(private readonly pool: Pool) {}
  async insert(record: ReferenceObservationRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO reference_observations
        (id,asset_symbol,feed_id,symbol,price,confidence,exponent,market_session,publisher_count,publish_time,feed_update_timestamp,freshness,source,retrieved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO NOTHING`,
      [record.id, record.assetSymbol, record.feedId, record.symbol, record.price, record.confidence, record.exponent,
       record.marketSession ?? null, record.publisherCount ?? null, record.publishTime,
       record.feedUpdateTimestamp ?? null, record.freshness, record.source, record.retrievedAt],
    )
  }
  async list(): Promise<ReferenceObservationRecord[]> {
    const result = await this.pool.query('SELECT * FROM reference_observations ORDER BY retrieved_at')
    return result.rows.map(mapObservation)
  }
  async listByAsset(symbol: string): Promise<ReferenceObservationRecord[]> {
    const result = await this.pool.query(
      'SELECT * FROM reference_observations WHERE lower(asset_symbol)=lower($1) ORDER BY retrieved_at',
      [symbol],
    )
    return result.rows.map(mapObservation)
  }
}

function mapObservation(row: Record<string, unknown>): ReferenceObservationRecord {
  return {
    id: String(row.id),
    assetSymbol: String(row.asset_symbol),
    feedId: String(row.feed_id),
    symbol: String(row.symbol),
    price: String(row.price),
    confidence: String(row.confidence),
    exponent: Number(row.exponent),
    marketSession: toIso(row.market_session),
    publisherCount: row.publisher_count === null || row.publisher_count === undefined ? undefined : Number(row.publisher_count),
    publishTime: toIsoRequired(row.publish_time),
    feedUpdateTimestamp: toIso(row.feed_update_timestamp),
    freshness: String(row.freshness),
    source: String(row.source),
    retrievedAt: toIsoRequired(row.retrieved_at),
  }
}

class PostgresPlans implements PlansRepository {
  constructor(private readonly pool: Pool) {}

  async insert(record: TransitionPlanRecord): Promise<{ record: TransitionPlanRecord; created: boolean; version: number }> {
    const existing = await this.pool.query('SELECT * FROM transition_plans WHERE id=$1', [record.id])
    if (existing.rows[0]) {
      const current = mapPlan(existing.rows[0])
      if (current.outputHash !== record.outputHash) throw new PlanImmutabilityError(record.id)
      return { record: current, created: false, version: await this.latestVersion(record.id) }
    }
    await this.pool.query(
      `INSERT INTO transition_plans (id,asset_id,state,algorithm_version,input_hash,output_hash,generated_at,payload,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [record.id, record.assetId, record.state, record.algorithmVersion, record.inputHash, record.outputHash,
       record.generatedAt, json(record.payload), record.createdAt],
    )
    await this.pool.query(
      `INSERT INTO transition_plan_versions (plan_id,version,input_hash,output_hash,payload,created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [record.id, 1, record.inputHash, record.outputHash, json(record.payload), record.createdAt],
    )
    return { record, created: true, version: 1 }
  }

  private async latestVersion(planId: string): Promise<number> {
    const result = await this.pool.query('SELECT COUNT(*)::int AS count FROM transition_plan_versions WHERE plan_id=$1', [planId])
    return Number(result.rows[0]?.count ?? 0)
  }

  async get(id: string): Promise<TransitionPlanRecord | undefined> {
    const result = await this.pool.query('SELECT * FROM transition_plans WHERE id=$1', [id])
    return result.rows[0] ? mapPlan(result.rows[0]) : undefined
  }
  async listByAsset(assetId: string): Promise<TransitionPlanRecord[]> {
    const result = await this.pool.query('SELECT * FROM transition_plans WHERE asset_id=$1 ORDER BY generated_at', [assetId])
    return result.rows.map(mapPlan)
  }
  async list(): Promise<TransitionPlanRecord[]> {
    const result = await this.pool.query('SELECT * FROM transition_plans ORDER BY generated_at')
    return result.rows.map(mapPlan)
  }
  async listVersions(planId: string): Promise<TransitionPlanVersionRecord[]> {
    const result = await this.pool.query('SELECT * FROM transition_plan_versions WHERE plan_id=$1 ORDER BY version', [planId])
    return result.rows.map((row) => ({
      planId: String(row.plan_id),
      version: Number(row.version),
      inputHash: String(row.input_hash),
      outputHash: String(row.output_hash),
      payload: row.payload,
      createdAt: toIsoRequired(row.created_at),
    }))
  }
}

function mapPlan(row: Record<string, unknown>): TransitionPlanRecord {
  return {
    id: String(row.id),
    assetId: String(row.asset_id),
    state: String(row.state),
    algorithmVersion: String(row.algorithm_version),
    inputHash: String(row.input_hash),
    outputHash: String(row.output_hash),
    generatedAt: toIsoRequired(row.generated_at),
    payload: row.payload,
    createdAt: toIsoRequired(row.created_at),
  }
}

class PostgresSources implements SourcesRepository {
  constructor(private readonly pool: Pool) {}
  async register(record: SourceRecordRow): Promise<void> {
    await this.pool.query(
      `INSERT INTO source_records (id,source_type,url,retrieved_at,content_hash,description) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [record.id, record.sourceType, record.url ?? null, record.retrievedAt, record.contentHash ?? null, record.description],
    )
  }
  async get(id: string): Promise<SourceRecordRow | undefined> {
    const result = await this.pool.query('SELECT * FROM source_records WHERE id=$1', [id])
    const row = result.rows[0]
    return row
      ? {
          id: String(row.id),
          sourceType: String(row.source_type),
          url: toIso(row.url),
          retrievedAt: toIsoRequired(row.retrieved_at),
          contentHash: toIso(row.content_hash),
          description: String(row.description),
        }
      : undefined
  }
  async list(): Promise<SourceRecordRow[]> {
    const result = await this.pool.query('SELECT * FROM source_records ORDER BY retrieved_at')
    return result.rows.map((row) => ({
      id: String(row.id),
      sourceType: String(row.source_type),
      url: toIso(row.url),
      retrievedAt: toIsoRequired(row.retrieved_at),
      contentHash: toIso(row.content_hash),
      description: String(row.description),
    }))
  }
}

class PostgresAudit implements AuditRepository {
  constructor(private readonly pool: Pool) {}
  async append(event: Omit<AuditEventRecord, 'id' | 'createdAt'>): Promise<AuditEventRecord> {
    const result = await this.pool.query(
      `INSERT INTO audit_events (kind,actor,source,asset_id,plan_id,pool_address,transaction_signature,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, created_at`,
      [event.kind, event.actor ?? null, event.source ?? null, event.assetId ?? null, event.planId ?? null,
       event.poolAddress ?? null, event.transactionSignature ?? null, json(event.metadata)],
    )
    const row = result.rows[0] ?? {}
    return { ...event, id: Number(row.id ?? 0), createdAt: toIsoRequired(row.created_at) }
  }
  async list(): Promise<AuditEventRecord[]> {
    const result = await this.pool.query('SELECT * FROM audit_events ORDER BY id')
    return result.rows.map((row) => ({
      id: Number(row.id),
      kind: String(row.kind) as AuditEventRecord['kind'],
      actor: toIso(row.actor),
      source: toIso(row.source),
      assetId: toIso(row.asset_id),
      planId: toIso(row.plan_id),
      poolAddress: toIso(row.pool_address),
      transactionSignature: toIso(row.transaction_signature),
      metadata: row.metadata,
      createdAt: toIsoRequired(row.created_at),
    }))
  }
}

class PostgresPools implements PoolsRepository {
  constructor(private readonly pool: Pool) {}
  async upsert(pool: PoolRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO pools (address,config,base_mint,quote_mint,creation_signature,created_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (address) DO UPDATE SET config=EXCLUDED.config, base_mint=EXCLUDED.base_mint,
         quote_mint=EXCLUDED.quote_mint, creation_signature=EXCLUDED.creation_signature`,
      [pool.address, pool.config, pool.baseMint, pool.quoteMint, pool.creationSignature ?? null, pool.createdAt],
    )
  }
  async get(address: string): Promise<PoolRecord | undefined> {
    const result = await this.pool.query('SELECT * FROM pools WHERE address=$1', [address])
    const row = result.rows[0]
    return row ? mapPool(row) : undefined
  }
  async list(): Promise<PoolRecord[]> {
    const result = await this.pool.query('SELECT * FROM pools ORDER BY created_at')
    return result.rows.map(mapPool)
  }
  async addSnapshot(snapshot: PoolSnapshotRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO pool_snapshots (pool_address,quote_reserve,progress,migration_ready,observed_at,payload)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [snapshot.poolAddress, snapshot.quoteReserve, snapshot.progress, snapshot.migrationReady, snapshot.observedAt, json(snapshot.payload)],
    )
  }
  async listSnapshots(address: string): Promise<PoolSnapshotRecord[]> {
    const result = await this.pool.query('SELECT * FROM pool_snapshots WHERE pool_address=$1 ORDER BY id', [address])
    return result.rows.map((row) => ({
      poolAddress: String(row.pool_address),
      quoteReserve: String(row.quote_reserve),
      progress: String(row.progress),
      migrationReady: Boolean(row.migration_ready),
      observedAt: toIsoRequired(row.observed_at),
      payload: row.payload,
    }))
  }
}

function mapPool(row: Record<string, unknown>): PoolRecord {
  return {
    address: String(row.address),
    config: String(row.config),
    baseMint: String(row.base_mint),
    quoteMint: String(row.quote_mint),
    creationSignature: toIso(row.creation_signature),
    createdAt: toIsoRequired(row.created_at),
  }
}

class PostgresSimulations implements SimulationsRepository {
  constructor(private readonly pool: Pool) {}
  async insert(run: SimulationRunRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO simulation_runs (id,plan_id,scenario,payload,created_at) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [run.id, run.planId ?? null, run.scenario, json(run.payload), run.createdAt],
    )
  }
  async get(id: string): Promise<SimulationRunRecord | undefined> {
    const result = await this.pool.query('SELECT * FROM simulation_runs WHERE id=$1', [id])
    const row = result.rows[0]
    return row
      ? {
          id: String(row.id),
          planId: toIso(row.plan_id),
          scenario: String(row.scenario),
          payload: row.payload,
          createdAt: toIsoRequired(row.created_at),
        }
      : undefined
  }
  async listByPlan(planId: string): Promise<SimulationRunRecord[]> {
    const result = await this.pool.query('SELECT * FROM simulation_runs WHERE plan_id=$1 ORDER BY created_at', [planId])
    return result.rows.map((row) => ({
      id: String(row.id),
      planId: toIso(row.plan_id),
      scenario: String(row.scenario),
      payload: row.payload,
      createdAt: toIsoRequired(row.created_at),
    }))
  }
}

export interface PostgresRepositoriesOptions {
  pool: Pool
}

export function createPostgresRepositories(options: PostgresRepositoriesOptions): Repositories {
  const { pool } = options
  return {
    assets: new PostgresAssets(pool),
    events: new PostgresEvents(pool),
    references: new PostgresReferences(pool),
    plans: new PostgresPlans(pool),
    sources: new PostgresSources(pool),
    audit: new PostgresAudit(pool),
    pools: new PostgresPools(pool),
    simulations: new PostgresSimulations(pool),
  }
}
