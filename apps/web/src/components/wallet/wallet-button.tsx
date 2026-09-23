'use client'

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { SOLANA_CLUSTER } from './wallet-providers'

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
