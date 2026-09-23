import {
  checkSdkVersion,
  readInstalledSdkVersion,
  REQUIRED_SDK_EXPORTS,
} from './version'
import type { CurveBuilderParams, FeeParams } from './config'

/**
 * Network-facing client contract for the DBC adapter (AUCTRA.md Section 30).
 *
 * The adapter depends on this interface, never on the SDK directly, so the
 * domain/adapter logic stays testable and the SDK binding lives in one place.
 */
export interface DbcPoolState {
  address: string
  config: string
  baseMint: string
  quoteMint: string
  /** Decimal string of the pool's quote reserve. */
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
}

export interface DbcConfigParams extends CurveBuilderParams, FeeParams {
  payer: string
  config: string
  feeClaimer: string
  leftoverReceiver: string
  quoteMint: string
  tokenDecimal: number
}

export interface DbcPoolParams {
  payer: string
  config: string
  baseMint: string
  name: string
  symbol: string
  uri: string
  poolCreator: string
}

export interface MeteoraDbcClient {
  createConfig(params: DbcConfigParams): Promise<UnsignedTransaction>
  createPool(params: DbcPoolParams): Promise<UnsignedTransaction>
  getPool(address: string): Promise<DbcPoolState>
  getConfig(address: string): Promise<Record<string, unknown>>
  getQuote(params: { pool: string; inputMint: string; amount: string }): Promise<DbcQuote>
  getPoolQuoteTokenCurveProgress(address: string): Promise<number>
  getPoolMigrationQuoteThreshold(address: string): Promise<string>
  migrateToDammV2(params: { payer: string; pool: string }): Promise<UnsignedTransaction>
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

/**
 * Resolve an SDK-backed client.
 *
 * The version/export guard (§31) runs first. The network binding itself is
 * completed in the deployment phase, once the SDK is installed and its IDL
 * inspected — Auctra does not invent SDK method signatures.
 */
export async function createSdkBackedClient(_options: SdkClientOptions = {}): Promise<MeteoraDbcClient> {
  const installed = readInstalledSdkVersion()
  const versionCheck = checkSdkVersion(installed)
  if (!versionCheck.ok) {
    throw new MeteoraSdkUnavailableError(versionCheck.message)
  }
  throw new MeteoraSdkUnavailableError(
    `DBC SDK ${installed} is installed but the network binding is not wired yet. ` +
      `Wire the following exports: ${REQUIRED_SDK_EXPORTS.join(', ')}.`,
  )
}
