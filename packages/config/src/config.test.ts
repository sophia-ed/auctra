import { describe, expect, it } from 'vitest'
import { ConfigError, isMainnet, loadConfig, networkBadge, resolveNetwork } from './index'

describe('network selection (Section 34)', () => {
  it('defaults to DEMO and never selects mainnet implicitly', () => {
    const config = loadConfig({})
    expect(config.network).toBe('DEMO')
    expect(isMainnet(config)).toBe(false)
  })

  it('defaults to DEVNET when demo mode is off', () => {
    expect(loadConfig({ DEMO_MODE: 'false' }).network).toBe('DEVNET')
  })

  it('requires ENABLE_MAINNET even when mainnet is requested', () => {
    expect(() => loadConfig({ NEXT_PUBLIC_SOLANA_NETWORK: 'mainnet' })).toThrowError(ConfigError)
    expect(() =>
      loadConfig({ NEXT_PUBLIC_SOLANA_NETWORK: 'mainnet', ENABLE_MAINNET: 'false' }),
    ).toThrowError(/will not select mainnet implicitly/)
  })

  it('selects mainnet only when requested and enabled', () => {
    const config = loadConfig({
      NEXT_PUBLIC_SOLANA_NETWORK: 'MAINNET',
      ENABLE_MAINNET: 'true',
    })
    expect(config.network).toBe('MAINNET')
    expect(networkBadge(config)).toBe('MAINNET · REAL TRANSACTION')
  })

  it('rejects an unknown network instead of guessing', () => {
    expect(() => resolveNetwork({ requested: 'testnet', enableMainnet: false, demoMode: false })).toThrowError(
      /unknown network/,
    )
  })

  it('rejects a non-boolean flag', () => {
    expect(() => loadConfig({ ENABLE_MAINNET: 'yes' })).toThrowError(ConfigError)
  })

  it('applies documented endpoint defaults', () => {
    const config = loadConfig({})
    expect(config.prestocksApiUrl).toBe('https://prestocks.com/api/prestocks')
    expect(config.pythHermesUrl).toBe('https://pyth.dourolabs.app/hermes')
    expect(config.pythApiKey).toBeUndefined()
  })
})
