import { hashValue, makeSourceRecord, type DataQualityIssue, type SourceRecord } from '@auctra/domain'
import { rawPreStockAssetSchema, type RawPreStockAsset } from './schema'
import { normalizePreStockAsset, type PreStockAsset } from './normalize'

export const DEFAULT_PRESTOCKS_API_URL = 'https://prestocks.com/api/prestocks'

export class PreStocksDataQualityError extends Error {
  readonly issues: DataQualityIssue[]
  constructor(issues: DataQualityIssue[]) {
    super(`PreStocks data-quality error: ${issues.map((issue) => issue.message).join('; ')}`)
    this.name = 'PreStocksDataQualityError'
    this.issues = issues
  }
}

export class PreStocksUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PreStocksUnavailableError'
  }
}

export interface ListAssetsResult {
  assets: PreStockAsset[]
  issues: DataQualityIssue[]
  source: SourceRecord
}

export interface PreStocksProvider {
  listAssets(): Promise<PreStockAsset[]>
  getAsset(symbol: string): Promise<PreStockAsset | null>
  listAssetsDetailed(): Promise<ListAssetsResult>
}

export interface HttpPreStocksProviderOptions {
  baseUrl?: string
  fetchImpl?: typeof fetch
  /** Injectable clock so tests are deterministic. */
  now?: () => string
}

function issuesFor(raw: unknown, index: number): DataQualityIssue[] {
  const parsed = rawPreStockAssetSchema.safeParse(raw)
  if (parsed.success) return []
  const label =
    raw && typeof raw === 'object' && 'symbol' in raw && typeof (raw as { symbol: unknown }).symbol === 'string'
      ? (raw as { symbol: string }).symbol
      : `index ${index}`
  return parsed.error.issues.map((issue) => ({
    code: 'PRESTOCKS_SCHEMA_MISMATCH',
    message: `${label}: ${issue.path.join('.') || '(root)'} ${issue.message}`,
    field: issue.path.join('.'),
  }))
}

export class HttpPreStocksProvider implements PreStocksProvider {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly now: () => string

  constructor(options: HttpPreStocksProviderOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_PRESTOCKS_API_URL
    this.fetchImpl = options.fetchImpl ?? fetch
    this.now = options.now ?? (() => new Date().toISOString())
  }

  async listAssetsDetailed(): Promise<ListAssetsResult> {
    const retrievedAt = this.now()

    let response: Response
    try {
      response = await this.fetchImpl(this.baseUrl, {
        headers: { accept: 'application/json' },
      })
    } catch (error) {
      throw new PreStocksUnavailableError(
        `PreStocks API request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    if (!response.ok) {
      throw new PreStocksUnavailableError(`PreStocks API returned HTTP ${response.status}`)
    }

    const text = await response.text()
    const contentHash = hashValue(text)

    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      throw new PreStocksDataQualityError([
        { code: 'PRESTOCKS_INVALID_JSON', message: 'PreStocks API did not return valid JSON' },
      ])
    }

    if (!Array.isArray(json)) {
      throw new PreStocksDataQualityError([
        { code: 'PRESTOCKS_NOT_AN_ARRAY', message: 'PreStocks API response was not a JSON array' },
      ])
    }

    const issues: DataQualityIssue[] = []
    const assets: PreStockAsset[] = []
    json.forEach((raw, index) => {
      const itemIssues = issuesFor(raw, index)
      if (itemIssues.length > 0) {
        issues.push(...itemIssues)
        return
      }
      assets.push(normalizePreStockAsset(raw as RawPreStockAsset, retrievedAt))
    })

    const source = makeSourceRecord({
      id: `prestocks:api:${retrievedAt}`,
      sourceType: 'prestocks_api',
      url: this.baseUrl,
      retrievedAt,
      contentHash,
      description: `PreStocks API: ${assets.length}/${json.length} assets normalized`,
    })

    return { assets, issues, source }
  }

  async listAssets(): Promise<PreStockAsset[]> {
    const { assets, issues } = await this.listAssetsDetailed()
    if (issues.length > 0) {
      throw new PreStocksDataQualityError(issues)
    }
    return assets
  }

  async getAsset(symbol: string): Promise<PreStockAsset | null> {
    const assets = await this.listAssetsDetailed()
    const wanted = symbol.toLowerCase()
    return assets.assets.find((asset) => asset.symbol.toLowerCase() === wanted) ?? null
  }
}
