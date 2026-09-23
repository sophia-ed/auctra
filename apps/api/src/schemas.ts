import { z } from 'zod'

/** Request validation for every API input (AUCTRA.md Sections 58, 65). */

const decimalInput = z.union([z.number(), z.string().min(1)])

export const lifecycleEventTypeSchema = z.enum([
  'IPO',
  'ACQUISITION',
  'MERGER',
  'CONVERSION',
  'EXPIRATION',
  'CORPORATE_ACTION',
  'CUSTOM',
])

export const sourceTypeSchema = z.enum([
  'PRESTOCKS_API',
  'PRESTOCKS_PAGE',
  'PYTH',
  'SOLANA',
  'METEORA',
  'MANUAL',
  'SIMULATION',
])

export const eventRequestSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  type: lifecycleEventTypeSchema,
  title: z.string().min(1),
  announcedAt: z.string().datetime().optional(),
  effectiveAt: z.string().datetime().optional(),
  conversionDeadline: z.string().datetime().optional(),
  observedAt: z.string().datetime().optional(),
  sourceType: sourceTypeSchema,
  sourceUrl: z.string().url().optional(),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
})

export const compileRequestSchema = z.object({
  symbol: z.string().min(1),
  eventId: z.string().min(1).optional(),
  targetAssetMint: z.string().min(1).optional(),
  conversionRatio: decimalInput.optional(),
  currency: z.string().min(1).optional(),
  liquidity: z.object({
    mode: z.enum(['REFERENCE_CENTERED', 'TRANSITION_WIDE', 'EVENT_ADAPTIVE']),
    segments: z.number().int().min(2).max(16),
    referencePrice: decimalInput,
    targetLiquidity: decimalInput,
    quoteMint: z.string().min(1),
    migrationQuoteThreshold: decimalInput,
    currentObservedLiquidity: decimalInput.optional(),
  }),
})

export const simulationRequestSchema = z.object({
  planId: z.string().min(1),
  scenario: z.enum([
    'NORMAL',
    'IPO_ANNOUNCED',
    'IPO_IMMINENT',
    'PUBLIC_MARKET_OPENS',
    'PUBLIC_MARKET_PRICE_GAP',
    'HIGH_REFERENCE_UNCERTAINTY',
    'CONVERSION_DEADLINE_APPROACHING',
    'ACQUISITION_EVENT',
    'NO_TARGET_ASSET',
  ]),
})

export const dbcValidateRequestSchema = z.object({ planId: z.string().min(1) })

export const dbcPrepareRequestSchema = z.object({
  planId: z.string().min(1),
  payer: z.string().min(1),
  config: z.string().min(1),
  feeClaimer: z.string().min(1),
  leftoverReceiver: z.string().min(1),
  tokenDecimal: z.number().int().min(6).max(9),
  initialMarketCap: decimalInput,
  migrationMarketCap: decimalInput,
  /** Total base-token supply; the SDK curve builder needs it. */
  totalTokenSupply: z.number().positive().optional(),
  /** Tokens held back from the curve; the SDK requires headroom. */
  leftover: z.number().nonnegative().optional(),
})

export const dbcLabRequestSchema = z.object({
  curveMode: z.enum(['REFERENCE_CENTERED', 'TRANSITION_WIDE', 'EVENT_ADAPTIVE']),
  segments: z.number().int().min(2).max(16),
  referencePrice: decimalInput,
  referenceConfidenceBps: decimalInput.optional(),
  currentPremiumBps: decimalInput.optional(),
  eventIntensity: decimalInput,
  targetLiquidity: decimalInput,
  migrationQuoteThreshold: decimalInput,
  quoteMint: z.string().min(1),
  scenario: z
    .enum([
      'NORMAL',
      'IPO_ANNOUNCED',
      'IPO_IMMINENT',
      'PUBLIC_MARKET_OPENS',
      'PUBLIC_MARKET_PRICE_GAP',
      'HIGH_REFERENCE_UNCERTAINTY',
      'CONVERSION_DEADLINE_APPROACHING',
      'ACQUISITION_EVENT',
      'NO_TARGET_ASSET',
    ])
    .optional(),
})

export const replayRequestSchema = z.object({
  planId: z.string().min(1),
  scenario: z
    .enum([
      'NORMAL',
      'IPO_ANNOUNCED',
      'IPO_IMMINENT',
      'PUBLIC_MARKET_OPENS',
      'PUBLIC_MARKET_PRICE_GAP',
      'HIGH_REFERENCE_UNCERTAINTY',
      'CONVERSION_DEADLINE_APPROACHING',
      'ACQUISITION_EVENT',
      'NO_TARGET_ASSET',
    ])
    .optional(),
})

export type EventRequest = z.infer<typeof eventRequestSchema>
export type CompileRequest = z.infer<typeof compileRequestSchema>
export type SimulationRequest = z.infer<typeof simulationRequestSchema>
export type DbcPrepareRequest = z.infer<typeof dbcPrepareRequestSchema>
export type DbcLabRequest = z.infer<typeof dbcLabRequestSchema>
export type ReplayRequest = z.infer<typeof replayRequestSchema>
