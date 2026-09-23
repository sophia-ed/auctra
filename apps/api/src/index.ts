import { loadConfig } from '@auctra/config'
import { createInMemoryRepositories } from '@auctra/database'
import { DemoLifecycleProvider, HttpPreStocksProvider, PreStocksLifecycleProvider } from '@auctra/prestocks'
import { HttpPythProvider } from '@auctra/pyth'
import { createApiServer } from './server'

export async function main(): Promise<void> {
  const config = loadConfig(process.env)
  const repos = createInMemoryRepositories()

  const prestocks = new HttpPreStocksProvider({ baseUrl: config.prestocksApiUrl })
  const pyth = new HttpPythProvider({ baseUrl: config.pythHermesUrl })
  const lifecycle = config.demoMode
    ? new DemoLifecycleProvider()
    : new PreStocksLifecycleProvider({ baseUrl: 'https://www.prestocks.com' })

  const app = await createApiServer({ config, repos, prestocks, pyth, lifecycle, logger: true })
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
