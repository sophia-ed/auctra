/**
 * Persistence entities and repository contracts (AUCTRA.md Section 48).
 * Repositories are interfaces so the API can run against PostgreSQL in
 * production and an in-memory implementation in tests.
 */

export type AuditKind =
  | 'asset_imported'
  | 'event_added'
  | 'reference_observed'
  | 'policy_compiled'
  | 'simulation_executed'
  | 'configuration_prepared'
  | 'deployment_submitted'
  | 'deployment_confirmed'

export interface PreStockAssetRecord {
  id: string
  symbol: string
  name: string
  mintAddress: string
  markPrice: string
  markValuation: string
  tokenPrice: string
  impliedValuation: string
  supply: string
  source: string
  retrievedAt: string
  raw?: unknown
}

export interface LifecycleEventRecord {
  id: string
  assetId: string
  type: string
  title: string
  announcedAt?: string
  effectiveAt?: string
  conversionDeadline?: string
  observedAt?: string
  sourceType: string
  sourceUrl?: string
  confidence: string
  notes?: string
  createdAt: string
}

export interface ReferenceObservationRecord {
  id: string
  assetSymbol: string
  feedId: string
  symbol: string
  price: string
  confidence: string
  exponent: number
  marketSession?: string
  publisherCount?: number
  publishTime: string
  feedUpdateTimestamp?: string
  freshness: string
  source: string
  retrievedAt: string
}

export interface TransitionPlanRecord {
  id: string
  assetId: string
  state: string
  algorithmVersion: string
  inputHash: string
  outputHash: string
  generatedAt: string
  payload: unknown
  createdAt: string
}

export interface TransitionPlanVersionRecord {
  planId: string
  version: number
  inputHash: string
  outputHash: string
  payload: unknown
  createdAt: string
}

export interface SourceRecordRow {
  id: string
  sourceType: string
  url?: string
  retrievedAt: string
  contentHash?: string
  description: string
}

export interface AuditEventRecord {
  id: number
  kind: AuditKind
  actor?: string
  source?: string
  assetId?: string
  planId?: string
  poolAddress?: string
  transactionSignature?: string
  metadata?: unknown
  createdAt: string
}

export interface PoolRecord {
  address: string
  config: string
  baseMint: string
  quoteMint: string
  creationSignature?: string
  createdAt: string
}

export interface PoolSnapshotRecord {
  poolAddress: string
  quoteReserve: string
  progress: string
  migrationReady: boolean
  observedAt: string
  payload?: unknown
}

export interface SimulationRunRecord {
  id: string
  planId?: string
  scenario: string
  payload: unknown
  createdAt: string
}

export class PlanImmutabilityError extends Error {
  constructor(planId: string) {
    super(`transition plan "${planId}" already exists with different content; plans are append-only`)
    this.name = 'PlanImmutabilityError'
  }
}

export interface AssetsRepository {
  upsert(record: PreStockAssetRecord): void
  getBySymbol(symbol: string): PreStockAssetRecord | undefined
  getById(id: string): PreStockAssetRecord | undefined
  list(): PreStockAssetRecord[]
}

export interface EventsRepository {
  insert(record: LifecycleEventRecord): void
  get(id: string): LifecycleEventRecord | undefined
  listByAsset(assetId: string): LifecycleEventRecord[]
  list(): LifecycleEventRecord[]
}

export interface ReferenceRepository {
  insert(record: ReferenceObservationRecord): void
  list(): ReferenceObservationRecord[]
  listByAsset(symbol: string): ReferenceObservationRecord[]
}

export interface PlansRepository {
  /** Append-only. Returns whether the id was newly created (idempotent otherwise). */
  insert(record: TransitionPlanRecord): { record: TransitionPlanRecord; created: boolean; version: number }
  get(id: string): TransitionPlanRecord | undefined
  listByAsset(assetId: string): TransitionPlanRecord[]
  list(): TransitionPlanRecord[]
  listVersions(planId: string): TransitionPlanVersionRecord[]
}

export interface SourcesRepository {
  register(record: SourceRecordRow): void
  get(id: string): SourceRecordRow | undefined
  list(): SourceRecordRow[]
}

export interface AuditRepository {
  append(event: Omit<AuditEventRecord, 'id' | 'createdAt'>): AuditEventRecord
  list(): AuditEventRecord[]
}

export interface PoolsRepository {
  upsert(pool: PoolRecord): void
  get(address: string): PoolRecord | undefined
  list(): PoolRecord[]
  addSnapshot(snapshot: PoolSnapshotRecord): void
  listSnapshots(address: string): PoolSnapshotRecord[]
}

export interface SimulationsRepository {
  insert(run: SimulationRunRecord): void
  get(id: string): SimulationRunRecord | undefined
  listByPlan(planId: string): SimulationRunRecord[]
}

export interface Repositories {
  assets: AssetsRepository
  events: EventsRepository
  references: ReferenceRepository
  plans: PlansRepository
  sources: SourcesRepository
  audit: AuditRepository
  pools: PoolsRepository
  simulations: SimulationsRepository
}
