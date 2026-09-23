import type { DataQualityIssue, LifecycleEvent, SourceRecord } from '@auctra/domain'
import type { PreStockAsset } from '../normalize'

/**
 * A conversion notice parsed from an issuer disclosure. Mints are optional
 * because an issuer rarely publishes them; a fully verified `ConversionSpec`
 * (Section 19) is only constructed when both mints are known.
 */
export interface ConversionNotice {
  sourceSymbol: string
  targetSymbol?: string
  ratioNumerator?: string
  ratioDenominator?: string
  deadline?: string
  sourceUrl: string
  retrievedAt: string
}

export interface LifecycleProviderResult {
  events: LifecycleEvent[]
  sources: SourceRecord[]
  issues: DataQualityIssue[]
  conversion?: ConversionNotice
}

/**
 * Corporate-action source (AUCTRA.md Section 9).
 */
export interface LifecycleProvider {
  getEvents(asset: PreStockAsset): Promise<LifecycleEvent[]>
}

/** A provider that also surfaces provenance and data-quality issues. */
export interface DetailedLifecycleProvider extends LifecycleProvider {
  getEventsDetailed(asset: PreStockAsset): Promise<LifecycleProviderResult>
}
