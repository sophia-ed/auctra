import type { LiquidityPlanJson } from '@/lib/types'
import { formatNumber } from '@/lib/format'

/**
 * Liquidity gap view (AUCTRA.md Section 53).
 * CURRENT MARKET → liquidity → TRANSITION ZONE → required depth → TARGET MARKET.
 * Anything modelled rather than observed is marked MODEL.
 */
export function LiquidityGapView({ liquidity }: { liquidity: LiquidityPlanJson }) {
  const observed = liquidity.currentObservedLiquidity
  const target = liquidity.targetLiquidity
  const gap = liquidity.liquidityGap

  const stage = (label: string, value: string, sub: string, note?: string) => (
    <div className="panel-2 flex items-baseline justify-between gap-4 px-4 py-3">
      <span className="label">{label}</span>
      <span className="mono text-sm">{value}</span>
      <span className="text-xs" style={{ color: 'var(--muted)' }}>
        {sub}
        {note ? ` · ${note}` : ''}
      </span>
    </div>
  )

  const connector = (label: string) => (
    <div className="flex flex-col items-center py-1" aria-hidden="true">
      <span className="text-xs" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <span style={{ color: 'var(--accent)' }}>↓</span>
    </div>
  )

  return (
    <div className="flex flex-col">
      {stage(
        'CURRENT MARKET',
        observed ? `${formatNumber(observed.value, 2)} · ${observed.provenance}` : 'UNKNOWN',
        'current observed liquidity',
      )}
      {connector('liquidity')}
      {stage('TRANSITION ZONE', '', 'required depth')}
      {connector('required depth')}
      {stage('TARGET MARKET', `${formatNumber(target.value, 2)} · ${target.provenance}`, 'target liquidity')}
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <span className="label">gap</span>
        <span className="mono text-sm" style={{ color: 'var(--warn)' }}>
          {gap ? `${formatNumber(gap.value, 2)} · MODEL` : 'NOT COMPUTABLE'}
        </span>
      </div>
    </div>
  )
}
