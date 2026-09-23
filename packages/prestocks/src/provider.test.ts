import { describe, expect, it } from 'vitest'
import { computePremium } from '@auctra/domain'
import {
  HttpPreStocksProvider,
  PreStocksDataQualityError,
  type PreStocksProvider,
} from './index'

/** Recorded from https://prestocks.com/api/prestocks on 2026-09-23. */
const FIXTURE = JSON.stringify([
  {
    name: 'SpaceX PreStocks',
    symbol: 'SPACEX',
    description: 'SpaceX engineers reusable launch vehicles and the Starlink satellite constellation.',
    image: 'https://www.prestocks.com/logos/spacex.png',
    external_url: 'https://www.prestocks.com/spacex',
    contract_address: 'PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh',
    markPrice: 153.46590420780728,
    markValuation: 2012108521836,
    tokenPrice: 112.496991575484,
    impliedValuation: 1474960556212,
    supply: 43712.532115040005,
  },
  {
    name: 'OpenAI PreStocks',
    symbol: 'OPENAI',
    description: 'OpenAI pioneers large-language models.',
    image: 'https://www.prestocks.com/logos/openai.png',
    external_url: 'https://www.prestocks.com/openai',
    contract_address: 'PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF',
    markPrice: 1021.7813107654374,
    markValuation: 1265915823681,
    tokenPrice: 1305.8950165148256,
    impliedValuation: 1617912901768,
    supply: 2826.3865844512234,
  },
])

const FIXED_NOW = '2026-09-23T12:59:10.000Z'

function providerReturning(body: string): PreStocksProvider {
  const fetchImpl = (async () =>
    new Response(body, { status: 200, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch
  return new HttpPreStocksProvider({ fetchImpl, now: () => FIXED_NOW })
}

describe('PreStocks provider (Section 5/6)', () => {
  it('normalizes the recorded API payload', async () => {
    const provider = providerReturning(FIXTURE)
    const { assets, issues, source } = await provider.listAssetsDetailed()

    expect(issues).toHaveLength(0)
    expect(assets.map((asset) => asset.symbol)).toEqual(['SPACEX', 'OPENAI'])
    expect(source.sourceType).toBe('prestocks_api')
    expect(source.retrievedAt).toBe(FIXED_NOW)
    expect(source.contentHash).toMatch(/^[0-9a-f]{64}$/)

    const spacex = assets[0]
    expect(spacex.mintAddress).toBe('PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh')
    expect(spacex.source).toBe('prestocks')
    expect(spacex.markPrice.toFixed(0)).toBe('153')
  })

  it('feeds the premium engine with the real SpaceX discount', async () => {
    const [spacex] = await providerReturning(FIXTURE).listAssets()
    const premium = computePremium({
      tokenPrice: spacex.tokenPrice,
      markPrice: spacex.markPrice,
    })
    expect(premium.tokenLabel).toBe('MARK_DISCOUNT')
    expect(premium.tokenPremiumBps.isNegative()).toBe(true)
  })

  it('returns null for an unknown symbol and a match for a known one', async () => {
    const provider = providerReturning(FIXTURE)
    expect((await provider.getAsset('spacex'))?.symbol).toBe('SPACEX')
    expect(await provider.getAsset('DOESNOTEXIST')).toBeNull()
  })

  it('surfaces a data-quality error when a required field disappears', async () => {
    const broken = JSON.stringify([{ ...JSON.parse(FIXTURE)[0], markPrice: undefined }])
    const provider = providerReturning(broken)
    const { issues } = await provider.listAssetsDetailed()
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0].field).toContain('markPrice')
    await expect(provider.listAssets()).rejects.toBeInstanceOf(PreStocksDataQualityError)
  })

  it('does not break when the API adds new fields', async () => {
    const withExtra = JSON.stringify([{ ...JSON.parse(FIXTURE)[0], brandNewField: 'ignored' }])
    const { assets, issues } = await providerReturning(withExtra).listAssetsDetailed()
    expect(issues).toHaveLength(0)
    expect(assets).toHaveLength(1)
  })
})
