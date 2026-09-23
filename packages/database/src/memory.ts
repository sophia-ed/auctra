import { randomUUID } from 'node:crypto'
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

class MemoryAssets implements AssetsRepository {
  private readonly byId = new Map<string, PreStockAssetRecord>()
  upsert(record: PreStockAssetRecord) {
    this.byId.set(record.id, record)
  }
  getBySymbol(symbol: string) {
    const wanted = symbol.toLowerCase()
    return [...this.byId.values()].find((record) => record.symbol.toLowerCase() === wanted)
  }
  getById(id: string) {
    return this.byId.get(id)
  }
  list() {
    return [...this.byId.values()]
  }
}

class MemoryEvents implements EventsRepository {
  private readonly byId = new Map<string, LifecycleEventRecord>()
  insert(record: LifecycleEventRecord) {
    this.byId.set(record.id, record)
  }
  get(id: string) {
    return this.byId.get(id)
  }
  listByAsset(assetId: string) {
    return [...this.byId.values()].filter((record) => record.assetId === assetId)
  }
  list() {
    return [...this.byId.values()]
  }
}

class MemoryReferences implements ReferenceRepository {
  private readonly records: ReferenceObservationRecord[] = []
  insert(record: ReferenceObservationRecord) {
    this.records.push(record)
  }
  listByAsset(symbol: string) {
    return this.records.filter((record) => record.assetSymbol.toLowerCase() === symbol.toLowerCase())
  }
}

class MemoryPlans implements PlansRepository {
  private readonly byId = new Map<string, TransitionPlanRecord>()
  private readonly versions = new Map<string, TransitionPlanVersionRecord[]>()

  insert(record: TransitionPlanRecord) {
    const existing = this.byId.get(record.id)
    if (existing) {
      if (existing.outputHash !== record.outputHash) {
        throw new PlanImmutabilityError(record.id)
      }
      return { record: existing, created: false, version: this.latestVersion(record.id) }
    }
    this.byId.set(record.id, record)
    const list = this.versions.get(record.id) ?? []
    const version = list.length + 1
    list.push({
      planId: record.id,
      version,
      inputHash: record.inputHash,
      outputHash: record.outputHash,
      payload: record.payload,
      createdAt: new Date().toISOString(),
    })
    this.versions.set(record.id, list)
    return { record, created: true, version }
  }

  private latestVersion(planId: string) {
    return this.versions.get(planId)?.length ?? 0
  }

  get(id: string) {
    return this.byId.get(id)
  }
  listByAsset(assetId: string) {
    return [...this.byId.values()].filter((record) => record.assetId === assetId)
  }
  list() {
    return [...this.byId.values()]
  }
  listVersions(planId: string) {
    return this.versions.get(planId) ?? []
  }
}

class MemorySources implements SourcesRepository {
  private readonly byId = new Map<string, SourceRecordRow>()
  register(record: SourceRecordRow) {
    this.byId.set(record.id, record)
  }
  get(id: string) {
    return this.byId.get(id)
  }
  list() {
    return [...this.byId.values()]
  }
}

class MemoryAudit implements AuditRepository {
  private readonly records: AuditEventRecord[] = []
  private nextId = 1
  append(event: Omit<AuditEventRecord, 'id' | 'createdAt'>) {
    const record: AuditEventRecord = { ...event, id: this.nextId++, createdAt: new Date().toISOString() }
    this.records.push(record)
    return record
  }
  list() {
    return [...this.records]
  }
}

class MemoryPools implements PoolsRepository {
  private readonly byAddress = new Map<string, PoolRecord>()
  private readonly snapshots: PoolSnapshotRecord[] = []
  upsert(pool: PoolRecord) {
    this.byAddress.set(pool.address, pool)
  }
  get(address: string) {
    return this.byAddress.get(address)
  }
  list() {
    return [...this.byAddress.values()]
  }
  addSnapshot(snapshot: PoolSnapshotRecord) {
    this.snapshots.push(snapshot)
  }
  listSnapshots(address: string) {
    return this.snapshots.filter((snapshot) => snapshot.poolAddress === address)
  }
}

class MemorySimulations implements SimulationsRepository {
  private readonly byId = new Map<string, SimulationRunRecord>()
  insert(run: SimulationRunRecord) {
    this.byId.set(run.id, run)
  }
  get(id: string) {
    return this.byId.get(id)
  }
  listByPlan(planId: string) {
    return [...this.byId.values()].filter((run) => run.planId === planId)
  }
}

/** In-memory repository set used by tests and demo mode. */
export function createInMemoryRepositories(): Repositories {
  return {
    assets: new MemoryAssets(),
    events: new MemoryEvents(),
    references: new MemoryReferences(),
    plans: new MemoryPlans(),
    sources: new MemorySources(),
    audit: new MemoryAudit(),
    pools: new MemoryPools(),
    simulations: new MemorySimulations(),
  }
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID()}`
}
