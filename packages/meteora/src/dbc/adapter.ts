import { Decimal, buildMigrationModel, type DbcPlan, type MigrationModel } from '@auctra/domain'
import {
  toCurveBuilderParams,
  toFeeParams,
  validateDbcPlan,
  type ValidationIssue,
} from './config'
import { buildSdkCurveParameters } from './sdk-curve'
import type {
  DbcPoolCreateRequest,
  DbcPoolState,
  DbcQuote,
  MeteoraDbcClient,
  UnsignedTransaction,
} from './client'

/**
 * Meteora DBC adapter (AUCTRA.md Section 30).
 *
 * Responsibilities: validateConfig, buildConfig, createConfig, createPool,
 * getPool, getConfig, getQuote, getCurveProgress, getMigrationStatus,
 * prepareMigration. The adapter is the only place SDK calls happen; the
 * frontend never imports the SDK.
 *
 * Every transaction is returned UNSIGNED for wallet signing. The adapter never
 * submits.
 */
export interface AdapterConfigRequest {
  plan: DbcPlan
  tokenDecimal: number
  /** quote decimals, usually 9 */
  tokenQuoteDecimal?: number
  totalTokenSupply: number
  /** tokens held back from the curve; the SDK requires headroom */
  leftover?: number
  initialMarketCap: string
  migrationMarketCap: string
  payer: string
  config: string
  feeClaimer: string
  leftoverReceiver: string
}

export interface MigrationStatus {
  threshold: Decimal
  quoteReserve?: Decimal
  progress?: number
  ready: boolean
  model: MigrationModel
}

export class MeteoraDBCAdapter {
  constructor(private readonly client: MeteoraDbcClient) {}

  validateConfig(plan: DbcPlan): ValidationIssue[] {
    return validateDbcPlan(plan)
  }

  /** Human-readable mapping of the plan (kept separate from the SDK params). */
  buildConfig(request: AdapterConfigRequest) {
    const issues = validateDbcPlan(request.plan)
    if (issues.length > 0) {
      throw new Error(`invalid DBC plan: ${issues.map((issue) => issue.code).join(', ')}`)
    }
    const curve = toCurveBuilderParams(request.plan, {
      initialMarketCap: request.initialMarketCap,
      migrationMarketCap: request.migrationMarketCap,
      tokenDecimal: request.tokenDecimal,
    })
    const fee = toFeeParams(request.plan)
    return { ...curve, ...fee }
  }

  /**
   * Build the real SDK `ConfigParameters` for this plan.
   * Exposed so callers can inspect exactly what would be created.
   */
  async buildSdkConfig(request: AdapterConfigRequest) {
    const issues = validateDbcPlan(request.plan)
    if (issues.length > 0) {
      throw new Error(`invalid DBC plan: ${issues.map((issue) => issue.code).join(', ')}`)
    }
    return buildSdkCurveParameters(request.plan, {
      initialMarketCap: Number(request.initialMarketCap),
      migrationMarketCap: Number(request.migrationMarketCap),
      totalTokenSupply: request.totalTokenSupply,
      leftover: request.leftover,
      tokenBaseDecimal: request.tokenDecimal,
      tokenQuoteDecimal: request.tokenQuoteDecimal ?? 9,
    })
  }

  async createConfig(request: AdapterConfigRequest): Promise<UnsignedTransaction> {
    const built = await this.buildSdkConfig(request)
    return this.client.createConfig({
      payer: request.payer,
      config: request.config,
      feeClaimer: request.feeClaimer,
      leftoverReceiver: request.leftoverReceiver,
      quoteMint: request.plan.quoteMint,
      sdkParams: built.params,
    })
  }

  async createPool(params: DbcPoolCreateRequest): Promise<UnsignedTransaction> {
    return this.client.createPool(params)
  }

  async getPool(address: string): Promise<DbcPoolState> {
    return this.client.getPool(address)
  }

  async getConfig(address: string): Promise<Record<string, unknown>> {
    return this.client.getConfig(address)
  }

  async getQuote(params: { pool: string; inputMint: string; amount: string }): Promise<DbcQuote> {
    return this.client.getQuote(params)
  }

  async getCurveProgress(address: string): Promise<number> {
    return this.client.getPoolQuoteTokenCurveProgress(address)
  }

  async getMigrationStatus(address: string): Promise<MigrationStatus> {
    const [thresholdRaw, progress, pool] = await Promise.all([
      this.client.getPoolMigrationQuoteThreshold(address),
      this.client.getPoolQuoteTokenCurveProgress(address),
      this.client.getPool(address),
    ])
    const threshold = new Decimal(thresholdRaw)
    const quoteReserve = new Decimal(pool.quoteReserve)
    return {
      threshold,
      quoteReserve,
      progress,
      ready: threshold.isPositive() && quoteReserve.gte(threshold),
      model: buildMigrationModel({
        migrationQuoteThreshold: thresholdRaw,
        currentQuoteReserve: pool.quoteReserve,
      }),
    }
  }

  /** Build the unsigned DAMM v2 migration transaction for wallet approval. */
  async prepareMigration(params: {
    payer: string
    pool: string
    dammConfig: string
  }): Promise<UnsignedTransaction> {
    return this.client.migrateToDammV2(params)
  }
}
