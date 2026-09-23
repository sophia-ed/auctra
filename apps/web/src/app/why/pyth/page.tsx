import { DataRow, EmptyNote, Section } from '@/components/section'
import { StatusBadge } from '@/components/status-badge'
import { api } from '@/lib/api'
import { formatNumber, shortAddress } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function WhyPythPage() {
  const result = await api.reference('OPENAI')
  const reference = result.ok ? result.data.referenceState : null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="label">Why Pyth</p>
        <h1 className="mt-1 text-2xl font-semibold">A reference, not an unquestioned number</h1>
        <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--muted)' }}>
          Pyth provides the external market-state layer. Auctra uses price, confidence, market session and
          feed freshness rather than treating a single number as truth, and it refuses to compare units that
          have not been normalised by a verified conversion.
        </p>
      </div>

      <Section id="live" title="Reference fields">
        {reference ? (
          <div>
            <DataRow label="Feed" value={shortAddress(reference.feedId, 8)} />
            <DataRow label="Symbol" value={reference.symbol} />
            <DataRow label="Price" value={formatNumber(reference.price, 4)} />
            <DataRow label="Confidence" value={`${formatNumber(reference.confidenceBps, 2)} bps`} />
            <DataRow label="Publisher count" value={reference.publisherCount === undefined ? '—' : String(reference.publisherCount)} />
            <DataRow label="Market session" value={reference.marketSession ?? 'UNKNOWN'} />
            <DataRow label="Feed generated" value={reference.feedUpdateTimestamp ?? reference.publishTime} />
            <DataRow label="Freshness" value={<StatusBadge status={reference.freshness} />} mono={false} />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <EmptyNote>
              No live observation is available. Pyth price updates require an authenticated source, so Auctra
              reports the reference as unavailable instead of substituting a value.
            </EmptyNote>
            {!result.ok ? (
              <p className="mono text-xs" style={{ color: 'var(--faint)' }}>
                {result.error}
                {result.message ? `: ${result.message}` : ''}
              </p>
            ) : null}
          </div>
        )}
      </Section>

      <Section id="model" title="What Auctra reads">
        <ul className="flex flex-col gap-2 text-sm" style={{ color: 'var(--muted)' }}>
          <li>
            <span className="mono">price</span> and <span className="mono">exponent</span> — the aggregate
            mantissa and its decimal exponent.
          </li>
          <li>
            <span className="mono">confidence</span> — publisher disagreement, shown in bps relative to price.
          </li>
          <li>
            <span className="mono">marketSession</span> — regular, pre-market, post-market, overnight or
            closed. Auctra uses Pyth&apos;s session rather than local browser time.
          </li>
          <li>
            <span className="mono">feedUpdateTimestamp</span> — when the price was generated. A carried-forward
            price is not mistaken for a fresh one.
          </li>
          <li>Best bid/ask are experimental and are never used as core logic.</li>
        </ul>
      </Section>
    </div>
  )
}
