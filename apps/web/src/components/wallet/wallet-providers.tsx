'use client'

import { useMemo, type ReactNode } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import '@solana/wallet-adapter-react-ui/styles.css'

/**
 * Solana wallet context (AUCTRA.md Section 57).
 *
 * We register no legacy wallet adapters: current wallets are Standard Wallets
 * (W3C) and are auto-detected. This is what silences the "registered as a
 * Standard Wallet" console warning.
 *
 * The cluster is chosen explicitly from NEXT_PUBLIC_SOLANA_NETWORK and defaults
 * to devnet; it is never silently mainnet. The browser wallet is the only signer
 * — Auctra never requests a seed phrase or private key.
 */
export type SolanaCluster = 'devnet' | 'mainnet-beta'

export const SOLANA_CLUSTER: SolanaCluster =
  process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet' ? 'mainnet-beta' : 'devnet'

export const SOLANA_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl(SOLANA_CLUSTER)

export function WalletProviders({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [], [])
  return (
    <ConnectionProvider endpoint={SOLANA_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
