import Link from 'next/link'
import { WalletButton } from './wallet/wallet-button'

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
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link href="/" className="no-underline" style={{ color: 'var(--muted)' }}>
            Overview
          </Link>
          <Link href="/assets" className="no-underline" style={{ color: 'var(--muted)' }}>
            Assets
          </Link>
          <Link href="/create" className="no-underline" style={{ color: 'var(--muted)' }}>
            Create
          </Link>
          <Link href="/dbc-lab" className="no-underline" style={{ color: 'var(--muted)' }}>
            DBC Lab
          </Link>
          <Link href="/monitor" className="no-underline" style={{ color: 'var(--muted)' }}>
            Monitor
          </Link>
          <Link href="/audit" className="no-underline" style={{ color: 'var(--muted)' }}>
            Audit
          </Link>
          <Link href="/demo" className="no-underline" style={{ color: 'var(--muted)' }}>
            Demo
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
        <WalletButton />
      </div>
    </header>
  )
}
