import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ApiError } from '@/components/api-error'
import { DataRow, EmptyNote, Section } from '@/components/section'
import { StatusBadge } from '@/components/status-badge'
import { api } from '@/lib/api'
import { formatNumber, shortAddress } from '@/lib/format'
import type { CompileResponse, ReplayResultJson } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface CaseFact {
  symbol: string
  name: string
  eventType: string
  disclosure: string
  deadline: string
  ratio?: string
  target: string
  sourceUrl: string
  retrievedAt: string
  status: string
  windowNote: string
}

/**
 * Historical case study (AUCTRA.md Section 74).
 * HISTORICAL FACT is separated from AUCTRA SIMULATION throughout.
 * Disclosures are transcribed from the official PreStocks pages (docs/research).
 */
const FACTS: Record<string, CaseFact> = {
  XAI: {
    symbol: 'XAI',
    name: 'xAI PreStocks',
    eventType: 'ACQUISITION',
    disclosure:
      'xAI was acquired by SpaceX. Each XAI token must be swapped into 0.7165 SPACEX before 11:59pm UTC on 12 September 2026, or it will expire worthless.',
    deadline: '2026-09-12T23:59:00.000Z',
    ratio: '0.7165',
    target: 'SPACEX',
    sourceUrl: 'https://www.prestocks.com/xai',
    retrievedAt: '2026-09-23T12:59:10.000Z',
    status: 'EXPIRED',
    windowNote: 'The conversion window closed on 2026-09-12T23:59:00Z. This is a historical event.',
  },
  SPACEX: {
    symbol: 'SPACEX',
    name: 'SpaceX PreStocks',
    eventType: 'IPO',
    disclosure:
      'SpaceX has gone public! SpaceX PreStocks tokens must be swapped into $SPCXx or any other token before 11:59pm UTC on 12 March 2027, or they will expire worthless.',
    deadline: '2027-03-12T23:59:00.000Z',
    target: 'SPCXx',
    sourceUrl: 'https://www.prestocks.com/spacex',
    retrievedAt: '2026-09-23T12:59:10.000Z',
    status: 'PUBLIC_TRANSITION',
    windowNote: 'The swap window is open until 2027-03-12T23:59:00Z.',
  },
}

export default async function CaseStudyPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  const fact = FACTS[symbol.toUpperCase()]
  if (!fact) notFound()

  const [referenceResult, assetResult] = await Promise.all([
    api.reference(fact.symbol),
    api.getAsset(fact.symbol),
  ])
  const reference = referenceResult.ok ? referenceResult.data.referenceState : null

  let plan: CompileResponse | null = null
  let planError: string | null = null
  if (assetResult.ok) {
    const compiled = await api.compile({
      symbol: fact.symbol,
      liquidity: {
        mode: 'EVENT_ADAPTIVE',
        segments: 8,
        referencePrice: assetResult.data.asset.tokenPrice,
        targetLiquidity: '250000',
        quoteMint: 'So11111111111111111111111111111111111111112',
        migrationQuoteThreshold: '100000',
      },
      ...(fact.ratio ? { conversionRatio: fact.ratio } : {}),
    })
    if (compiled.ok) plan = compiled.data
    else planError = compiled.message ?? compiled.error
  } else {
    planError = assetResult.error === 'asset_not_found' ? 'asset is no longer in the PreStocks registry' : assetResult.error
  }

  // Section 39 replay, using SIMULATED observations around the recorded event.
  let replay: ReplayResultJson | null = null
  if (plan) {
    const replayResult = await api.replay({ planId: plan.plan.id, scenario: 'PUBLIC_MARKET_OPENS' })
    if (replayResult.ok) replay = replayResult.data.replay
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Case study</p>
          <h1 className="mt-1 text-2xl font-semibold">
            {fact.symbol} <span style={{ color: 'var(--muted)' }}>· {fact.eventType}</span>
          </h1>
        </div>
        <StatusBadge status={fact.status} />
      </div>

      <Section id="fact" title="Historical fact">
        <blockquote
          className="panel-2 p-4 text-sm"
          style={{ borderLeft: '3px solid var(--accent)' }}
        >
          “{fact.disclosure}”
        </blockquote>
        <div className="mt-4">
          <DataRow label="Event type" value={fact.eventType} mono={false} />
          <DataRow label="Conversion deadline" value={fact.deadline} />
          <DataRow label="Source" value={fact.sourceUrl} mono={false} />
          <DataRow label="Retrieved at" value={fact.retrievedAt} />
          <DataRow label="Window" value={fact.windowNote} mono={false} />
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section id="conversion" title="Transition information available">
          <DataRow label="Conversion ratio" value={fact.ratio ?? 'UNKNOWN'} />
          <DataRow label="Target asset" value={fact.target} mono={false} />
          <DataRow label="Ratio semantics" value={fact.ratio ? `1 ${fact.symbol} → ${fact.ratio} ${fact.target}` : 'swap-or-expire, no numeric ratio published'} mono={false} />
        </Section>

        <Section id="reference" title="Market reference available">
          {reference ? (
            <div>
              <DataRow label="Feed" value={shortAddress(reference.feedId, 8)} />
              <DataRow label="Symbol" value={reference.symbol} />
              <DataRow label="Price" value={formatNumber(reference.price, 4)} />
              <DataRow label="Market session" value={reference.marketSession ?? 'UNKNOWN'} />
              <DataRow label="Freshness" value={<StatusBadge status={reference.freshness} />} mono={false} />
            </div>
          ) : (
            <EmptyNote>
              No live reference was available. Where a PreStock has no Pyth feed, or price updates require an
              authenticated source, Auctra reports the reference as unavailable.
            </EmptyNote>
          )}
        </Section>
      </div>

      <Section id="auctra" title="What Auctra would generate">
        <p className="mb-3 text-xs" style={{ color: 'var(--warn)' }}>
          AUCTRA SIMULATION — generated now from the recorded facts. Not historical market data.
        </p>
        {plan ? (
          <div className="flex flex-col gap-3">
            <div className="grid gap-x-8 lg:grid-cols-2">
              <div>
                <DataRow label="Derived lifecycle state" value={<StatusBadge status={plan.plan.currentState} />} mono={false} />
                <DataRow label="Curve mode" value={plan.plan.dbcPlan.curveMode} />
                <DataRow label="Segments" value={String(plan.plan.dbcPlan.segments)} />
                <DataRow label="Event intensity" value={formatNumber(plan.plan.eventIntensity.intensity, 4)} />
              </div>
              <div>
                <DataRow label="Transition gap" value={<StatusBadge status={plan.plan.transitionGap?.status ?? 'NOT_COMPUTABLE'} />} mono={false} />
                <DataRow label="Fee schedule" value={`${plan.plan.dbcPlan.feePolicy.startingFeeBps} → ${plan.plan.dbcPlan.feePolicy.endingFeeBps} bps`} />
                <DataRow label="Migration threshold" value={plan.plan.dbcPlan.migrationQuoteThreshold} />
                <DataRow label="Plan input hash" value={shortAddress(plan.plan.inputHash, 10)} />
              </div>
            </div>
            <Link href={`/transition/${plan.plan.id}`} className="text-sm" style={{ color: 'var(--accent)' }}>
              Open the full transition dossier →
            </Link>
          </div>
        ) : (
          <EmptyNote>
            Auctra cannot compile a plan for this asset: {planError ?? 'unknown reason'}. It does not fabricate
            a plan for an asset it cannot read.
          </EmptyNote>
        )}
      </Section>

      {replay ? (
        <Section id="replay" title="Historical replay (Section 39)">
          <p className="mb-4 text-xs" style={{ color: 'var(--warn)' }}>
            {replay.provenanceSummary}
          </p>
          {(['PRE_EVENT', 'EVENT', 'POST_EVENT'] as const).map((phase) => (
            <div key={phase} className="mb-4">
              <p className="label mb-2">{phase.replaceAll('_', '-')}</p>
              {replay.phases[phase].length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--faint)' }}>
                  no observations
                </p>
              ) : (
                <table className="mono w-full text-xs">
                  <tbody>
                    {replay.phases[phase].map((point) => (
                      <tr key={point.timestamp} className="border-b" style={{ borderColor: 'var(--line)' }}>
                        <td>{point.timestamp.slice(0, 10)}</td>
                        <td style={{ color: 'var(--muted)' }}>{point.label}</td>
                        <td className="text-right">{formatNumber(point.value, 2)}</td>
                        <td style={{ color: 'var(--muted)' }}>{point.lifecycleState}</td>
                        <td style={{ color: 'var(--warn)' }}>{point.provenance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </Section>
      ) : null}
    </div>
  )
}
