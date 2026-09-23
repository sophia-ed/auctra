'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import type { SimulateResponse } from '@/lib/types'
import { ComparisonTable } from './comparison-table'

const SCENARIOS = [
  'NORMAL',
  'IPO_ANNOUNCED',
  'IPO_IMMINENT',
  'PUBLIC_MARKET_OPENS',
  'PUBLIC_MARKET_PRICE_GAP',
  'HIGH_REFERENCE_UNCERTAINTY',
  'CONVERSION_DEADLINE_APPROACHING',
  'ACQUISITION_EVENT',
  'NO_TARGET_ASSET',
]

/**
 * Baseline vs Auctra simulation (AUCTRA.md Section 38).
 * Runs on demand against the API; measurements only, no winner declared.
 */
export function RunSimulation({ planId }: { planId: string }) {
  const [scenario, setScenario] = useState('NORMAL')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SimulateResponse | null>(null)

  async function run() {
    setBusy(true)
    setError(null)
    const response = await api.simulate({ planId, scenario })
    if (response.ok) setResult(response.data)
    else setError(response.message ?? response.error)
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="simulation-scenario" className="label">
            Scenario
          </label>
          <select
            id="simulation-scenario"
            value={scenario}
            onChange={(event) => setScenario(event.target.value)}
            className="panel-2 px-3 py-2 text-sm"
            style={{ color: 'var(--ink)' }}
          >
            {SCENARIOS.map((id) => (
              <option key={id} value={id}>
                {id.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="panel-2 px-4 py-2 text-sm"
          style={{ color: 'var(--ink)' }}
        >
          {busy ? 'Running…' : 'Run baseline vs Auctra'}
        </button>
      </div>

      {error ? (
        <p className="text-sm tone-danger" role="alert">
          {error}
        </p>
      ) : null}

      {result ? <ComparisonTable comparison={result.simulation.comparison} /> : null}
    </div>
  )
}
