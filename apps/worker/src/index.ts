import { loadConfig } from '@auctra/config'
import {
  createInMemoryRepositories,
  createPostgresRepositories,
  ensureSchema,
} from '@auctra/database'
import {
  DemoLifecycleProvider,
  HttpPreStocksProvider,
  PreStocksLifecycleProvider,
} from '@auctra/prestocks'
import { HttpPythProvider, PythProProvider } from '@auctra/pyth'
import { Pool } from 'pg'
import { AuctraWorker } from './worker'

/**
 * Worker entry point (AUCTRA.md Section 62).
 *
 * Reads and recalculates only. It holds no wallet and cannot submit
 * transactions; deployment remains wallet-signed in the browser.
 */
export async function main(): Promise<void> {
  const config = loadConfig(process.env)
  let repos
  if (config.databaseUrl) {
    const pool = new Pool({ connectionString: config.databaseUrl })
    await ensureSchema(pool)
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'schema_applied' }))
    repos = createPostgresRepositories({ pool })
  } else {
    repos = createInMemoryRepositories()
  }

  const prestocks = new HttpPreStocksProvider({ baseUrl: config.prestocksApiUrl })
  const lifecycle = config.demoMode
    ? new DemoLifecycleProvider()
    : new PreStocksLifecycleProvider({ baseUrl: 'https://www.prestocks.com' })

  // Live references require an authenticated Pyth source; without a key the
  // worker simply does not perform the reference stage.
  const pyth = config.pythApiKey
    ? new PythProProvider({ apiKey: config.pythApiKey })
    : undefined

  const intervalMs = Number(process.env.WORKER_INTERVAL_MS ?? 60000)

  const worker = new AuctraWorker({
    repos,
    prestocks,
    lifecycle,
    pyth,
    onLog: (log) => console.log(JSON.stringify({ ts: new Date().toISOString(), ...log })),
  })

  const report = await worker.runOnce()
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      event: 'worker_started',
      network: config.network,
      demoMode: config.demoMode,
      intervalMs,
      report,
    }),
  )

  worker.start(intervalMs)
}

const invokedDirectly = process.argv[1]?.endsWith('index.ts') ?? false
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
