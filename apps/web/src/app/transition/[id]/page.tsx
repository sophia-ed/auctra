import { notFound } from 'next/navigation'
import { ApiError } from '@/components/api-error'
import { ClockModelPanel } from '@/components/clock-panel'
import { CurveChart } from '@/components/curve-chart'
import { LiquidityGapView } from '@/components/liquidity-gap'
import { RunSimulation } from '@/components/run-simulation'
import { DataRow, EmptyNote, Section } from '@/components/section'
import { StatusBadge } from '@/components/status-badge'
import { DeploymentPanel } from '@/components/wallet/deployment-panel'
import { api } from '@/lib/api'
import { formatBps, formatNumber, shortAddress } from '@/lib/format'
import type { ExplanationJson } from '@/lib/types'

export const dynamic = 'force-dynamic'

function Explanations({ items }: { items: ExplanationJson[] }) {
  if (items.length === 0) return null
  return (
    <ul className="flex flex-col gap-2 text-xs">
      {items.map((item) => (
        <li key={`${item.input}-${item.effect}`} className="panel-2 p-3">
          <span className="label">INPUT</span> {item.input}
          <span className="mx-2" style={{ color: 'var(--faint)' }}>
            →
          </span>
          <span className="label">EFFECT</span> {item.effect}
          <span className="mx-2" style={{ color: 'var(--faint)' }}>
            →
          </span>
          <span className="label">OUTPUT</span> <span className="mono">{item.output}</span>
        </li>
      ))}
    </ul>
  )
}

export default async function TransitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await api.transition(id)

  if (!result.ok) {
    if (result.status === 404) notFound()
    return <ApiError error={result.error} message={result.message} />
  }

  const { plan, versions, comparison } = result.data
  const symbol = plan.sourceAsset.symbol
  const [lifecycleResult, clocksResult, configResult] = await Promise.all([
    api.lifecycle(symbol),
    api.clocks(symbol),
    api.config(),
  ])
  const lifecycle = lifecycleResult.ok ? lifecycleResult.data : null
  const clocks = clocksResult.ok ? clocksResult.data : null
  const network = configResult.ok ? configResult.data.network : 'DEMO'

  const dbc = plan.dbcPlan
  const gap = plan.transitionGap
  const inspectorRows: [string, string][] = [
    ['BUILD CURVE MODE', dbc.curveMode],
    ['CURVE SEGMENTS', String(dbc.segments)],
    ['LIQUIDITY WEIGHTS', dbc.liquidityWeights.map((weight) => formatNumber(weight, 6)).join(', ')],
    ['BASE FEE MODE', dbc.feePolicy.mode === 'exponential' ? 'FEE SCHEDULER EXPONENTIAL' : 'FEE SCHEDULER LINEAR'],
    ['FEE SCHEDULE', `${dbc.feePolicy.startingFeeBps} → ${dbc.feePolicy.endingFeeBps} bps over ${dbc.feePolicy.durationSeconds}s`],
    ['ACTIVATION TYPE', dbc.activationType],
    ['ACTIVATION POINT', dbc.activation.timestamp ?? 'n/a'],
    ['DYNAMIC FEE', 'configuration-dependent'],
    ['QUOTE MINT', dbc.quoteMint],
    ['MIGRATION OPTION', dbc.migrationOption],
    ['MIGRATION FEE', 'protocol-configured'],
    ['MIGRATION THRESHOLD', dbc.migrationQuoteThreshold],
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Transition plan</p>
          <h1 className="mt-1 text-2xl font-semibold">
            {symbol} <span style={{ color: 'var(--muted)' }}>· {plan.lifecycleEvent.type}</span>
          </h1>
          <p className="mono mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            {plan.id}
          </p>
        </div>
        <StatusBadge status={plan.currentState} />
      </div>

      {clocks ? <ClockModelPanel model={clocks} /> : null}

      <Section id="overview" title="Overview">
        <div className="grid gap-x-8 lg:grid-cols-2">
          <div>
            <DataRow label="Source asset" value={`${plan.sourceAsset.symbol} · ${plan.sourceAsset.name}`} mono={false} />
            <DataRow label="Mint" value={plan.sourceAsset.mintAddress} />
            <DataRow label="Current state" value={plan.currentState} />
            <DataRow label="Event" value={`${plan.lifecycleEvent.type} · ${plan.lifecycleEvent.title}`} mono={false} />
            <DataRow label="Generated at" value={plan.generatedAt} />
          </div>
          <div>
            <DataRow label="Algorithm version" value={plan.algorithmVersion} />
            <DataRow label="Input hash" value={shortAddress(plan.inputHash, 10)} />
            <DataRow label="Output hash" value={shortAddress(plan.outputHash, 10)} />
            <DataRow label="Mark deviation" value={plan.premium ? formatBps(plan.premium.tokenPremiumBps) : '—'} />
            <DataRow label="Event intensity" value={formatNumber(plan.eventIntensity.intensity, 4)} />
          </div>
        </div>
      </Section>

      <Section id="lifecycle" title="Lifecycle">
        {lifecycle && lifecycle.timeline.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th className="text-left font-normal">timestamp</th>
                  <th className="text-left font-normal">state</th>
                  <th className="text-left font-normal">source</th>
                  <th className="text-left font-normal">confidence</th>
                  <th className="text-left font-normal">reason</th>
                </tr>
              </thead>
              <tbody className="mono">
                {lifecycle.timeline.map((node, index) => (
                  <tr key={`${node.timestamp}-${index}`} style={{ opacity: node.future ? 0.6 : 1 }}>
                    <td>{node.timestamp}</td>
                    <td>{node.state}</td>
                    <td>{node.source}</td>
                    <td>{formatNumber(node.confidence, 2)}</td>
                    <td style={{ color: 'var(--muted)' }}>{node.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyNote>Lifecycle timeline unavailable.</EmptyNote>
        )}
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section id="reference" title="Reference (Pyth)">
          {plan.referenceState ? (
            <div>
              <DataRow label="Feed" value={shortAddress(plan.referenceState.feedId, 8)} />
              <DataRow label="Symbol" value={plan.referenceState.symbol} />
              <DataRow label="Price" value={formatNumber(plan.referenceState.price, 4)} />
              <DataRow label="Confidence" value={`${formatNumber(plan.referenceState.confidenceBps, 2)} bps`} />
              <DataRow label="Market session" value={plan.referenceState.marketSession ?? 'UNKNOWN'} />
              <DataRow label="Freshness" value={<StatusBadge status={plan.referenceState.freshness} />} mono={false} />
            </div>
          ) : (
            <EmptyNote>No reference was available when this plan was compiled.</EmptyNote>
          )}
        </Section>

        <Section id="conversion" title="Conversion">
          {plan.conversionSpec ? (
            <div>
              <DataRow label="Ratio" value={`${plan.conversionSpec.ratioNumerator} / ${plan.conversionSpec.ratioDenominator}`} />
              <DataRow label="Source mint" value={shortAddress(plan.conversionSpec.sourceAssetMint, 8)} />
              <DataRow label="Target mint" value={shortAddress(plan.conversionSpec.targetAssetMint, 8)} />
              <DataRow label="Deadline" value={plan.conversionSpec.deadline ?? 'UNKNOWN'} />
              <DataRow label="Source" value={plan.conversionSpec.sourceUrl} mono={false} />
              <DataRow label="Verified at" value={plan.conversionSpec.verifiedAt} />
            </div>
          ) : (
            <EmptyNote>Conversion ratio UNKNOWN. Provide a verified source to compute a gap.</EmptyNote>
          )}
          <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--line)' }}>
            {gap ? (
              <>
                <DataRow label="Transition gap" value={<StatusBadge status={gap.status} />} mono={false} />
                {gap.status === 'COMPUTABLE' ? (
                  <>
                    <DataRow label="Source reference" value={formatNumber(gap.sourceReference, 4)} />
                    <DataRow label="Implied target value" value={gap.impliedTargetValue ? formatNumber(gap.impliedTargetValue, 4) : '—'} />
                    <DataRow label="Target reference" value={gap.targetReference ? formatNumber(gap.targetReference, 4) : '—'} />
                    <DataRow label="Absolute gap" value={gap.absoluteGap ? formatNumber(gap.absoluteGap, 4) : '—'} />
                    <DataRow label="Gap" value={gap.gapBps === undefined ? '—' : formatBps(gap.gapBps)} />
                  </>
                ) : (
                  <EmptyNote>Missing: {gap.missingInputs.join(', ') || 'required inputs'}</EmptyNote>
                )}
              </>
            ) : (
              <EmptyNote>No transition gap was computed for this plan.</EmptyNote>
            )}
          </div>
        </Section>
      </div>

      {comparison ? (
        <Section id="comparison" title="Reference comparison (Section 52)">
          {comparison.status === 'COMPARABLE' ? (
            <div>
              <DataRow label="Transformation" value={comparison.transformation ?? '—'} mono={false} />
              <DataRow label="Normalized source value" value={formatNumber(comparison.normalizedSourceValue, 4)} />
              <DataRow label="Target reference" value={formatNumber(comparison.targetReference, 4)} />
              <DataRow
                label="Difference"
                value={`${formatNumber(comparison.difference, 4)} · ${formatBps(comparison.differenceBps)}`}
              />
            </div>
          ) : (
            <EmptyNote>{comparison.reason ?? 'Comparison unavailable'}</EmptyNote>
          )}
        </Section>
      ) : null}

      <Section id="liquidity" title="Liquidity">
        <div className="grid gap-x-8 lg:grid-cols-2">
          <div>
            <DataRow label="Target liquidity" value={`${formatNumber(plan.liquidityPlan.targetLiquidity.value, 2)} · ${plan.liquidityPlan.targetLiquidity.provenance}`} />
            <DataRow label="Concentration (HHI)" value={formatNumber(plan.liquidityPlan.concentration.value, 4)} />
            <DataRow label="Initial curve width" value={formatNumber(plan.liquidityPlan.initialCurveWidth.value, 4)} />
            <DataRow label="Migration threshold" value={formatNumber(plan.liquidityPlan.migrationThreshold.value, 2)} />
          </div>
          <div>
            {plan.liquidityPlan.currentObservedLiquidity ? (
              <DataRow label="Observed liquidity" value={`${formatNumber(plan.liquidityPlan.currentObservedLiquidity.value, 2)} · ${plan.liquidityPlan.currentObservedLiquidity.provenance}`} />
            ) : (
              <DataRow label="Observed liquidity" value="UNKNOWN (not observed)" mono={false} />
            )}
            {plan.liquidityPlan.liquidityGap ? (
              <DataRow label="Liquidity gap" value={`${formatNumber(plan.liquidityPlan.liquidityGap.value, 2)} · MODEL`} />
            ) : (
              <DataRow label="Liquidity gap" value="NOT COMPUTABLE" mono={false} />
            )}
            <DataRow label="Proposed activation" value={`${plan.dbcPlan.activation.type}${plan.dbcPlan.activation.timestamp ? ` · ${plan.dbcPlan.activation.timestamp}` : ''}`} mono={false} />
          </div>
        </div>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="label mb-2">Liquidity gap view (Section 53)</p>
            <LiquidityGapView liquidity={plan.liquidityPlan} />
          </div>
          <div>
            <p className="label mb-2">Policy explanation (Section 45)</p>
            <Explanations items={plan.liquidityPlan.explanation} />
          </div>
        </div>
      </Section>

      <Section id="curve" title="Transition Curve">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--muted)' }}>
            <span className="mono">mode {plan.transitionCurve.mode}</span>
            <span className="mono">spread {formatNumber(plan.transitionCurve.spread, 4)}</span>
            <span className="mono">bandwidth {formatNumber(plan.transitionCurve.bandwidth, 4)}</span>
            <span className="mono">
              total liquidity {formatNumber(plan.transitionCurve.totalLiquidity, 2)}
            </span>
          </div>
          <CurveChart
            points={plan.transitionCurve.points}
            referencePrice={plan.transitionCurve.referencePrice}
            title="Liquidity weight across the transition curve"
          />
          <Explanations items={plan.transitionCurve.explanation} />
        </div>
      </Section>

      <Section id="dbc" title="Meteora DBC">
        <div className="flex flex-col gap-4">
          {dbc.warnings.length > 0 ? (
            <ul className="flex flex-col gap-1 text-xs" style={{ color: 'var(--warn)' }}>
              {dbc.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          <div>
            {inspectorRows.map(([label, value]) => (
              <DataRow key={label} label={label} value={value} />
            ))}
          </div>
          <details className="panel-2 p-3">
            <summary className="cursor-pointer text-xs" style={{ color: 'var(--muted)' }}>
              Raw configuration (JSON)
            </summary>
            <pre className="mono mt-3 max-h-96 overflow-auto text-xs">{JSON.stringify(dbc, null, 2)}</pre>
          </details>
        </div>
      </Section>

      <Section id="simulation" title="Simulation">
        <RunSimulation planId={plan.id} />
      </Section>

      <Section id="deployment" title="Deployment">
        <DeploymentPanel planId={plan.id} network={network} />
      </Section>

      <Section id="sources" title="Sources">
        <div>
          <DataRow label="Lifecycle event source" value={`${plan.lifecycleEvent.sourceType}${plan.lifecycleEvent.sourceUrl ? ` · ${plan.lifecycleEvent.sourceUrl}` : ''}`} mono={false} />
          {plan.lifecycleEvent.observedAt ? <DataRow label="Observed at" value={plan.lifecycleEvent.observedAt} /> : null}
          <DataRow label="Reference source" value={plan.referenceState ? `pyth · ${shortAddress(plan.referenceState.feedId, 8)}` : 'none'} mono={false} />
          <DataRow label="Conversion source" value={plan.conversionSpec?.sourceUrl ?? 'UNKNOWN'} mono={false} />
          <DataRow label="Liquidity provenance" value={`${plan.liquidityPlan.targetLiquidity.provenance} (target), ${plan.liquidityPlan.concentration.provenance} (concentration)`} mono={false} />
        </div>
      </Section>

      <Section id="audit" title="Audit Trail">
        <div className="flex flex-col gap-3">
          <DataRow label="Generated at" value={plan.generatedAt} />
          <DataRow label="Algorithm version" value={plan.algorithmVersion} />
          <DataRow label="Input hash" value={plan.inputHash} />
          <DataRow label="Output hash" value={plan.outputHash} />
          <div className="overflow-x-auto">
            <table className="mono w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--muted)' }}>
                  <th className="text-left font-normal">version</th>
                  <th className="text-left font-normal">input hash</th>
                  <th className="text-left font-normal">output hash</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <tr key={version.version}>
                    <td>{version.version}</td>
                    <td>{shortAddress(version.inputHash, 10)}</td>
                    <td>{shortAddress(version.outputHash, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs" style={{ color: 'var(--faint)' }}>
            Plans are append-only. Recompiling with different inputs produces a new plan; this one is never
            mutated.
          </p>
        </div>
      </Section>
    </div>
  )
}
