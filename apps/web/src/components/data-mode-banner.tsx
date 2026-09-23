'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { StatusResponse } from '@/lib/types'
import { StatusBadge } from './status-badge'

/**
 * Data-mode and provider indicator (AUCTRA.md Sections 72-73).
 *
 * DEMO mode is stated explicitly, and a provider that is failing reads STALE
 * rather than LIVE. Returns nothing until the API answers, so it never blocks
 * rendering and never guesses.
 */
export function DataModeBanner() {
  const [status, setStatus] = useState<StatusResponse | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const response = await api.status()
      if (active && response.ok) setStatus(response.data)
    })()
    return () => {
      active = false
    }
  }, [])

  if (!status) return null

  return (
    <div
      className="border-b text-xs"
      style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
    >
      <div
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2"
        style={{ color: 'var(--muted)' }}
      >
        <span className="flex items-center gap-2">
          <span className="label">Mode</span>
          <StatusBadge status={status.mode} />
        </span>
        {(['prestocks', 'pyth', 'solana', 'meteora'] as const).map((provider) => (
          <span key={provider} className="flex items-center gap-2">
            <span className="label">{provider}</span>
            <StatusBadge status={status.providers[provider].status} />
          </span>
        ))}
        {status.enableMainnet ? (
          <span className="mono" style={{ color: 'var(--danger)' }}>
            MAINNET ENABLED
          </span>
        ) : null}
        <span className="mono" style={{ color: 'var(--faint)' }}>
          {status.assets} assets · {status.pools} pools
        </span>
      </div>
    </div>
  )
}
