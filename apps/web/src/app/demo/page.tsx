'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ComparisonTable } from '@/components/comparison-table'
import { CurveChart } from '@/components/curve-chart'
import { DataRow, EmptyNote, Section } from '@/components/section'
import { StatusBadge } from '@/components/status-badge'
import { DeploymentPanel } from '@/components/wallet/deployment-panel'
import { api } from '@/lib/api'
import { formatBps, formatNumber, shortAddress } from '@/lib/format'
import type {
  AssetRecord,
  LifecycleResponse,
  PlanJson,
  ReferenceStateJson,
  SimulationPlanJson,
} from '@/lib/types'

type StepStatus = 'pending' | 'ok' | 'skipped' | 'error'

interface StepState {
  label: string
  status: StepStatus
  detail?: string
}

const STEP_LABELS = [
  'Select PreStock',
  'Load PreStocks data',
  'Show lifecycle state',
  'Load reference data',
  'Show Pyth market session and confidence',
  'Build transition dossier',
  'Generate transition gap',
  'Generate Transition Curve',
  'Generate Meteora DBC configuration',
  'Run baseline and Auctra simulations',
  'Display measurable differences',
  'Show raw Meteora configuration',
  'Prepare deployment',
  'Verify transaction',
]

/**
 * Scripted demonstration (AUCTRA.md Section 71).
 * Runs the real pipeline against the API. Steps that cannot be satisfied are
 * marked skipped with the reason, never faked.
 */
export default function DemoPage() {
  const [steps, setSteps] = useState<StepState[]>(
    STEP_LABELS.map((label) => ({ label, status: 'pending' })),
  )
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [asset, setAsset] = useState<AssetRecord | null>(null)
  const [lifecycle, setLifecycle] = useState<LifecycleResponse | null>(null)
  const [reference, setReference] = useState<ReferenceStateJson | null>(null)
  const [plan, setPlan] = useState<PlanJson | null>(null)
  const [simulation, setSimulation] = useState<SimulationPlanJson | null>(null)
  const [network, setNetwork] = useState('DEMO')

  function mark(label: string, status: StepStatus, detail?: string) {
    setSteps((previous) => previous.map((step) => (step.label === label ? { ...step, status, detail } : step)))
  }

  async function run() {
    setRunning(true)
    setError(null)
    setSteps(STEP_LABELS.map((label) => ({ label, status: 'pending' })))
    setAsset(null)
    setLifecycle(null)
    setReference(null)
    setPlan(null)
    setSimulation(null)

    try {
      const assetsResponse = await api.listAssets()
      if (!assetsResponse.ok) throw new Error(assetsResponse.message ?? assetsResponse.error)
      const chosen =
        assetsResponse.data.assets.find((candidate) => candidate.symbol === 'SPACEX') ??
        assetsResponse.data.assets[0]
      if (!chosen) throw new Error('no assets available')
      setAsset(chosen)
      mark('Select PreStock', 'ok', chosen.symbol)

      mark('Load PreStocks data', 'ok', `mark ${formatNumber(chosen.markPrice, 2)} · token ${formatNumber(chosen.tokenPrice, 2)}`)

      const lifecycleResponse = await api.lifecycle(chosen.symbol)
      if (lifecycleResponse.ok) {
        setLifecycle(lifecycleResponse.data)
        mark('Show lifecycle state', 'ok', lifecycleResponse.data.state)
      } else {
        mark('Show lifecycle state', 'skipped', lifecycleResponse.message ?? lifecycleResponse.error)
      }

      const referenceResponse = await api.reference(chosen.symbol)
      if (referenceResponse.ok) {
        setReference(referenceResponse.data.referenceState)
        mark('Load reference data', 'ok', referenceResponse.data.referenceState.symbol)
        mark(
          'Show Pyth market session and confidence',
          'ok',
          `${referenceResponse.data.referenceState.marketSession ?? 'UNKNOWN'} · ${formatNumber(referenceResponse.data.referenceState.confidenceBps, 2)} bps`,
        )
      } else {
        mark('Load reference data', 'skipped', referenceResponse.message ?? referenceResponse.error)
        mark('Show Pyth market session and confidence', 'skipped', 'reference unavailable')
      }

      const compileResponse = await api.compile({
        symbol: chosen.symbol,
        liquidity: {
          mode: 'EVENT_ADAPTIVE',
          segments: 8,
          referencePrice: chosen.tokenPrice,
          targetLiquidity: '250000',
          quoteMint: 'So11111111111111111111111111111111111111112',
          migrationQuoteThreshold: '100000',
        },
      })
      if (!compileResponse.ok) throw new Error(compileResponse.message ?? compileResponse.error)
      const compiled = compileResponse.data.plan
      setPlan(compiled)
      mark('Build transition dossier', 'ok', compiled.id)
      mark('Generate transition gap', 'ok', compiled.transitionGap?.status ?? 'NOT_COMPUTABLE')
      mark('Generate Transition Curve', 'ok', `${compiled.transitionCurve.mode} · ${compiled.dbcPlan.segments} segments`)
      mark('Generate Meteora DBC configuration', 'ok', `${compiled.dbcPlan.feePolicy.startingFeeBps} bps start fee`)

      const simulationResponse = await api.simulate({ planId: compiled.id, scenario: 'IPO_IMMINENT' })
      if (simulationResponse.ok) {
        setSimulation(simulationResponse.data.simulation)
        mark('Run baseline and Auctra simulations', 'ok', simulationResponse.data.simulation.sequenceId)
        mark('Display measurable differences', 'ok', 'comparison below')
      } else {
        mark('Run baseline and Auctra simulations', 'error', simulationResponse.message ?? simulationResponse.error)
        mark('Display measurable differences', 'skipped', 'simulation failed')
      }

      mark('Show raw Meteora configuration', 'ok', 'JSON below')

      const configResponse = await api.config()
      if (configResponse.ok) setNetwork(configResponse.data.network)
      mark('Prepare deployment', 'ok', `network ${configResponse.ok ? configResponse.data.network : 'DEMO'} · unsigned only`)
      mark('Verify transaction', 'skipped', 'requires wallet approval — see the deployment panel')
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : 'demo failed')
    }
    setRunning(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Demo</p>
          <h1 className="mt-1 text-2xl font-semibold">PreStock lifecycle to DBC configuration</h1>
          <p className="mt-2 max-w-3xl text-sm" style={{ color: 'var(--muted)' }}>
            A scripted run of the real pipeline. Every value comes from the API and the deterministic engine.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="px-5 py-2 text-sm font-medium"
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--ink)' }}
        >
          {running ? 'Running…' : 'Run demonstration'}
        </button>
      </div>

      {error ? (
        <p className="panel p-4 text-sm" role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}

      <Section id="steps" title="Steps">
        <ol className="flex flex-col gap-2 text-sm">
          {steps.map((step, index) => (
            <li key={step.label} className="flex flex-wrap items-center gap-3">
              <span className="mono w-6 text-xs" style={{ color: 'var(--faint)' }}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="flex-1">{step.label}</span>
              <StatusBadge
                status={
                  step.status === 'ok'
                    ? 'OK'
                    : step.status === 'error'
                      ? 'ERROR'
                      : step.status === 'skipped'
                        ? 'UNKNOWN'
                        : 'PENDING'
                }
              />
              {step.detail ? (
                <span className="mono w-full text-xs sm:w-auto" style={{ color: 'var(--muted)' }}>
                  {step.detail}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </Section>

      {asset ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Section id="asset" title="PreStocks data">
            <DataRow label="Symbol" value={asset.symbol} mono={false} />
            <DataRow label="Mint" value={shortAddress(asset.mintAddress, 8)} />
            <DataRow label="Mark price" value={formatNumber(asset.markPrice, 2)} />
            <DataRow label="Token price" value={formatNumber(asset.tokenPrice, 2)} />
            <DataRow label="Retrieved at" value={asset.retrievedAt} />
          </Section>

          <Section id="lifecycle" title="Lifecycle">
            {lifecycle ? (
              <>
                <DataRow label="State" value={<StatusBadge status={lifecycle.state} />} mono={false} />
                <DataRow label="Events" value={String(lifecycle.events.length)} />
                <DataRow label="First deadline" value={lifecycle.events[0]?.conversionDeadline ?? 'UNKNOWN'} />
                <DataRow label="Timeline nodes" value={String(lifecycle.timeline.length)} />
              </>
            ) : (
              <EmptyNote>Lifecycle unavailable.</EmptyNote>
            )}
          </Section>
        </div>
      ) : null}

      {reference ? (
        <Section id="reference" title="Reference (Pyth)">
          <DataRow label="Symbol" value={reference.symbol} mono={false} />
          <DataRow label="Price" value={formatNumber(reference.price, 4)} />
          <DataRow label="Confidence" value={`${formatNumber(reference.confidenceBps, 2)} bps`} />
          <DataRow label="Market session" value={reference.marketSession ?? 'UNKNOWN'} mono={false} />
          <DataRow label="Freshness" value={<StatusBadge status={reference.freshness} />} mono={false} />
        </Section>
      ) : null}

      {plan ? (
        <>
          <Section id="plan" title="Transition plan">
            <div className="grid gap-x-8 lg:grid-cols-2">
              <div>
                <DataRow label="Plan id" value={plan.id} />
                <DataRow label="State" value={<StatusBadge status={plan.currentState} />} mono={false} />
                <DataRow label="Curve mode" value={plan.transitionCurve.mode} />
                <DataRow label="Segments" value={String(plan.dbcPlan.segments)} />
                <DataRow label="Event intensity" value={formatNumber(plan.eventIntensity.intensity, 4)} />
              </div>
              <div>
                <DataRow label="Transition gap" value={<StatusBadge status={plan.transitionGap?.status ?? 'NOT_COMPUTABLE'} />} mono={false} />
                {plan.transitionGap?.status === 'COMPUTABLE' ? (
                  <DataRow label="Gap" value={plan.transitionGap.gapBps === undefined ? '—' : formatBps(plan.transitionGap.gapBps)} />
                ) : (
                  <DataRow label="Missing inputs" value={plan.transitionGap?.missingInputs.join(', ') ?? '—'} mono={false} />
                )}
                <DataRow label="Input hash" value={shortAddress(plan.inputHash, 10)} />
                <DataRow label="Output hash" value={shortAddress(plan.outputHash, 10)} />
              </div>
            </div>
            <Link href={`/transition/${plan.id}`} className="mt-3 inline-block text-sm" style={{ color: 'var(--accent)' }}>
              Open the full transition dossier →
            </Link>
          </Section>

          <Section id="curve" title="Transition Curve">
            <CurveChart points={plan.transitionCurve.points} referencePrice={plan.transitionCurve.referencePrice} title="Liquidity weight (demo plan)" />
          </Section>
        </>
      ) : null}

      {simulation ? (
        <Section id="comparison" title="Baseline vs Auctra">
          <ComparisonTable comparison={simulation.comparison} />
        </Section>
      ) : null}

      {plan ? (
        <Section id="dbc" title="Meteora DBC configuration">
          <DataRow label="BUILD CURVE MODE" value={plan.dbcPlan.curveMode} />
          <DataRow label="CURVE SEGMENTS" value={String(plan.dbcPlan.segments)} />
          <DataRow label="BASE FEE MODE" value={plan.dbcPlan.feePolicy.mode === 'exponential' ? 'FEE SCHEDULER EXPONENTIAL' : 'FEE SCHEDULER LINEAR'} />
          <DataRow label="FEE SCHEDULE" value={`${plan.dbcPlan.feePolicy.startingFeeBps} → ${plan.dbcPlan.feePolicy.endingFeeBps} bps`} />
          <DataRow label="ACTIVATION TYPE" value={plan.dbcPlan.activationType} />
          <DataRow label="QUOTE MINT" value={plan.dbcPlan.quoteMint} />
          <DataRow label="MIGRATION OPTION" value={plan.dbcPlan.migrationOption} />
          <DataRow label="MIGRATION THRESHOLD" value={plan.dbcPlan.migrationQuoteThreshold} />
          <details className="panel-2 mt-4 p-3">
            <summary className="cursor-pointer text-xs" style={{ color: 'var(--muted)' }}>
              Raw configuration (JSON)
            </summary>
            <pre className="mono mt-3 max-h-96 overflow-auto text-xs">{JSON.stringify(plan.dbcPlan, null, 2)}</pre>
          </details>
        </Section>
      ) : null}

      {plan ? (
        <Section id="deployment" title="Deployment preparation">
          <DeploymentPanel planId={plan.id} network={network} />
        </Section>
      ) : null}
    </div>
  )
}
