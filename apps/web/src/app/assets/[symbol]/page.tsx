import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ApiError } from '@/components/api-error'
import { ClockModelPanel } from '@/components/clock-panel'
import { DataRow, EmptyNote, Section } from '@/components/section'
import { StatusBadge } from '@/components/status-badge'
import { api } from '@/lib/api'
import { displayPremiumBps, formatBps, formatNumber, shortAddress } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function AssetPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params

  const [assetResult, lifecycleResult, referenceResult, clocksResult] = await Promise.all([
    api.getAsset(symbol),
    api.lifecycle(symbol),
    api.reference(symbol),
    api.clocks(symbol),
  ])

  if (!assetResult.ok) {
    if (assetResult.status === 404) notFound()
    return <ApiError error={assetResult.error} message={assetResult.message} />
  }

  const asset = assetResult.data.asset
  const lifecycle = lifecycleResult.ok ? lifecycleResult.data : null
  const reference = referenceResult.ok ? referenceResult.data.referenceState : null
  const clocks = clocksResult.ok ? clocksResult.data : null
  const deviationBps = displayPremiumBps(asset.tokenPrice, asset.markPrice)
  const nextEvent = lifecycle ? [...lifecycle.events].sort((a, b) => (a.conversionDeadline ?? '') < (b.conversionDeadline ?? '') ? -1 : 1)[0] : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">PreStock</p>
          <h1 className="mt-1 text-2xl font-semibold">
            {asset.symbol} <span style={{ color: 'var(--muted)' }}>· {asset.name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={lifecycle?.state ?? 'UNKNOWN'} />
          <Link href="/create" className="text-sm" style={{ color: 'var(--accent)' }}>
            Build a transition plan →
          </Link>
        </div>
      </div>

      {clocks ? <ClockModelPanel model={clocks} /> : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Section id="identity" title="Asset identity">
          <DataRow label="Mint address" value={asset.mintAddress} />
          <DataRow label="Source" value={asset.source} />
          <DataRow label="Retrieved at" value={asset.retrievedAt} />
        </Section>

        <Section id="valuation" title="Prices and valuation">
          <DataRow label="Mark price" value={formatNumber(asset.markPrice, 4)} />
          <DataRow label="Token price" value={formatNumber(asset.tokenPrice, 4)} />
          <DataRow
            label="Mark deviation (computed)"
            value={deviationBps === null ? '—' : formatBps(deviationBps)}
          />
          <DataRow label="Mark valuation" value={formatNumber(asset.markValuation, 0)} />
          <DataRow label="Implied valuation" value={formatNumber(asset.impliedValuation, 0)} />
          <DataRow label="Supply" value={formatNumber(asset.supply, 2)} />
        </Section>
      </div>

      <Section id="lifecycle" title="Lifecycle">
        {!lifecycle ? (
          <ApiError
            error={lifecycleResult.ok ? 'lifecycle_unavailable' : lifecycleResult.error}
            message={lifecycleResult.ok ? undefined : lifecycleResult.message}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={lifecycle.state} />
              <span className="mono text-xs" style={{ color: 'var(--muted)' }}>
                as of {lifecycle.asOf}
              </span>
            </div>
            {nextEvent ? (
              <div>
                <DataRow label="Event" value={`${nextEvent.type} · ${nextEvent.title}`} mono={false} />
                <DataRow label="Observed at" value={nextEvent.observedAt ?? '—'} />
                <DataRow label="Conversion deadline" value={nextEvent.conversionDeadline ?? 'UNKNOWN'} />
                <DataRow label="Source" value={`${nextEvent.sourceType}${nextEvent.sourceUrl ? ` · ${nextEvent.sourceUrl}` : ''}`} mono={false} />
              </div>
            ) : (
              <EmptyNote>No lifecycle events stored for this asset.</EmptyNote>
            )}

            {lifecycle.transitions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="mono w-full text-xs">
                  <thead>
                    <tr style={{ color: 'var(--muted)' }}>
                      <th className="text-left font-normal">from</th>
                      <th className="text-left font-normal">to</th>
                      <th className="text-left font-normal">timestamp</th>
                      <th className="text-left font-normal">reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lifecycle.transitions.map((transition, index) => (
                      <tr key={`${transition.newState}-${index}`}>
                        <td>{transition.previousState}</td>
                        <td>{transition.newState}</td>
                        <td>{transition.timestamp}</td>
                        <td style={{ color: 'var(--muted)' }}>{transition.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {lifecycle.issues.length > 0 ? (
              <ul className="flex flex-col gap-1 text-xs" style={{ color: 'var(--warn)' }}>
                {lifecycle.issues.map((issue) => (
                  <li key={issue.code + issue.message}>
                    {issue.code}: {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </Section>

      <Section id="reference" title="Market reference (Pyth)">
        {!reference ? (
          <div className="flex flex-col gap-2">
            <EmptyNote>
              No reference available. For many PreStocks there is no Pyth feed, so the transition gap stays
              NOT COMPUTABLE rather than being proxied.
            </EmptyNote>
            {!referenceResult.ok ? (
              <p className="mono text-xs" style={{ color: 'var(--faint)' }}>
                {referenceResult.error}
                {referenceResult.message ? `: ${referenceResult.message}` : ''}
              </p>
            ) : null}
          </div>
        ) : (
          <div>
            <DataRow label="Feed" value={shortAddress(reference.feedId, 8)} />
            <DataRow label="Symbol" value={reference.symbol} />
            <DataRow label="Price" value={formatNumber(reference.price, 4)} />
            <DataRow label="Confidence" value={formatNumber(reference.confidence, 6)} />
            <DataRow label="Confidence" value={`${formatNumber(reference.confidenceBps, 2)} bps`} />
            <DataRow label="Market session" value={reference.marketSession ?? 'UNKNOWN'} />
            <DataRow label="Feed generated" value={reference.feedUpdateTimestamp ?? reference.publishTime} />
            <DataRow label="Freshness" value={<StatusBadge status={reference.freshness} />} mono={false} />
            <DataRow label="Publisher count" value={reference.publisherCount === undefined ? '—' : String(reference.publisherCount)} />
          </div>
        )}
      </Section>
    </div>
  )
}
