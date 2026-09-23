import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import BN from 'bn.js'
import {
  MeteoraSdkUnavailableError,
  type DbcConfigRequest,
  type DbcPoolCreateRequest,
  type DbcPoolState,
  type DbcQuote,
  type DbcMigrationRequest,
  type MeteoraDbcClient,
  type SdkClientOptions,
  type UnsignedTransaction,
} from './client'
import { checkSdkVersion, readInstalledSdkVersion, REQUIRED_SDK_EXPORTS } from './version'

const DEFAULT_DEVNET_RPC = 'https://api.devnet.solana.com'

/**
 * The SDK returns a transaction without a blockhash, so we fetch one and attach
 * it (with the fee payer) before serialising. The blockhash is returned so the
 * client can use the same one when it confirms.
 */
async function finalizeUnsigned(
  connection: Connection,
  transaction: Transaction,
  feePayer: PublicKey,
): Promise<UnsignedTransaction> {
  if (!transaction.feePayer) transaction.feePayer = feePayer

  let blockhash = transaction.recentBlockhash
  let lastValidBlockHeight = transaction.lastValidBlockHeight
  if (!blockhash) {
    const latest = await connection.getLatestBlockhash()
    blockhash = latest.blockhash
    lastValidBlockHeight = latest.lastValidBlockHeight
    transaction.recentBlockhash = blockhash
    transaction.lastValidBlockHeight = lastValidBlockHeight
  }

  return {
    transaction: transaction
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString('base64'),
    blockhash,
    lastValidBlockHeight,
  }
}

/**
 * SDK-backed client (AUCTRA.md Section 30).
 *
 * Constructs the real `DynamicBondingCurveClient` and returns UNSIGNED
 * transactions. It never signs and never submits — the browser wallet does.
 * Defaults to devnet so a misconfiguration cannot reach mainnet.
 */
export async function createSdkBackedClient(options: SdkClientOptions = {}): Promise<MeteoraDbcClient> {
  const versionCheck = checkSdkVersion(readInstalledSdkVersion())
  if (!versionCheck.ok) {
    throw new MeteoraSdkUnavailableError(versionCheck.message)
  }

  const sdk = await import('@meteora-ag/dynamic-bonding-curve-sdk')
  for (const name of REQUIRED_SDK_EXPORTS) {
    if (!(name in sdk)) {
      throw new MeteoraSdkUnavailableError(`installed SDK is missing the expected export ${name}`)
    }
  }

  type Commitment = 'processed' | 'confirmed' | 'finalized'
  const commitment = (options.commitment ?? 'confirmed') as Commitment
  const connection = new Connection(options.rpcUrl ?? DEFAULT_DEVNET_RPC, commitment)
  const client = sdk.DynamicBondingCurveClient.create(connection, commitment)

  return {
    async createConfig(request: DbcConfigRequest): Promise<UnsignedTransaction> {
      const payer = new PublicKey(request.payer)
      const transaction = await client.partner.createConfig({
        ...(request.sdkParams as Record<string, unknown>),
        payer,
        config: new PublicKey(request.config),
        feeClaimer: new PublicKey(request.feeClaimer),
        leftoverReceiver: new PublicKey(request.leftoverReceiver),
        quoteMint: new PublicKey(request.quoteMint),
      } as unknown as Parameters<typeof client.partner.createConfig>[0])
      return finalizeUnsigned(connection, transaction, payer)
    },

    async createPool(params: DbcPoolCreateRequest): Promise<UnsignedTransaction> {
      const payer = new PublicKey(params.payer)
      const transaction = await client.creator.createPool({
        name: params.name,
        symbol: params.symbol,
        uri: params.uri,
        payer,
        poolCreator: new PublicKey(params.poolCreator),
        config: new PublicKey(params.config),
        baseMint: new PublicKey(params.baseMint),
      })
      return finalizeUnsigned(connection, transaction, payer)
    },

    async getPool(address: string): Promise<DbcPoolState> {
      const [pool, progress, threshold] = await Promise.all([
        client.state.getPool(address),
        client.state.getPoolQuoteTokenCurveProgress(address),
        client.state.getPoolMigrationQuoteThreshold(address),
      ])
      if (!pool) throw new Error(`DBC pool ${address} not found`)

      const thresholdString = threshold.toString()
      // The pool's quote reserve is not a single field; derive it from curve
      // progress and the migration threshold (documented as derived).
      const quoteReserve = new BN(thresholdString).muln(Math.round(progress * 1e6)).divn(1e6).toString()

      const record = pool as unknown as Record<string, unknown>
      return {
        address,
        config: String(record.config ?? ''),
        baseMint: String(record.baseMint ?? ''),
        quoteMint: String(record.quoteMint ?? ''),
        quoteReserve,
        migrationQuoteThreshold: thresholdString,
        progress,
        migrated: progress >= 1,
      }
    },

    async getConfig(address: string): Promise<Record<string, unknown>> {
      const config = await client.state.getPoolConfig(address)
      return (config ?? {}) as unknown as Record<string, unknown>
    },

    async getQuote(params: { pool: string; inputMint: string; amount: string }): Promise<DbcQuote> {
      const [pool, config] = await Promise.all([
        client.state.getPool(params.pool),
        client.state.getPoolConfig(params.pool),
      ])
      if (!pool || !config) throw new Error(`DBC pool or config ${params.pool} not found`)

      const baseMint = String((pool as unknown as Record<string, unknown>).baseMint ?? '')
      const swapBaseForQuote = params.inputMint !== baseMint
      const activationType = (config as unknown as { activationType: number }).activationType
      const currentPoint = await sdk.getCurrentPoint(connection, activationType as never)

      const quote = client.pool.swapQuote({
        virtualPool: pool,
        config,
        swapBaseForQuote,
        amountIn: new BN(params.amount),
        slippageBps: 0,
        hasReferral: false,
        eligibleForFirstSwapWithMinFee: false,
        currentPoint,
      })

      return {
        inputMint: params.inputMint,
        outputMint: swapBaseForQuote ? baseMint : String((pool as unknown as Record<string, unknown>).quoteMint ?? ''),
        inAmount: params.amount,
        outAmount: quote.outputAmount.toString(),
        nextSqrtPrice: quote.nextSqrtPrice.toString(),
      }
    },

    async getPoolQuoteTokenCurveProgress(address: string): Promise<number> {
      return client.state.getPoolQuoteTokenCurveProgress(address)
    },

    async getPoolMigrationQuoteThreshold(address: string): Promise<string> {
      const threshold = await client.state.getPoolMigrationQuoteThreshold(address)
      return threshold.toString()
    },

    async migrateToDammV2(params: DbcMigrationRequest): Promise<UnsignedTransaction> {
      const payer = new PublicKey(params.payer)
      const response = await client.migration.migrateToDammV2({
        payer,
        pool: new PublicKey(params.pool),
        dammConfig: new PublicKey(params.dammConfig),
      })
      const finalized = await finalizeUnsigned(connection, response.transaction, payer)
      return {
        ...finalized,
        // The migration creates two position NFTs that must co-sign.
        additionalSigners: [
          Buffer.from(response.firstPositionNftKeypair.secretKey).toString('base64'),
          Buffer.from(response.secondPositionNftKeypair.secretKey).toString('base64'),
        ],
      }
    },
  }
}
