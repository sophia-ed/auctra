import { Decimal } from '@auctra/domain'
import type { RawPreStockAsset } from './schema'

/**
 * Normalized PreStocks asset (AUCTRA.md Section 6).
 * Monetary values are Decimal, never JavaScript floats.
 */
export interface PreStockAsset {
  id: string
  name: string
  symbol: string
  description?: string

  mintAddress: string

  markPrice: Decimal
  markValuation: Decimal

  tokenPrice: Decimal
  impliedValuation: Decimal

  supply: Decimal

  imageUrl?: string
  externalUrl?: string

  source: 'prestocks'
  retrievedAt: string
}

export function normalizePreStockAsset(raw: RawPreStockAsset, retrievedAt: string): PreStockAsset {
  return {
    id: raw.symbol.toLowerCase(),
    name: raw.name,
    symbol: raw.symbol,
    description: raw.description,
    mintAddress: raw.contract_address,
    markPrice: new Decimal(raw.markPrice),
    markValuation: new Decimal(raw.markValuation),
    tokenPrice: new Decimal(raw.tokenPrice),
    impliedValuation: new Decimal(raw.impliedValuation),
    supply: new Decimal(raw.supply),
    imageUrl: raw.image,
    externalUrl: raw.external_url,
    source: 'prestocks',
    retrievedAt,
  }
}
