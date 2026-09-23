'use client'

import { useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Keypair, Transaction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { api } from '@/lib/api'
import { SOLANA_CLUSTER } from './wallet-providers'

const STEPS = [
  'Review transition plan',
  'Review DBC configuration',
  'Run simulation',
  'Validate configuration',
  'Connect wallet',
  'Prepare transaction',
  'Wallet approval',
  'Submit',
  'Verify transaction',
  'Display explorer link',
]

/**
 * Mainnet deployment flow (AUCTRA.md Section 33).
 *
 * Auctra prepares an UNSIGNED transaction. The browser wallet signs and submits.
 * Auctra never submits automatically and never asks for a seed phrase or private
 * key. When the Meteora SDK is unavailable the API returns 503 and this panel
 * reports it rather than pretending a transaction exists.
 */
export function DeploymentPanel({ planId, network }: { planId: string; network: string }) {
  const { connection } = useConnection()
  const { publicKey, connected, signTransaction } = useWallet()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signature, setSignature] = useState<string | null>(null)

  const isMainnet = network === 'MAINNET'

  async function prepare() {
    if (!publicKey || !signTransaction) {
      setError('Connect a wallet first.')
      return
    }
    setBusy(true)
    setError(null)
    setSignature(null)
    try {
      const configKeypair = Keypair.generate()
      const prepared = await api.dbcPrepare({
        planId,
        payer: publicKey.toBase58(),
        config: configKeypair.publicKey.toBase58(),
        feeClaimer: publicKey.toBase58(),
        leftoverReceiver: publicKey.toBase58(),
        tokenDecimal: 9,
        initialMarketCap: '5000',
        migrationMarketCap: '1000000',
      })
      if (!prepared.ok) {
        setError(prepared.message ?? prepared.error)
        setBusy(false)
        return
      }

      setStatus('Transaction prepared. Approve it in your wallet.')
      const transaction = Transaction.from(Buffer.from(prepared.data.unsignedTransaction, 'base64'))
      if (prepared.data.blockhash) transaction.recentBlockhash = prepared.data.blockhash
      if (!transaction.recentBlockhash) {
        const latest = await connection.getLatestBlockhash()
        transaction.recentBlockhash = latest.blockhash
        transaction.lastValidBlockHeight = latest.lastValidBlockHeight
      }
      transaction.feePayer = publicKey
      transaction.partialSign(configKeypair)

      const signed = await signTransaction(transaction)
      setStatus('Submitting…')
      const submitted = await connection.sendRawTransaction(signed.serialize())
      setStatus('Verifying transaction…')
      const blockhash = transaction.recentBlockhash
      const lastValidBlockHeight = transaction.lastValidBlockHeight
      if (blockhash && lastValidBlockHeight) {
        await connection.confirmTransaction({ signature: submitted, blockhash, lastValidBlockHeight }, 'confirmed')
      } else {
        await connection.confirmTransaction(submitted, 'confirmed')
      }
      setSignature(submitted)
      setStatus('Confirmed.')
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'deployment failed')
    }
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-4">
      {isMainnet ? (
        <p
          className="mono px-3 py-2 text-xs"
          style={{ border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius)' }}
        >
          MAINNET · REAL TRANSACTION
        </p>
      ) : (
        <p className="mono text-xs" style={{ color: 'var(--muted)' }}>
          Network: {network} · cluster {SOLANA_CLUSTER}. Auctra will not sign or submit anything for you.
        </p>
      )}

      <ol className="grid gap-1 text-xs sm:grid-cols-2" style={{ color: 'var(--muted)' }}>
        {STEPS.map((step, index) => (
          <li key={step} className="mono">
            {index + 1}. {step}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={prepare}
          disabled={busy || !connected}
          className="px-4 py-2 text-sm"
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--ink)' }}
        >
          {busy ? 'Working…' : 'Prepare transaction'}
        </button>
        {!connected ? (
          <span className="text-xs" style={{ color: 'var(--faint)' }}>
            Connect a wallet to enable preparation.
          </span>
        ) : null}
      </div>

      {status ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {status}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm" role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}

      {signature ? (
        <p className="mono text-xs">
          <a
            href={`https://explorer.solana.com/tx/${signature}${SOLANA_CLUSTER === 'devnet' ? '?cluster=devnet' : ''}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--accent)' }}
          >
            Explorer: {signature}
          </a>
        </p>
      ) : null}
    </div>
  )
}
