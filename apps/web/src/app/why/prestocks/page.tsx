import Link from 'next/link'
import { ApiError } from '@/components/api-error'
import { Section } from '@/components/section'
import { api } from '@/lib/api'
import { displayPremiumBps, formatBps, formatNumber } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function WhyPreStocksPage() {
  const result = await api.listAssets()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="label">Why PreStocks</p>
        <h1 className="mt-1 text-2xl font-semibold">The assets the system is built around</h1>
        <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--muted)' }}>
          PreStocks supplies the lifecycle assets around which Auctra is built. The application begins with the
          real PreStocks registry, then adds lifecycle intelligence and transition modelling. It does not
          invent private-company tokens.
        </p>
      </div>

      {!result.ok ? (
        <ApiError error={result.error} message={result.message} />
      ) : (
        <Section
          id="registry"
          title="Live registry"
          aside={
            <Link href="/assets" className="text-xs" style={{ color: 'var(--accent)' }}>
              Open registry →
            </Link>
          }
        >
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {result.data.assets.length} assets normalized from the PreStocks API, each with its mint, mark
            price, token price and valuations.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="mono w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th className="text-left font-normal">symbol</th>
                  <th className="text-right font-normal">mark</th>
                  <th className="text-right font-normal">token</th>
                  <th className="text-right font-normal">mark deviation</th>
                </tr>
              </thead>
              <tbody>
                {result.data.assets.map((asset) => {
                  const bps = displayPremiumBps(asset.tokenPrice, asset.markPrice)
                  return (
                    <tr key={asset.id}>
                      <td>
                        <Link href={`/assets/${asset.symbol}`}>{asset.symbol}</Link>
                      </td>
                      <td className="text-right">{formatNumber(asset.markPrice, 2)}</td>
                      <td className="text-right">{formatNumber(asset.tokenPrice, 2)}</td>
                      <td className="text-right">{bps === null ? '—' : formatBps(bps)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  )
}
