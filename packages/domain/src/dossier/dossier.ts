import type { Decimal } from '../math/decimal'
import type { TransitionPlan } from '../plan/types'
import type { SourceRecord } from '../provenance/source'
import { describeConversion, isConversionVerified } from '../transition/conversion'
import { computeClockModel, type ClockModel } from '../clocks/clocks'

/**
 * Transition dossier (AUCTRA.md Section 12).
 *
 * The central read model for a lifecycle asset: what state it is in, what event
 * drives the transition, what the target and conversion look like, what the
 * external reference says, where the transition gap stands, and what the
 * liquidity plan proposes. Every externally sourced claim stays traceable to a
 * SourceRecord.
 */
export interface DossierAsset {
  id: string
  symbol: string
  name: string
  mintAddress: string
  markPrice: Decimal
  tokenPrice: Decimal
  premiumBps?: Decimal
}

export interface DossierEventSummary {
  id: string
  type: string
  title: string
  observedAt?: string
  announcedAt?: string
  effectiveAt?: string
  conversionDeadline?: string
  sourceType: string
  sourceUrl?: string
}

export interface TargetAssetStatus {
  status: 'VERIFIED' | 'UNKNOWN'
  symbol?: string
  mintAddress?: string
  note: string
}

export interface ConversionStatus {
  status: 'VERIFIED' | 'UNKNOWN'
  description: string
}

export interface DossierMarketReference {
  feedId: string
  symbol: string
  price: Decimal
  confidenceBps: Decimal
  marketSession?: string
  freshness: string
}

export interface DossierLiquidityState {
  concentration: number
  targetLiquidity: Decimal
  migrationThreshold: Decimal
  provenance: string
}

export interface DossierGapSummary {
  status: string
  missingInputs: string[]
  gapBps?: number
  absoluteGap?: Decimal
}

export interface TransitionDossier {
  asset: DossierAsset
  currentState: string
  sourceToken: string
  event: DossierEventSummary
  transitionDeadline?: string
  targetAsset: TargetAssetStatus
  conversionStatus: ConversionStatus
  marketReference?: DossierMarketReference
  clocks: ClockModel
  transitionGap: DossierGapSummary
  liquidityState: DossierLiquidityState
  sources: SourceRecord[]
  generatedAt: string
  algorithmVersion: string
}

export interface DossierInput {
  plan: TransitionPlan
  asset: DossierAsset
  targetAsset?: { symbol: string; mintAddress: string }
  sources?: SourceRecord[]
  mainnetEnabled?: boolean
}

export function buildTransitionDossier(input: DossierInput): TransitionDossier {
  const { plan, asset } = input

  const marketReference: DossierMarketReference | undefined = plan.referenceState
    ? {
        feedId: plan.referenceState.feedId,
        symbol: plan.referenceState.symbol,
        price: plan.referenceState.price,
        confidenceBps: plan.referenceState.confidenceBps,
        marketSession: plan.referenceState.marketSession,
        freshness: plan.referenceState.freshness,
      }
    : undefined

  const conversionVerified = isConversionVerified(plan.conversionSpec)
  const conversionStatus: ConversionStatus = {
    status: conversionVerified ? 'VERIFIED' : 'UNKNOWN',
    description: conversionVerified
      ? describeConversion(plan.conversionSpec!, asset.symbol, input.targetAsset?.symbol ?? 'TARGET')
      : 'Conversion ratio UNKNOWN — provide a verified source',
  }

  const targetAsset: TargetAssetStatus = input.targetAsset
    ? {
        status: 'VERIFIED',
        symbol: input.targetAsset.symbol,
        mintAddress: input.targetAsset.mintAddress,
        note: 'target resolved from the issuer disclosure or the PreStocks registry',
      }
    : {
        status: 'UNKNOWN',
        note: 'no verified target asset; the transition gap stays NOT COMPUTABLE',
      }

  return {
    asset,
    currentState: plan.currentState,
    sourceToken: asset.symbol,
    event: {
      id: plan.lifecycleEvent.id,
      type: plan.lifecycleEvent.type,
      title: plan.lifecycleEvent.title,
      observedAt: plan.lifecycleEvent.observedAt,
      announcedAt: plan.lifecycleEvent.announcedAt,
      effectiveAt: plan.lifecycleEvent.effectiveAt,
      conversionDeadline: plan.lifecycleEvent.conversionDeadline,
      sourceType: plan.lifecycleEvent.sourceType,
      sourceUrl: plan.lifecycleEvent.sourceUrl,
    },
    transitionDeadline: plan.lifecycleEvent.conversionDeadline,
    targetAsset,
    conversionStatus,
    marketReference,
    clocks: computeClockModel({
      asOf: plan.generatedAt,
      lifecycleState: plan.currentState,
      marketSession: plan.referenceState?.marketSession,
      referenceFreshness: plan.referenceState?.freshness,
      mainnetEnabled: input.mainnetEnabled,
    }),
    transitionGap: {
      status: plan.transitionGap?.status ?? 'NOT_COMPUTABLE',
      missingInputs: plan.transitionGap?.missingInputs ?? ['transitionGap not computed'],
      gapBps: plan.transitionGap?.gapBps,
      absoluteGap: plan.transitionGap?.absoluteGap,
    },
    liquidityState: {
      concentration: plan.liquidityPlan.concentration.value,
      targetLiquidity: plan.liquidityPlan.targetLiquidity.value,
      migrationThreshold: plan.liquidityPlan.migrationThreshold.value,
      provenance: plan.liquidityPlan.targetLiquidity.provenance,
    },
    sources: input.sources ?? [],
    generatedAt: plan.generatedAt,
    algorithmVersion: plan.algorithmVersion,
  }
}
