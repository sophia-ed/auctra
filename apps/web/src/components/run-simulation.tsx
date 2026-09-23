'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { formatBps, formatNumber, formatPercent } from '@/lib/format'
import type { ComparisonJson, SimulateResponse } from '@/lib/types'

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

  const comparison: ComparisonJson | undefined = result?.simulation.comparison

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

      {comparison ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {comparison.note}
          </p>
          <div className="overflow-x-auto">
            <table className="mono w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th className="text-left font-normal">metric</th>
                  <th className="text-right font-normal">BASELINE DBC</th>
                  <th className="text-right font-normal">AUCTRA DBC</th>
                  <th className="text-right font-normal">delta</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>avg slippage</td>
                  <td className="text-right">{formatBps(comparison.baseline.averageSlippageBps)}</td>
                  <td className="text-right">{formatBps(comparison.auctra.averageSlippageBps)}</td>
                  <td className="text-right">{formatBps(comparison.deltas.averageSlippageBps)}</td>
                </tr>
                <tr>
                  <td>max slippage</td>
                  <td className="text-right">{formatBps(comparison.baseline.maxSlippageBps)}</td>
                  <td className="text-right">{formatBps(comparison.auctra.maxSlippageBps)}</td>
                  <td className="text-right">{formatBps(comparison.deltas.maxSlippageBps)}</td>
                </tr>
                <tr>
                  <td>fees</td>
                  <td className="text-right">{formatNumber(comparison.baseline.totalFees, 4)}</td>
                  <td className="text-right">{formatNumber(comparison.auctra.totalFees, 4)}</td>
                  <td className="text-right">{formatNumber(comparison.deltas.totalFees, 4)}</td>
                </tr>
                <tr>
                  <td>curve progress</td>
                  <td className="text-right">
                    {formatPercent(comparison.baseline.finalCurveProgress * 100)}
                  </td>
                  <td className="text-right">
                    {formatPercent(comparison.auctra.finalCurveProgress * 100)}
                  </td>
                  <td className="text-right">
                    {formatPercent(comparison.deltas.finalCurveProgress * 100)}
                  </td>
                </tr>
                <tr>
                  <td>reference deviation</td>
                  <td className="text-right">
                    {formatBps(comparison.baseline.finalReferenceDeviationBps)}
                  </td>
                  <td className="text-right">
                    {formatBps(comparison.auctra.finalReferenceDeviationBps)}
                  </td>
                  <td className="text-right">
                    {formatBps(comparison.deltas.finalReferenceDeviationBps)}
                  </td>
                </tr>
                <tr>
                  <td>migration ready</td>
                  <td className="text-right">{String(comparison.baseline.migrationReady)}</td>
                  <td className="text-right">{String(comparison.auctra.migrationReady)}</td>
                  <td className="text-right">—</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs" style={{ color: 'var(--faint)' }}>
            {comparison.auctra.assumptions[0]}
          </p>
        </div>
      ) : null}
    </div>
  )
}
