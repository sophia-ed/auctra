import { z } from 'zod'

/**
 * Environment configuration (AUCTRA.md Sections 34, 82).
 *
 * The central rule: a missing environment variable must never select mainnet.
 * Mainnet is only reachable when it is both explicitly requested and explicitly
 * enabled; anything ambiguous fails loudly.
 */
export type NetworkMode = 'DEMO' | 'DEVNET' | 'MAINNET'

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

export interface AuctraConfig {
  network: NetworkMode
  enableMainnet: boolean
  demoMode: boolean
  databaseUrl?: string
  solanaRpcUrl?: string
  solanaWsUrl?: string
  prestocksApiUrl: string
  pythHermesUrl: string
  pythApiKey?: string
  meteoraCluster?: string
}

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  SOLANA_RPC_URL: z.string().optional(),
  SOLANA_WS_URL: z.string().optional(),
  NEXT_PUBLIC_SOLANA_NETWORK: z.string().optional(),
  METEORA_CLUSTER: z.string().optional(),
  PRESTOCKS_API_URL: z.string().url().optional(),
  PYTH_HERMES_URL: z.string().url().optional(),
  PYTH_API_KEY: z.string().optional(),
  ENABLE_MAINNET: z.string().optional(),
  DEMO_MODE: z.string().optional(),
})

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  if (value === 'true') return true
  if (value === 'false') return false
  throw new ConfigError(`expected "true" or "false", received "${value}"`)
}

export interface ResolveNetworkInput {
  requested?: string
  enableMainnet: boolean
  demoMode: boolean
}

export function resolveNetwork(input: ResolveNetworkInput): NetworkMode {
  const requested = input.requested?.trim().toUpperCase()

  if (!requested) {
    // Never silently select mainnet.
    return input.demoMode ? 'DEMO' : 'DEVNET'
  }

  if (requested === 'MAINNET') {
    if (!input.enableMainnet) {
      throw new ConfigError(
        'MAINNET was requested but ENABLE_MAINNET is not "true". Auctra will not select mainnet implicitly.',
      )
    }
    return 'MAINNET'
  }

  if (requested === 'DEVNET') return 'DEVNET'
  if (requested === 'DEMO') return 'DEMO'

  throw new ConfigError(`unknown network "${requested}"; expected DEMO, DEVNET or MAINNET`)
}

export function loadConfig(env: Record<string, string | undefined> = {}): AuctraConfig {
  const parsed = envSchema.parse(env)
  const enableMainnet = parseBoolean(parsed.ENABLE_MAINNET, false)
  const demoMode = parseBoolean(parsed.DEMO_MODE, true)

  const network = resolveNetwork({
    requested: parsed.NEXT_PUBLIC_SOLANA_NETWORK ?? parsed.METEORA_CLUSTER,
    enableMainnet,
    demoMode,
  })

  return {
    network,
    enableMainnet,
    demoMode,
    databaseUrl: parsed.DATABASE_URL,
    solanaRpcUrl: parsed.SOLANA_RPC_URL,
    solanaWsUrl: parsed.SOLANA_WS_URL,
    prestocksApiUrl: parsed.PRESTOCKS_API_URL ?? 'https://prestocks.com/api/prestocks',
    // Pyth's current documented Hermes base (post Core upgrade, Aug 26 2026).
    pythHermesUrl: parsed.PYTH_HERMES_URL ?? 'https://pyth.dourolabs.app/hermes',
    pythApiKey: parsed.PYTH_API_KEY,
    meteoraCluster: parsed.METEORA_CLUSTER,
  }
}

export function isMainnet(config: AuctraConfig): boolean {
  return config.network === 'MAINNET'
}

/** Visible badge text required for mainnet UI (Section 34). */
export function networkBadge(config: AuctraConfig): string {
  return config.network === 'MAINNET' ? 'MAINNET · REAL TRANSACTION' : config.network
}
