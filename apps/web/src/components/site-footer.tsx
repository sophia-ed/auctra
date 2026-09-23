import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer
      className="mt-16 border-t"
      style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
    >
      <div className="mx-auto max-w-6xl px-5 py-8">
        <nav aria-label="Secondary" className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
          <Link href="/case-studies/spacex" style={{ color: 'var(--muted)' }}>
            Case study · SpaceX
          </Link>
          <Link href="/case-studies/xai" style={{ color: 'var(--muted)' }}>
            Case study · xAI
          </Link>
          <Link href="/why/meteora" style={{ color: 'var(--muted)' }}>
            Why Meteora
          </Link>
          <Link href="/why/pyth" style={{ color: 'var(--muted)' }}>
            Why Pyth
          </Link>
          <Link href="/why/prestocks" style={{ color: 'var(--muted)' }}>
            Why PreStocks
          </Link>
        </nav>
        <div
          className="mt-6 flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{ color: 'var(--muted)' }}
        >
          <p>
            Auctra produces analysis and proposed configurations. It does not custody assets and does not
            provide investment advice.
          </p>
          <p className="mono">algorithm v1.0.0</p>
        </div>
      </div>
    </footer>
  )
}
