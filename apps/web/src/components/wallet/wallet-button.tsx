'use client'

import dynamic from 'next/dynamic'
import { SOLANA_CLUSTER } from './wallet-providers'

/**
 * The interactive wallet button is loaded client-side only. This is the
 * documented App Router pattern: server-rendering the wallet button is the most
 * common cause of a dead "Select Wallet" button (hydration mismatch). The
 * providers stay server-rendered so the context exists for hydration.
 */
const WalletMultiButton = dynamic(
  () =>
    import('@solana/wallet-adapter-react-ui').then((module) => module.WalletMultiButton),
  { ssr: false },
)

/**
 * Wallet connection control (AUCTRA.md Section 57): connect, disconnect,
 * account display and network display. No custody.
 */
export function WalletButton() {
  return (
    <div className="flex items-center gap-2">
      <span className="chip" title="Solana cluster">
        {SOLANA_CLUSTER === 'mainnet-beta' ? 'MAINNET' : 'DEVNET'}
      </span>
      <WalletMultiButton />
    </div>
  )
}
