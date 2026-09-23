import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { DataModeBanner } from '@/components/data-mode-banner'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { WalletProviders } from '@/components/wallet/wallet-providers'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Auctra — lifecycle infrastructure for tokenized private markets',
    template: '%s · Auctra',
  },
  description:
    'Auctra turns PreStock lifecycle events and live market state into inspectable transition plans and Meteora DBC liquidity configurations.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="mono absolute left-3 top-3 -translate-y-20 px-3 py-2 text-xs focus:translate-y-0"
          style={{ background: 'var(--surface)', border: '1px solid var(--line-strong)' }}
        >
          Skip to content
        </a>
        <WalletProviders>
          <DataModeBanner />
          <SiteHeader />
          <main id="main" className="mx-auto max-w-6xl px-5 py-10">
            {children}
          </main>
          <SiteFooter />
        </WalletProviders>
      </body>
    </html>
  )
}
