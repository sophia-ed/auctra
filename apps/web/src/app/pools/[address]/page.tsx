import { ApiError } from '@/components/api-error'
import { EmptyNote, Section } from '@/components/section'
import { StatusBadge } from '@/components/status-badge'
import { api } from '@/lib/api'
import { formatNumber, shortAddress } from '@/lib/format'

export const dynamic = 'force-dynamic'

function field(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (value === undefined || value === null || value === '') return '—'
  return String(value)
}

export default async function PoolPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params
  const result = await api.getPool(address)

  if (!result.ok) {
    if (result.status === 404) {
      return (
        <div className="flex flex-col gap-6">
          <div>
            <p className="label">Explorer</p>
            <h1 className="mt-1 text-2xl font-semibold">Pool {shortAddress(address, 8)}</h1>
          </div>
          <Section id="notfound" title="Pool">
            <EmptyNote>
              No pool is recorded at this address. Pools appear after a wallet-signed deployment, and this
              explorer reads every value from the chain where possible.
            </EmptyNote>
          </Section>
        </div>
      )
    }
    return <ApiError error={result.error} message={result.message} />
  }

  const { pool, snapshots, migration } = result.data
  const record = pool as Record<string, unknown>
  const snapshotsList = Array.isArray(snapshots) ? (snapshots as Record<string, unknown>[]) : []
  const migrationRecord = (migration ?? undefined) as Record<string, unknown> | undefined

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="label">Explorer</p>
        <h1 className="mt-1 text-2xl font-semibold">Pool {shortAddress(address, 8)}</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section id="identity" title="Pool identity">
          <dl className="mono text-sm">
            <div className="flex justify-between gap-4 border-b py-2" style={{ borderColor: 'var(--line)' }}>
              <dt style={{ color: 'var(--muted)' }}>pool address</dt>
              <dd>{field(record, 'address')}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b py-2" style={{ borderColor: 'var(--line)' }}>
              <dt style={{ color: 'var(--muted)' }}>config</dt>
              <dd>{field(record, 'config')}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b py-2" style={{ borderColor: 'var(--line)' }}>
              <dt style={{ color: 'var(--muted)' }}>base mint</dt>
              <dd>{field(record, 'baseMint')}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt style={{ color: 'var(--muted)' }}>quote mint</dt>
              <dd>{field(record, 'quoteMint')}</dd>
            </div>
          </dl>
        </Section>

        <Section id="state" title="Curve and migration">
          <dl className="mono text-sm">
            <div className="flex justify-between gap-4 border-b py-2" style={{ borderColor: 'var(--line)' }}>
              <dt style={{ color: 'var(--muted)' }}>quote reserve</dt>
              <dd>{field(record, 'quoteReserve')}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b py-2" style={{ borderColor: 'var(--line)' }}>
              <dt style={{ color: 'var(--muted)' }}>curve progress</dt>
              <dd>{field(record, 'progress')}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b py-2" style={{ borderColor: 'var(--line)' }}>
              <dt style={{ color: 'var(--muted)' }}>migration threshold</dt>
              <dd>{field(record, 'migrationQuoteThreshold')}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b py-2" style={{ borderColor: 'var(--line)' }}>
              <dt style={{ color: 'var(--muted)' }}>migration option</dt>
              <dd>{field(record, 'migrationOption')}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <dt style={{ color: 'var(--muted)' }}>migration status</dt>
              <dd>
                <StatusBadge status={migrationRecord?.ready ? 'ACTIVE' : 'PENDING'} />
              </dd>
            </div>
          </dl>
          {migrationRecord?.model ? (
            <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
              {(migrationRecord.model as { separationNote?: string }).separationNote}
            </p>
          ) : null}
        </Section>
      </div>

      <Section id="snapshots" title="Snapshots">
        {snapshotsList.length === 0 ? (
          <EmptyNote>No snapshots recorded for this pool.</EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="mono w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th className="text-left font-normal">observed</th>
                  <th className="text-right font-normal">quote reserve</th>
                  <th className="text-right font-normal">progress</th>
                  <th className="text-left font-normal">migration ready</th>
                </tr>
              </thead>
              <tbody>
                {snapshotsList.map((snapshot, index) => (
                  <tr key={index}>
                    <td>{field(snapshot, 'observedAt')}</td>
                    <td className="text-right">{formatNumber(field(snapshot, 'quoteReserve'), 2)}</td>
                    <td className="text-right">{field(snapshot, 'progress')}</td>
                    <td>{String(snapshot.migrationReady ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}
