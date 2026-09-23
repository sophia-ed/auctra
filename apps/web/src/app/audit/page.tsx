import { ApiError } from '@/components/api-error'
import { EmptyNote, Section } from '@/components/section'
import { api } from '@/lib/api'
import { shortAddress } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
  const result = await api.audit()

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Data audit</h1>
        <ApiError error={result.error} message={result.message} />
      </div>
    )
  }

  const { assets, sources, events, observations } = result.data

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="label">Provenance</p>
        <h1 className="mt-1 text-2xl font-semibold">Data audit</h1>
        <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--muted)' }}>
          Where every number came from. Source records carry the URL, retrieval time and content hash;
          reference observations carry their freshness; lifecycle events carry their evidence type.
        </p>
      </div>

      <Section id="sources" title="Source registry">
        {sources.length === 0 ? (
          <EmptyNote>No source records yet. Load the asset registry to populate them.</EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="mono w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th className="text-left font-normal">source</th>
                  <th className="text-left font-normal">type</th>
                  <th className="text-left font-normal">retrieved</th>
                  <th className="text-left font-normal">content hash</th>
                  <th className="text-left font-normal">description</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id}>
                    <td>{source.url ? shortAddress(source.url, 18) : source.id}</td>
                    <td>{source.sourceType}</td>
                    <td>{source.retrievedAt}</td>
                    <td>{source.contentHash ? shortAddress(source.contentHash, 8) : '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{source.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="observations" title="Reference observations">
        {observations.length === 0 ? (
          <EmptyNote>
            No reference observations recorded. Pyth price updates require an authenticated source, so this
            stays empty until one is configured.
          </EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="mono w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th className="text-left font-normal">asset</th>
                  <th className="text-left font-normal">feed</th>
                  <th className="text-right font-normal">price</th>
                  <th className="text-left font-normal">freshness</th>
                  <th className="text-left font-normal">retrieved</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((observation) => (
                  <tr key={observation.id}>
                    <td>{observation.assetSymbol}</td>
                    <td>{observation.symbol}</td>
                    <td className="text-right">{observation.price}</td>
                    <td>{observation.freshness}</td>
                    <td>{observation.retrievedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="events" title="Lifecycle events">
        {events.length === 0 ? (
          <EmptyNote>No lifecycle events stored yet.</EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="mono w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th className="text-left font-normal">asset</th>
                  <th className="text-left font-normal">type</th>
                  <th className="text-left font-normal">evidence</th>
                  <th className="text-left font-normal">observed</th>
                  <th className="text-left font-normal">deadline</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>{event.assetId}</td>
                    <td>{event.type}</td>
                    <td>{event.sourceType}</td>
                    <td>{event.observedAt ?? '—'}</td>
                    <td>{event.conversionDeadline ?? 'UNKNOWN'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="assets" title="Assets">
        <div className="overflow-x-auto">
          <table className="mono w-full text-xs">
            <thead>
              <tr style={{ color: 'var(--muted)' }}>
                <th className="text-left font-normal">symbol</th>
                <th className="text-left font-normal">mint</th>
                <th className="text-left font-normal">source</th>
                <th className="text-left font-normal">retrieved</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td>{asset.symbol}</td>
                  <td>{shortAddress(asset.mintAddress, 8)}</td>
                  <td>{asset.source}</td>
                  <td>{asset.retrievedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
