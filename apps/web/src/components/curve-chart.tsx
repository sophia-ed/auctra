import { formatNumber } from '@/lib/format'
import type { CurvePointJson } from '@/lib/types'

/**
 * Transition Curve visualisation (AUCTRA.md Section 22/32).
 * Rendered from real plan output. A details table carries the exact values so
 * the chart is never the only representation (Section 100).
 */
export function CurveChart({
  points,
  referencePrice,
  title,
}: {
  points: CurvePointJson[]
  referencePrice?: string
  title: string
}) {
  if (points.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        No curve points.
      </p>
    )
  }

  const width = 760
  const height = 260
  const padX = 56
  const padTop = 24
  const padBottom = 40
  const prices = points.map((point) => Number(point.price))
  const weights = points.map((point) => Number(point.weight))
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const spanPrice = maxPrice - minPrice || 1
  const maxWeight = Math.max(...weights, Number.EPSILON)
  const innerWidth = width - padX * 2
  const innerHeight = height - padTop - padBottom
  const baseline = height - padBottom
  const px = (price: number) => padX + ((price - minPrice) / spanPrice) * innerWidth
  const barWidth = Math.max(3, (innerWidth / points.length) * 0.55)
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${px(prices[index]).toFixed(1)} ${(baseline - (weights[index] / maxWeight) * innerHeight).toFixed(1)}`)
    .join(' ')

  const referenceX =
    referencePrice && Number.isFinite(Number(referencePrice))
      ? px(Math.min(maxPrice, Math.max(minPrice, Number(referencePrice))))
      : null

  return (
    <div className="flex flex-col gap-3">
      <svg role="img" aria-label={title} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <title>{title}</title>
        {points.map((point, index) => {
          const barHeight = (weights[index] / maxWeight) * innerHeight
          return (
            <rect
              key={point.index}
              x={px(prices[index]) - barWidth / 2}
              y={baseline - barHeight}
              width={barWidth}
              height={barHeight}
              fill="var(--accent-dim)"
              stroke="var(--accent)"
              strokeWidth="1"
            />
          )
        })}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        <line x1={padX} y1={baseline} x2={width - padX} y2={baseline} stroke="var(--line-strong)" />
        {referenceX !== null ? (
          <g>
            <line
              x1={referenceX}
              y1={padTop}
              x2={referenceX}
              y2={baseline}
              stroke="var(--warn)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text x={referenceX} y={padTop - 8} textAnchor="middle" fontSize="11" fill="var(--warn)">
              reference
            </text>
          </g>
        ) : null}
        <text x={padX} y={height - 14} fontSize="11" fill="var(--muted)">
          {formatNumber(minPrice, 2)}
        </text>
        <text x={width - padX} y={height - 14} fontSize="11" textAnchor="end" fill="var(--muted)">
          {formatNumber(maxPrice, 2)}
        </text>
        <text x={padX} y={14} fontSize="11" fill="var(--muted)">
          liquidity weight
        </text>
      </svg>

      <details className="panel-2 p-3">
        <summary className="cursor-pointer text-xs" style={{ color: 'var(--muted)' }}>
          Exact curve values
        </summary>
        <table className="mono mt-3 w-full text-xs">
          <thead>
            <tr style={{ color: 'var(--muted)' }}>
              <th className="text-left font-normal">#</th>
              <th className="text-right font-normal">price</th>
              <th className="text-right font-normal">weight</th>
              <th className="text-right font-normal">liquidity</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.index}>
                <td>{point.index + 1}</td>
                <td className="text-right">{formatNumber(point.price, 4)}</td>
                <td className="text-right">{formatNumber(point.weight, 6)}</td>
                <td className="text-right">{formatNumber(point.liquidity, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
