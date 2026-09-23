'use client'

import { useCallback, useEffect, useState } from 'react'
import { StatusBadge } from '@/components/status-badge'
import { api } from '@/lib/api'
import { displayPremiumBps, formatBps, formatNumber, shortAddress } from '@/lib/format'
import type { MonitorResponse } from '@/lib/types'

const REFRESH_MS = 15000

/**
 * Live monitor (AUCTRA.md Section 51).
 * Refreshed by the browser every 15s. Server-side worker refresh arrives in the
 * worker bit; this page makes no claim to be a push feed.
 */
export default function MonitorPage() {
  const [data, setData] = useState<MonitorResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    const response = await api.monitor()
    if (response.ok) {
      setData(response.data)
      setError(null)
    } else {
      setError(response.message ?? response.error)
    }
    setRefreshedAt(new Date().toISOString())
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => {
      void load()
    }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Live monitor</p>
          <h1 className="mt-1 text-2xl font-semibold">Market and transition state</h1>
        </div>
        <span className="mono text-xs" style={{ color: 'var(--muted)' }}>
          {refreshedAt ? `refreshed ${refreshedAt}` : 'loading…'}
        </span>
      </div>

      {error ? (
        <p className="panel p-4 text-sm" role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.assets.map((row) => {
              const deviation = displayPremiumBps(row.asset.tokenPrice, row.asset.markPrice)
              return (
                <article key={row.asset.id} className="panel flex flex-col gap-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold tracking-wide">{row.asset.symbol}</span>
                    <StatusBadge status={row.state} />
                  </div>
                  <div className="mono grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span style={{ color: 'var(--muted)' }}>mark</span>
                    <span className="text-right">{formatNumber(row.asset.markPrice, 2)}</span>
                    <span style={{ color: 'var(--muted)' }}>token</span>
                    <span className="text-right">{formatNumber(row.asset.tokenPrice, 2)}</span>
                    <span style={{ color: 'var(--muted)' }}>mark deviation</span>
                    <span className="text-right">{deviation === null ? '—' : formatBps(deviation)}</span>
                    <span style={{ color: 'var(--muted)' }}>reference</span>
                    <span className="text-right">
                      {row.reference ? formatNumber(row.reference.price, 2) : 'unavailable'}
                    </span>
                    <span style={{ color: 'var(--muted)' }}>market session</span>
                    <span className="text-right">{row.reference?.marketSession ?? 'UNKNOWN'}</span>
                    <span style={{ color: 'var(--muted)' }}>clocks</span>
                    <span className="text-right">
                      {row.clocks.private.status}/{row.clocks.public.status}/{row.clocks.onchain.status}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>

          <section aria-labelledby="pools-heading" className="panel p-5">
            <h2 id="pools-heading" className="label">
              DBC pools
            </h2>
            {data.pools.length === 0 ? (
              <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>
                No pools recorded. A pool appears here after a wallet-signed deployment; Auctra never creates
                one on its own.
              </p>
            ) : (
              <table className="mono mt-3 w-full text-xs">
                <thead>
                  <tr style={{ color: 'var(--muted)' }}>
                    <th className="text-left font-normal">address</th>
                    <th className="text-left font-normal">config</th>
                    <th className="text-left font-normal">quote</th>
                    <th className="text-right font-normal">progress</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pools.map((pool) => {
                    const last = pool.snapshots?.[pool.snapshots.length - 1]
                    return (
                      <tr key={pool.address}>
                        <td>{shortAddress(pool.address, 8)}</td>
                        <td>{shortAddress(pool.config, 6)}</td>
                        <td>{shortAddress(pool.quoteMint, 6)}</td>
                        <td className="text-right">{last ? `${last.progress}` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </section>

          <p className="text-xs" style={{ color: 'var(--faint)' }}>
            Auctra displays observed values and labels everything modelled. It does not present simulated
            values as live.
          </p>
        </>
      ) : null}
    </div>
  )
}
