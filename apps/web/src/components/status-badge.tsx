export type StatusTone = 'ok' | 'warn' | 'danger' | 'muted'

interface StatusMeta {
  tone: StatusTone
  symbol: string
  text: string
}

/**
 * Statuses are encoded by symbol and text as well as color, so the UI remains
 * usable without color perception (AUCTRA.md Section 100).
 */
const STATUS_META: Record<string, StatusMeta> = {
  ACTIVE: { tone: 'ok', symbol: '●', text: 'ACTIVE' },
  LIVE: { tone: 'ok', symbol: '●', text: 'LIVE' },
  FRESH: { tone: 'ok', symbol: '●', text: 'FRESH' },
  OK: { tone: 'ok', symbol: '●', text: 'OK' },
  COMPUTABLE: { tone: 'ok', symbol: '●', text: 'COMPUTABLE' },
  VERIFIED: { tone: 'ok', symbol: '●', text: 'VERIFIED' },
  CLEAR: { tone: 'ok', symbol: '●', text: 'CLEAR' },

  PENDING: { tone: 'warn', symbol: '◐', text: 'PENDING' },
  AGING: { tone: 'warn', symbol: '◐', text: 'AGING' },
  UNKNOWN: { tone: 'warn', symbol: '◐', text: 'UNKNOWN' },
  UNCONFIGURED: { tone: 'warn', symbol: '◐', text: 'UNCONFIGURED' },
  MODEL: { tone: 'warn', symbol: '◐', text: 'MODEL' },
  ATTENTION: { tone: 'warn', symbol: '◐', text: 'ATTENTION' },

  CLOSED: { tone: 'muted', symbol: '○', text: 'CLOSED' },
  NONE: { tone: 'muted', symbol: '○', text: 'NONE' },
  IDLE: { tone: 'muted', symbol: '○', text: 'IDLE' },

  EXPIRED: { tone: 'danger', symbol: '✕', text: 'EXPIRED' },
  STALE: { tone: 'danger', symbol: '✕', text: 'STALE' },
  ERROR: { tone: 'danger', symbol: '✕', text: 'ERROR' },
  ACTION: { tone: 'danger', symbol: '✕', text: 'ACTION' },
  CRITICAL: { tone: 'danger', symbol: '✕', text: 'CRITICAL' },
  NOT_COMPUTABLE: { tone: 'danger', symbol: '✕', text: 'NOT COMPUTABLE' },
}

export function statusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status] ?? {
      tone: 'muted',
      symbol: '○',
      text: status.replaceAll('_', ' '),
    }
  )
}

export function StatusBadge({ status, detail }: { status: string; detail?: string }) {
  const meta = statusMeta(status)
  return (
    <span className={`chip tone-${meta.tone}`} title={detail}>
      <span aria-hidden="true">{meta.symbol}</span>
      <span>{meta.text}</span>
    </span>
  )
}
