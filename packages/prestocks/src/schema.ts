import { z } from 'zod'

/**
 * PreStocks API schema (AUCTRA.md Section 5).
 *
 * The API is externally controlled. We validate the fields we depend on and
 * ignore unknown additions (zod strips unknown keys by default), so new fields
 * never break ingestion. A missing required field is surfaced as an explicit
 * data-quality issue rather than silently defaulted.
 */
export const rawPreStockAssetSchema = z.object({
  name: z.string().min(1),
  symbol: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  external_url: z.string().optional(),
  contract_address: z.string().min(1),
  markPrice: z.number().finite(),
  markValuation: z.number().finite(),
  tokenPrice: z.number().finite(),
  impliedValuation: z.number().finite(),
  supply: z.number().finite(),
})

export const rawPreStockAssetsSchema = z.array(rawPreStockAssetSchema)

export type RawPreStockAsset = z.infer<typeof rawPreStockAssetSchema>
