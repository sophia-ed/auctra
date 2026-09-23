import { StatusBadge } from './status-badge'

export interface ClockReading {
  label: string
  status: string
  detail?: string
}

/**
 * Private / public / onchain / transition clocks (AUCTRA.md Sections 17, 41).
 */
export function ClockPanel({ readings }: { readings: ClockReading[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {readings.map((reading) => (
        <div key={reading.label} className="panel p-4">
          <div className="label">{reading.label}</div>
          <div className="mt-2">
            <StatusBadge status={reading.status} detail={reading.detail} />
          </div>
          {reading.detail ? (
            <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
              {reading.detail}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
