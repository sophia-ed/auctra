/**
 * Persistence entities and repository contracts (AUCTRA.md Section 48).
 *
 * Repositories are async so the API and worker can run against either the
 * in-memory implementation (tests, demo) or PostgreSQL (deployment) without
 * changing call sites.
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
  upsert(record: PreStockAssetRecord): Promise<void>
  getBySymbol(symbol: string): Promise<PreStockAssetRecord | undefined>
  getById(id: string): Promise<PreStockAssetRecord | undefined>
  list(): Promise<PreStockAssetRecord[]>
}

export interface EventsRepository {
  insert(record: LifecycleEventRecord): Promise<void>
  get(id: string): Promise<LifecycleEventRecord | undefined>
  listByAsset(assetId: string): Promise<LifecycleEventRecord[]>
  list(): Promise<LifecycleEventRecord[]>
}

export interface ReferenceRepository {
  insert(record: ReferenceObservationRecord): Promise<void>
  list(): Promise<ReferenceObservationRecord[]>
  listByAsset(symbol: string): Promise<ReferenceObservationRecord[]>
}

export interface PlansRepository {
  /** Append-only. Returns whether the id was newly created (idempotent otherwise). */
  insert(record: TransitionPlanRecord): Promise<{ record: TransitionPlanRecord; created: boolean; version: number }>
  get(id: string): Promise<TransitionPlanRecord | undefined>
  listByAsset(assetId: string): Promise<TransitionPlanRecord[]>
  list(): Promise<TransitionPlanRecord[]>
  listVersions(planId: string): Promise<TransitionPlanVersionRecord[]>
}

export interface SourcesRepository {
  register(record: SourceRecordRow): Promise<void>
  get(id: string): Promise<SourceRecordRow | undefined>
  list(): Promise<SourceRecordRow[]>
}

export interface AuditRepository {
  append(event: Omit<AuditEventRecord, 'id' | 'createdAt'>): Promise<AuditEventRecord>
  list(): Promise<AuditEventRecord[]>
}

export interface PoolsRepository {
  upsert(pool: PoolRecord): Promise<void>
  get(address: string): Promise<PoolRecord | undefined>
  list(): Promise<PoolRecord[]>
  addSnapshot(snapshot: PoolSnapshotRecord): Promise<void>
  listSnapshots(address: string): Promise<PoolSnapshotRecord[]>
}

export interface SimulationsRepository {
  insert(run: SimulationRunRecord): Promise<void>
  get(id: string): Promise<SimulationRunRecord | undefined>
  listByPlan(planId: string): Promise<SimulationRunRecord[]>
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
