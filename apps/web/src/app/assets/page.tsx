import Link from 'next/link'
import { ApiError } from '@/components/api-error'
import { api } from '@/lib/api'
import { displayPremiumBps, formatBps, formatNumber, shortAddress } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function AssetsPage() {
  const result = await api.listAssets()

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">PreStocks registry</h1>
        <ApiError error={result.error} message={result.message} />
      </div>
    )
  }

  const assets = result.data.assets

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">PreStocks registry</h1>
          <p className="mt-1 max-w-3xl text-sm" style={{ color: 'var(--muted)' }}>
            {assets.length} assets normalized from the PreStocks API. Mark deviation is computed for
            display; the authoritative premium is produced when a plan is compiled.
          </p>
        </div>
        <Link href="/create" className="text-sm" style={{ color: 'var(--accent)' }}>
          Build a transition plan →
        </Link>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--muted)' }}>
              <th className="px-4 py-3 text-left font-normal">Symbol</th>
              <th className="px-4 py-3 text-right font-normal">Mark</th>
              <th className="px-4 py-3 text-right font-normal">Token</th>
              <th className="px-4 py-3 text-right font-normal">Mark deviation</th>
              <th className="px-4 py-3 text-right font-normal">Supply</th>
              <th className="px-4 py-3 text-left font-normal">Mint</th>
            </tr>
          </thead>
          <tbody className="mono">
            {assets.map((asset) => {
              const bps = displayPremiumBps(asset.tokenPrice, asset.markPrice)
              return (
                <tr key={asset.id} className="border-t" style={{ borderColor: 'var(--line)' }}>
                  <td className="px-4 py-3">
                    <Link href={`/assets/${asset.symbol}`}>{asset.symbol}</Link>
                  </td>
                  <td className="px-4 py-3 text-right">{formatNumber(asset.markPrice)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(asset.tokenPrice)}</td>
                  <td className="px-4 py-3 text-right">{bps === null ? '—' : formatBps(bps)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(asset.supply, 2)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>
                    {shortAddress(asset.mintAddress, 6)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
