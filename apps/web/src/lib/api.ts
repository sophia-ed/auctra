import type {
  AssetRecord,
  AuditResponse,
  ClockModelJson,
  CompileResponse,
  DbcPrepareRequest,
  DbcPrepareResponse,
  HealthResponse,
  LabRequest,
  LabResponse,
  LifecycleResponse,
  MonitorResponse,
  NetworkConfigResponse,
  PoolJson,
  PoolResponse,
  ReferenceResponse,
  SimulateResponse,
  StatusResponse,
  TransitionResponse,
} from './types'

const PUBLIC_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
/**
 * Server-side rendering runs inside the web container, where `localhost` is not
 * the API. `API_INTERNAL_URL` lets compose point SSR at the api service while the
 * browser keeps using the public URL.
 */
const INTERNAL_BASE = process.env.API_INTERNAL_URL ?? PUBLIC_BASE

function baseUrl(): string {
  return typeof window === 'undefined' ? INTERNAL_BASE : PUBLIC_BASE
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; message?: string }

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const headers: Record<string, string> = { accept: 'application/json' }
    if (init?.body) headers['content-type'] = 'application/json'
    const response = await fetch(`${baseUrl()}${path}`, {
      ...init,
      cache: 'no-store',
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    })
    const text = await response.text()
    const body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: typeof body.error === 'string' ? body.error : 'request_failed',
        message: typeof body.message === 'string' ? body.message : undefined,
      }
    }
    return { ok: true, data: body as T }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: 'network_error',
      message: error instanceof Error ? error.message : 'unknown error',
    }
  }
}

export interface CompileRequest {
  symbol: string
  eventId?: string
  conversionRatio?: string
  targetAssetMint?: string
  currency?: string
  liquidity: {
    mode: 'REFERENCE_CENTERED' | 'TRANSITION_WIDE' | 'EVENT_ADAPTIVE'
    segments: number
    referencePrice: string
    targetLiquidity: string
    quoteMint: string
    migrationQuoteThreshold: string
    currentObservedLiquidity?: string
  }
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),
  config: () => request<NetworkConfigResponse>('/api/config'),
  status: () => request<StatusResponse>('/api/status'),
  listAssets: () => request<{ assets: AssetRecord[] }>('/api/assets'),
  getAsset: (symbol: string) =>
    request<{ asset: AssetRecord }>(`/api/assets/${encodeURIComponent(symbol)}`),
  lifecycle: (symbol: string) =>
    request<LifecycleResponse>(`/api/lifecycle/${encodeURIComponent(symbol)}`),
  clocks: (symbol: string) =>
    request<ClockModelJson>(`/api/clocks/${encodeURIComponent(symbol)}`),
  reference: (symbol: string) =>
    request<ReferenceResponse>(`/api/reference/${encodeURIComponent(symbol)}`),
  compile: (body: CompileRequest) =>
    request<CompileResponse>('/api/transition/compile', { method: 'POST', body: JSON.stringify(body) }),
  transition: (id: string) =>
    request<TransitionResponse>(`/api/transition/${encodeURIComponent(id)}`),
  simulate: (body: { planId: string; scenario: string }) =>
    request<SimulateResponse>('/api/simulations', { method: 'POST', body: JSON.stringify(body) }),
  simulation: (id: string) =>
    request<SimulateResponse>(`/api/simulations/${encodeURIComponent(id)}`),
  validateDbc: (planId: string) =>
    request<{ valid: boolean; issues: { code: string; message: string }[] }>('/api/dbc/validate', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),
  getPool: (address: string) =>
    request<PoolResponse>(`/api/pools/${encodeURIComponent(address)}`),
  listPools: () => request<{ pools: PoolJson[] }>('/api/pools'),
  audit: () => request<AuditResponse>('/api/audit'),
  monitor: () => request<MonitorResponse>('/api/monitor'),
  dbcLab: (body: LabRequest) =>
    request<LabResponse>('/api/dbc/lab', { method: 'POST', body: JSON.stringify(body) }),
  dbcPrepare: (body: DbcPrepareRequest) =>
    request<DbcPrepareResponse>('/api/dbc/prepare', { method: 'POST', body: JSON.stringify(body) }),
}
