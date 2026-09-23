'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api, type CompileRequest } from '@/lib/api'
import { formatNumber, shortAddress } from '@/lib/format'
import type { AssetRecord, LifecycleResponse } from '@/lib/types'
import { StatusBadge } from './status-badge'

const MODES = ['REFERENCE_CENTERED', 'TRANSITION_WIDE', 'EVENT_ADAPTIVE'] as const
const DEFAULT_QUOTE_MINT = 'So11111111111111111111111111111111111111112'

const inputClass = 'panel-2 w-full px-3 py-2 text-sm'

/**
 * Transition plan builder (AUCTRA.md Section 44).
 * Select a PreStock -> read its lifecycle -> set the policy inputs -> compile.
 */
export function PlanBuilder() {
  const router = useRouter()
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [symbol, setSymbol] = useState('')
  const [lifecycle, setLifecycle] = useState<LifecycleResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [referencePrice, setReferencePrice] = useState('')
  const [mode, setMode] = useState<(typeof MODES)[number]>('EVENT_ADAPTIVE')
  const [segments, setSegments] = useState('8')
  const [targetLiquidity, setTargetLiquidity] = useState('250000')
  const [migrationQuoteThreshold, setMigrationQuoteThreshold] = useState('100000')
  const [quoteMint, setQuoteMint] = useState(DEFAULT_QUOTE_MINT)
  const [conversionRatio, setConversionRatio] = useState('')
  const [targetAssetMint, setTargetAssetMint] = useState('')
  const [currency, setCurrency] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const response = await api.listAssets()
      if (!active) return
      if (response.ok) {
        setAssets(response.data.assets)
        const first = response.data.assets[0]
        if (first) {
          setSymbol(first.symbol)
          setReferencePrice(first.tokenPrice)
        }
      } else {
        setLoadError(response.message ?? response.error)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!symbol) return
    let active = true
    void (async () => {
      const response = await api.lifecycle(symbol)
      if (!active) return
      setLifecycle(response.ok ? response.data : null)
    })()
    return () => {
      active = false
    }
  }, [symbol])

  function selectSymbol(next: string) {
    setSymbol(next)
    const asset = assets.find((candidate) => candidate.symbol === next)
    if (asset) setReferencePrice(asset.tokenPrice)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const body: CompileRequest = {
      symbol,
      liquidity: {
        mode,
        segments: Number(segments),
        referencePrice,
        targetLiquidity,
        quoteMint,
        migrationQuoteThreshold,
      },
      ...(conversionRatio ? { conversionRatio } : {}),
      ...(targetAssetMint ? { targetAssetMint } : {}),
      ...(currency ? { currency } : {}),
    }
    const response = await api.compile(body)
    if (response.ok) {
      router.push(`/transition/${response.data.plan.id}`)
      return
    }
    setError(response.message ?? response.error)
    setBusy(false)
  }

  const selected = assets.find((candidate) => candidate.symbol === symbol)

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {loadError ? (
        <p className="panel p-4 text-sm" role="alert" style={{ color: 'var(--danger)' }}>
          Could not load PreStocks assets: {loadError}
        </p>
      ) : null}

      <fieldset className="panel flex flex-col gap-4 p-5">
        <legend className="label px-1">1 · Select PreStock</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="asset" className="label">
              Asset
            </label>
            <select
              id="asset"
              value={symbol}
              onChange={(event) => selectSymbol(event.target.value)}
              className={inputClass}
              style={{ color: 'var(--ink)' }}
            >
              {assets.map((asset) => (
                <option key={asset.id} value={asset.symbol}>
                  {asset.symbol} — {asset.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label">Lifecycle state</span>
            <div className="flex items-center gap-2">
              <StatusBadge status={lifecycle?.state ?? 'UNKNOWN'} />
              {lifecycle?.events[0]?.conversionDeadline ? (
                <span className="mono text-xs" style={{ color: 'var(--muted)' }}>
                  deadline {lifecycle.events[0].conversionDeadline.slice(0, 10)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {selected ? (
          <p className="mono text-xs" style={{ color: 'var(--muted)' }}>
            mint {shortAddress(selected.mintAddress, 6)} · mark {formatNumber(selected.markPrice)} · token{' '}
            {formatNumber(selected.tokenPrice)}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="panel flex flex-col gap-4 p-5">
        <legend className="label px-1">2 · Liquidity policy</legend>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="mode" className="label">
              Curve mode
            </label>
            <select
              id="mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as (typeof MODES)[number])}
              className={inputClass}
              style={{ color: 'var(--ink)' }}
            >
              {MODES.map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="segments" className="label">
              Segments (2–16)
            </label>
            <input
              id="segments"
              type="number"
              min={2}
              max={16}
              value={segments}
              onChange={(event) => setSegments(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="referencePrice" className="label">
              Reference price
            </label>
            <input
              id="referencePrice"
              value={referencePrice}
              onChange={(event) => setReferencePrice(event.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="targetLiquidity" className="label">
              Target liquidity
            </label>
            <input
              id="targetLiquidity"
              value={targetLiquidity}
              onChange={(event) => setTargetLiquidity(event.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="migrationQuoteThreshold" className="label">
              Migration quote threshold
            </label>
            <input
              id="migrationQuoteThreshold"
              value={migrationQuoteThreshold}
              onChange={(event) => setMigrationQuoteThreshold(event.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="quoteMint" className="label">
              Quote mint
            </label>
            <input
              id="quoteMint"
              value={quoteMint}
              onChange={(event) => setQuoteMint(event.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="panel flex flex-col gap-4 p-5">
        <legend className="label px-1">3 · Conversion (optional)</legend>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Without a verified ratio and target mint the transition gap stays NOT COMPUTABLE. Auctra will not
          substitute a proxy.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="conversionRatio" className="label">
              Ratio (numerator)
            </label>
            <input
              id="conversionRatio"
              value={conversionRatio}
              onChange={(event) => setConversionRatio(event.target.value)}
              className={inputClass}
              placeholder="e.g. 0.7165"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="targetAssetMint" className="label">
              Target mint
            </label>
            <input
              id="targetAssetMint"
              value={targetAssetMint}
              onChange={(event) => setTargetAssetMint(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="currency" className="label">
              Target symbol
            </label>
            <input
              id="currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className={inputClass}
              placeholder="e.g. SPCXx"
            />
          </div>
        </div>
      </fieldset>

      {error ? (
        <p className="panel p-4 text-sm" role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !symbol}
          className="px-5 py-2 text-sm font-medium"
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--ink)' }}
        >
          {busy ? 'Compiling…' : 'Compile transition plan'}
        </button>
        <span className="text-xs" style={{ color: 'var(--faint)' }}>
          Compiling stores an immutable, hash-addressed plan. It does not deploy anything.
        </span>
      </div>
    </form>
  )
}
