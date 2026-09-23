import Link from 'next/link'

const REPO_URL = 'https://github.com/sophia-ed/auctra'

export function SiteHeader() {
  return (
    <header
      className="border-b"
      style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-baseline gap-3 no-underline">
          <span className="text-lg font-semibold tracking-[0.28em]">AUCTRA</span>
          <span className="hidden text-xs sm:inline" style={{ color: 'var(--muted)' }}>
            Liquidity for the moments markets change state.
          </span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-5 text-sm">
          <Link href="/" className="no-underline" style={{ color: 'var(--muted)' }}>
            Overview
          </Link>
          <a
            href={REPO_URL}
            className="no-underline"
            style={{ color: 'var(--muted)' }}
            rel="noreferrer"
          >
            Source
          </a>
        </nav>
      </div>
    </header>
  )
}
