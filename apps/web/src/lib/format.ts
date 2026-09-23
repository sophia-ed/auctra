/**
 * Display formatting only. These helpers convert a decimal string to a number
 * for presentation; they are never used for policy or monetary computation.
 */

export function formatNumber(value: string | number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatBps(value: string | number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  const sign = numeric > 0 ? '+' : ''
  return `${sign}${numeric.toFixed(digits)} bps`
}

export function formatPercent(value: string | number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return String(value)
  return `${numeric.toFixed(digits)}%`
}

export function shortAddress(address: string, size = 4): string {
  if (!address) return '—'
  if (address.length <= size * 2 + 1) return address
  return `${address.slice(0, size)}…${address.slice(-size)}`
}

/** Derived for display: (token - mark) / mark, in bps. Not policy output. */
export function displayPremiumBps(tokenPrice: string, markPrice: string): number | null {
  const token = Number(tokenPrice)
  const mark = Number(markPrice)
  if (!Number.isFinite(token) || !Number.isFinite(mark) || mark === 0) return null
  return ((token - mark) / mark) * 10000
}
