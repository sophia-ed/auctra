import { checkSdkVersion, readInstalledSdkVersion } from './version'

/**
 * Network-facing client contract for the DBC adapter (AUCTRA.md Section 30).
 *
 * The adapter depends on this interface, never on the SDK directly, so the
 * domain/adapter logic stays testable and the SDK binding lives in one place.
 * `sdkParams` is the SDK's `ConfigParameters` (built by
 * `buildSdkCurveParameters`); it is typed `unknown` here to keep the SDK out of
 * the interface.
 */

export interface DbcPoolState {
  address: string
  config: string
  baseMint: string
  quoteMint: string
  /** Decimal string of the pool's quote reserve (derived from progress × threshold). */
  quoteReserve: string
  migrationQuoteThreshold: string
  /** 0..1 curve progress. */
  progress: number
  activationPoint?: string
  migrated: boolean
}

export interface DbcQuote {
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  feeAmount?: string
  nextSqrtPrice?: string
}

export interface UnsignedTransaction {
  /** Base64-encoded unsigned transaction, ready for wallet signing. */
  transaction: string
  blockhash?: string
  lastValidBlockHeight?: number
  /** Base64 secret keys for extra signers (e.g. DAMM v2 migration NFT keypairs). */
  additionalSigners?: string[]
}

export interface DbcConfigRequest {
  payer: string
  config: string
  feeClaimer: string
  leftoverReceiver: string
  quoteMint: string
  /** ConfigParameters produced by buildSdkCurveParameters. */
  sdkParams: unknown
}

export interface DbcPoolCreateRequest {
  payer: string
  config: string
  baseMint: string
  name: string
  symbol: string
  uri: string
  poolCreator: string
}

export interface DbcMigrationRequest {
  payer: string
  pool: string
  dammConfig: string
}

export interface MeteoraDbcClient {
  createConfig(request: DbcConfigRequest): Promise<UnsignedTransaction>
  createPool(params: DbcPoolCreateRequest): Promise<UnsignedTransaction>
  getPool(address: string): Promise<DbcPoolState>
  getConfig(address: string): Promise<Record<string, unknown>>
  getQuote(params: { pool: string; inputMint: string; amount: string }): Promise<DbcQuote>
  getPoolQuoteTokenCurveProgress(address: string): Promise<number>
  getPoolMigrationQuoteThreshold(address: string): Promise<string>
  migrateToDammV2(params: DbcMigrationRequest): Promise<UnsignedTransaction>
}

export class MeteoraSdkUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MeteoraSdkUnavailableError'
  }
}

export interface SdkClientOptions {
  rpcUrl?: string
  commitment?: string
}
