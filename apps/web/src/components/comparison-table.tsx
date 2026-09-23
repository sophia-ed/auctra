import { formatBps, formatNumber, formatPercent } from '@/lib/format'
import type { ComparisonJson } from '@/lib/types'

/**
 * Baseline vs Auctra measurements (AUCTRA.md Section 38).
 * Shows numbers side by side; it never declares a winner.
 */
export function ComparisonTable({ comparison }: { comparison: ComparisonJson }) {
  return (
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
              <td className="text-right">{formatPercent(comparison.baseline.finalCurveProgress * 100)}</td>
              <td className="text-right">{formatPercent(comparison.auctra.finalCurveProgress * 100)}</td>
              <td className="text-right">{formatPercent(comparison.deltas.finalCurveProgress * 100)}</td>
            </tr>
            <tr>
              <td>reference deviation</td>
              <td className="text-right">{formatBps(comparison.baseline.finalReferenceDeviationBps)}</td>
              <td className="text-right">{formatBps(comparison.auctra.finalReferenceDeviationBps)}</td>
              <td className="text-right">{formatBps(comparison.deltas.finalReferenceDeviationBps)}</td>
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
  )
}
