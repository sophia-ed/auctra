/**
 * Actionable upstream-failure message (AUCTRA.md Section 64).
 * Never renders a stack trace; explains what failed and what to do.
 */
export function ApiError({
  error,
  message,
  hint,
}: {
  error: string
  message?: string
  hint?: string
}) {
  const isNetwork = error === 'network_error' || error === 'request_failed'
  return (
    <div className="panel p-5" role="alert">
      <p className="label tone-danger">{error.replaceAll('_', ' ')}</p>
      <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
        {message ?? (isNetwork ? 'The Auctra API could not be reached.' : 'The request was rejected.')}
      </p>
      <p className="mt-2 text-xs" style={{ color: 'var(--faint)' }}>
        {hint ??
          'Check that the API is running (pnpm --filter @auctra/api dev) and that NEXT_PUBLIC_API_URL points at it.'}
      </p>
    </div>
  )
}
