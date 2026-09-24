import { loadConfig } from '@auctra/config'
import { createInMemoryRepositories, createPostgresRepositories } from '@auctra/database'
import { MeteoraDBCAdapter, createSdkBackedClient } from '@auctra/meteora'
import { DemoLifecycleProvider, HttpPreStocksProvider, PreStocksLifecycleProvider } from '@auctra/prestocks'
import { HttpPythProvider, PythProProvider } from '@auctra/pyth'
import { Pool } from 'pg'
import { createApiServer } from './server'

export async function main(): Promise<void> {
  const config = loadConfig(process.env)
  // PostgreSQL in deployment; in-memory for demo mode or when DATABASE_URL is unset.
  const repos = config.databaseUrl
    ? createPostgresRepositories({ pool: new Pool({ connectionString: config.databaseUrl }) })
    : createInMemoryRepositories()

  // The DBC adapter is wired when the SDK is available. It defaults to devnet,
  // so it cannot reach mainnet by accident, and it only ever builds UNSIGNED
  // transactions for the wallet to sign.
  let dbc: MeteoraDBCAdapter | undefined
  try {
    const client = await createSdkBackedClient({ rpcUrl: config.solanaRpcUrl })
    dbc = new MeteoraDBCAdapter(client)
  } catch (error) {
    console.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        event: 'meteora_adapter_unavailable',
        message: error instanceof Error ? error.message : String(error),
      }),
    )
  }

  const prestocks = new HttpPreStocksProvider({ baseUrl: config.prestocksApiUrl })
  // Live references only when a key is present; without one the reference is
  // reported as unavailable rather than faked.
  // Pyth Pro (Lazer) when a key is present — it returns marketSession,
  // feedUpdateTimestamp and publisherCount. Hermes Core otherwise.
  const pyth = config.pythApiKey
    ? new PythProProvider({ apiKey: config.pythApiKey })
    : new HttpPythProvider({ baseUrl: config.pythHermesUrl })
  const lifecycle = config.demoMode
    ? new DemoLifecycleProvider()
    : new PreStocksLifecycleProvider({ baseUrl: 'https://www.prestocks.com' })

  const app = await createApiServer({ config, repos, prestocks, pyth, lifecycle, dbc, logger: true })
  const port = Number(process.env.PORT ?? 3001)
  await app.listen({ host: '0.0.0.0', port })
  app.log.info({ network: config.network, port }, 'auctra api listening')
}

const invokedDirectly = process.argv[1]?.endsWith('index.ts') ?? false
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
