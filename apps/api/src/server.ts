import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { loadConfig, type AuctraConfig } from '@auctra/config'
import {
  newId,
  type LifecycleEventRecord,
  type PreStockAssetRecord,
  type Repositories,
} from '@auctra/database'
import {
  Decimal,
  buildDbcPlan,
  buildLiquidityPlan,
  buildTransitionCurve,
  buildTransitionDossier,
  buildTransitionTimeline,
  compileTransitionPlan,
  compareToBaseline,
  computeActivation,
  computeClockModel,
  computeFeePolicy,
  computePremium,
  computeTransitionGap,
  deriveLifecycleState,
  getScenarioPreset,
  makeConversionSpec,
  reduceLifecycle,
  toJsonValue,
  type AssetReference,
  type CurveMode,
  type LifecycleEvent,
  type LifecycleEventType,
  type MarketSession,
  type Freshness,
  type Scenario,
  type SimulationConfig,
  type SimulationPlan,
  type SourceType,
  type TransitionPlan,
} from '@auctra/domain'
import type { MeteoraDBCAdapter } from '@auctra/meteora'
import type { DetailedLifecycleProvider, PreStockAsset, PreStocksProvider } from '@auctra/prestocks'
import {
  PythObservationUnavailableError,
  computeFreshness,
  toReferenceState,
  type MarketReferenceProvider,
} from '@auctra/pyth'
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify'
import {
  compileRequestSchema,
  dbcLabRequestSchema,
  dbcPrepareRequestSchema,
  dbcValidateRequestSchema,
  eventRequestSchema,
  simulationRequestSchema,
} from './schemas'

export interface ApiDeps {
  config: AuctraConfig
  repos: Repositories
  prestocks: PreStocksProvider
  pyth?: MarketReferenceProvider
  lifecycle?: DetailedLifecycleProvider
  dbc?: MeteoraDBCAdapter
  now?: () => string
  logger?: boolean
}

function assetToRecord(asset: PreStockAsset): PreStockAssetRecord {
  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    mintAddress: asset.mintAddress,
    markPrice: asset.markPrice.toString(),
    markValuation: asset.markValuation.toString(),
    tokenPrice: asset.tokenPrice.toString(),
    impliedValuation: asset.impliedValuation.toString(),
    supply: asset.supply.toString(),
    source: asset.source,
    retrievedAt: asset.retrievedAt,
  }
}

function toReference(record: PreStockAssetRecord): AssetReference {
  return {
    id: record.id,
    symbol: record.symbol,
    name: record.name,
    mintAddress: record.mintAddress,
    source: record.source,
    retrievedAt: record.retrievedAt,
  }
}

function toLifecycleEvent(record: LifecycleEventRecord): LifecycleEvent {
  return {
    id: record.id,
    assetId: record.assetId,
    type: record.type as LifecycleEventType,
    title: record.title,
    announcedAt: record.announcedAt,
    effectiveAt: record.effectiveAt,
    conversionDeadline: record.conversionDeadline,
    observedAt: record.observedAt,
    sourceType: record.sourceType as SourceType,
    sourceUrl: record.sourceUrl,
    confidence: Number(record.confidence),
    notes: record.notes,
  }
}

function eventTimestamp(event: LifecycleEvent): number {
  return (
    Date.parse(
      event.observedAt ?? event.announcedAt ?? event.effectiveAt ?? event.conversionDeadline ?? '',
    ) || 0
  )
}

function uniformWeights(count: number): Decimal[] {
  return Array.from({ length: count }, () => new Decimal(1).div(count))
}

/**
 * Baseline vs Auctra comparison for a given curve (AUCTRA.md Section 38).
 * Identical trade sequence; measurements only.
 */
function simulateForCurve(params: {
  idPrefix: string
  pricePoints: Decimal[]
  weights: Decimal[]
  referencePrice: Decimal
  migrationQuoteThreshold: Decimal
  feeBps: number
  scenario: Scenario
}): SimulationPlan {
  const preset = getScenarioPreset(params.scenario)
  const auctraConfig: SimulationConfig = {
    id: `${params.idPrefix}:auctra`,
    referencePrice: params.referencePrice,
    migrationQuoteThreshold: params.migrationQuoteThreshold,
    feeBps: params.feeBps,
    curve: {
      pricePoints: params.pricePoints,
      weights: params.weights,
      referencePrice: params.referencePrice,
    },
  }
  const baselineConfig: SimulationConfig = {
    id: `${params.idPrefix}:baseline`,
    referencePrice: params.referencePrice,
    migrationQuoteThreshold: params.migrationQuoteThreshold,
    feeBps: preset.feeBps,
    curve: {
      pricePoints: params.pricePoints,
      weights: uniformWeights(params.weights.length),
      referencePrice: params.referencePrice,
    },
  }
  return {
    scenario: params.scenario,
    sequenceId: preset.sequence.id,
    comparison: compareToBaseline(auctraConfig, baselineConfig, preset.sequence),
  }
}

export async function createApiServer(deps: ApiDeps): Promise<FastifyInstance> {
  const now = deps.now ?? (() => new Date().toISOString())
  const app = Fastify({ logger: deps.logger ?? false })

  await app.register(helmet)
  await app.register(cors, { origin: false })
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' })

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error, requestId: request.id }, 'request failed')
    const status = error.statusCode ?? 500
    reply.code(status).send({
      error: status >= 500 ? 'internal_error' : error.name ?? 'error',
      message: status >= 500 ? 'request could not be processed' : error.message,
      requestId: request.id,
    })
  })

  app.addHook('onResponse', (request, reply, done) => {
    request.log.info(
      { requestId: request.id, route: request.routeOptions?.url, statusCode: reply.statusCode, latency: reply.elapsedTime },
      'request',
    )
    done()
  })

  async function ensureAssets(): Promise<void> {
    if (deps.repos.assets.list().length > 0) return
    const detailed = await deps.prestocks.listAssetsDetailed()
    for (const asset of detailed.assets) {
      deps.repos.assets.upsert(assetToRecord(asset))
      deps.repos.audit.append({ kind: 'asset_imported', assetId: asset.id, source: 'prestocks' })
    }
    deps.repos.sources.register({
      id: detailed.source.id,
      sourceType: detailed.source.sourceType,
      url: detailed.source.url,
      retrievedAt: detailed.source.retrievedAt,
      contentHash: detailed.source.contentHash,
      description: detailed.source.description,
    })
  }

  async function ensureEvents(asset: PreStockAssetRecord): Promise<LifecycleEvent[]> {
    let events = deps.repos.events.listByAsset(asset.id)
    if (events.length === 0 && deps.lifecycle) {
      const result = await deps.lifecycle.getEventsDetailed({
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        mintAddress: asset.mintAddress,
        markPrice: new Decimal(asset.markPrice),
        markValuation: new Decimal(asset.markValuation),
        tokenPrice: new Decimal(asset.tokenPrice),
        impliedValuation: new Decimal(asset.impliedValuation),
        supply: new Decimal(asset.supply),
        source: 'prestocks',
        retrievedAt: asset.retrievedAt,
      })
      for (const event of result.events) {
        deps.repos.events.insert({
          id: event.id,
          assetId: event.assetId,
          type: event.type,
          title: event.title,
          announcedAt: event.announcedAt,
          effectiveAt: event.effectiveAt,
          conversionDeadline: event.conversionDeadline,
          observedAt: event.observedAt,
          sourceType: event.sourceType,
          sourceUrl: event.sourceUrl,
          confidence: String(event.confidence),
          notes: event.notes,
          createdAt: now(),
        })
        deps.repos.audit.append({ kind: 'event_added', assetId: event.assetId, source: event.sourceType })
      }
      events = deps.repos.events.listByAsset(asset.id)
    }
    return events.map(toLifecycleEvent)
  }

  // --- health ---------------------------------------------------------------

  app.get('/api/health', async () => ({
    application: 'ok',
    database: 'ok',
    solana: deps.config.solanaRpcUrl ? 'ok' : 'unconfigured',
    prestocks: 'ok',
    pyth: deps.config.pythApiKey ? 'ok' : 'unconfigured',
  }))

  // Non-secret runtime configuration for the UI (network gating, Section 34).
  app.get('/api/config', async () => ({
    network: deps.config.network,
    enableMainnet: deps.config.enableMainnet,
    demoMode: deps.config.demoMode,
  }))

  // --- assets ---------------------------------------------------------------

  app.get('/api/assets', async () => {
    await ensureAssets()
    return { assets: deps.repos.assets.list() }
  })

  app.get<{ Params: { symbol: string } }>('/api/assets/:symbol', async (request, reply) => {
    await ensureAssets()
    const asset = deps.repos.assets.getBySymbol(request.params.symbol)
    if (!asset) return reply.code(404).send({ error: 'asset_not_found' })
    return { asset }
  })

  // --- events ---------------------------------------------------------------

  app.get('/api/events', async (request) => {
    const assetId = (request.query as { assetId?: string }).assetId
    return { events: assetId ? deps.repos.events.listByAsset(assetId) : deps.repos.events.list() }
  })

  app.post('/api/events', async (request, reply) => {
    const parsed = eventRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation_failed', issues: parsed.error.issues })
    }
    const event = parsed.data
    deps.repos.events.insert({
      ...event,
      confidence: String(event.confidence),
      createdAt: now(),
    })
    deps.repos.audit.append({ kind: 'event_added', assetId: event.assetId, source: event.sourceType })
    return reply.code(201).send({ event })
  })

  // --- reference ------------------------------------------------------------

  app.get<{ Params: { asset: string } }>('/api/reference/:asset', async (request, reply) => {
    if (!deps.pyth) return reply.code(503).send({ error: 'pyth_not_configured' })
    try {
      const observation = await deps.pyth.getReference({ symbol: request.params.asset })
      const freshness = computeFreshness({
        now: now(),
        feedUpdateTimestamp: observation.feedUpdateTimestamp,
        publishTime: observation.publishTime,
      })
      const referenceState = toReferenceState(observation, freshness)
      deps.repos.references.insert({
        id: newId('ref'),
        assetSymbol: request.params.asset.toUpperCase(),
        feedId: observation.feedId,
        symbol: observation.symbol,
        price: observation.price.toString(),
        confidence: observation.confidence.toString(),
        exponent: observation.exponent,
        marketSession: observation.marketSession,
        publisherCount: observation.publisherCount,
        publishTime: observation.publishTime,
        feedUpdateTimestamp: observation.feedUpdateTimestamp,
        freshness: freshness.status,
        source: 'pyth',
        retrievedAt: now(),
      })
      deps.repos.audit.append({ kind: 'reference_observed', assetId: request.params.asset, source: 'pyth' })
      return { observation: toJsonValue(observation), referenceState: toJsonValue(referenceState) }
    } catch (error) {
      if (error instanceof PythObservationUnavailableError) {
        return reply.code(503).send({ error: 'reference_unavailable', message: error.message })
      }
      return reply.code(404).send({
        error: 'reference_not_found',
        message: error instanceof Error ? error.message : 'unknown',
      })
    }
  })

  // --- lifecycle ------------------------------------------------------------

  app.get<{ Params: { symbol: string } }>('/api/lifecycle/:symbol', async (request, reply) => {
    await ensureAssets()
    const asset = deps.repos.assets.getBySymbol(request.params.symbol)
    if (!asset) return reply.code(404).send({ error: 'asset_not_found' })

    const events = await ensureEvents(asset)
    const asOf = now()
    const result = reduceLifecycle(events, asOf)

    return {
      symbol: asset.symbol,
      asOf,
      state: result.state,
      transitions: result.transitions,
      issues: result.issues,
      timeline: buildTransitionTimeline(events, asOf),
      events,
    }
  })

  // --- clocks ---------------------------------------------------------------

  app.get<{ Params: { symbol: string } }>('/api/clocks/:symbol', async (request, reply) => {
    await ensureAssets()
    const asset = deps.repos.assets.getBySymbol(request.params.symbol)
    if (!asset) return reply.code(404).send({ error: 'asset_not_found' })

    const events = await ensureEvents(asset)
    const asOf = now()
    const state = deriveLifecycleState(events, asOf)

    let marketSession: MarketSession | undefined
    let referenceFreshness: Freshness | undefined
    if (deps.pyth) {
      try {
        const observation = await deps.pyth.getReference({ symbol: asset.symbol })
        marketSession = observation.marketSession
        referenceFreshness = computeFreshness({
          now: asOf,
          feedUpdateTimestamp: observation.feedUpdateTimestamp,
          publishTime: observation.publishTime,
        }).status
      } catch {
        marketSession = undefined
      }
    }

    const clocks = computeClockModel({
      asOf,
      lifecycleState: state,
      marketSession,
      referenceFreshness,
      mainnetEnabled: deps.config.enableMainnet,
    })
    return toJsonValue(clocks)
  })

  // --- audit and monitor ----------------------------------------------------

  app.get('/api/audit', async () => {
    await ensureAssets()
    return {
      assets: deps.repos.assets.list(),
      sources: deps.repos.sources.list(),
      events: deps.repos.events.list(),
      observations: deps.repos.references.list(),
    }
  })

  app.get('/api/monitor', async () => {
    await ensureAssets()
    const asOf = now()
    const rows: Array<Record<string, unknown>> = []

    for (const asset of deps.repos.assets.list()) {
      const events = await ensureEvents(asset)
      const state = deriveLifecycleState(events, asOf)

      let reference: unknown
      let marketSession: MarketSession | undefined
      let referenceFreshness: Freshness | undefined
      if (deps.pyth) {
        try {
          const observation = await deps.pyth.getReference({ symbol: asset.symbol })
          reference = toJsonValue(observation)
          marketSession = observation.marketSession
          referenceFreshness = computeFreshness({
            now: asOf,
            feedUpdateTimestamp: observation.feedUpdateTimestamp,
            publishTime: observation.publishTime,
          }).status
        } catch {
          reference = undefined
        }
      }

      rows.push({
        asset,
        state,
        reference,
        clocks: toJsonValue(
          computeClockModel({
            asOf,
            lifecycleState: state,
            marketSession,
            referenceFreshness,
            mainnetEnabled: deps.config.enableMainnet,
          }),
        ),
      })
    }

    return {
      asOf,
      assets: rows,
      pools: deps.repos.pools
        .list()
        .map((pool) => ({ ...pool, snapshots: deps.repos.pools.listSnapshots(pool.address) })),
    }
  })

  // --- transitions ----------------------------------------------------------

  app.post('/api/transition/compile', async (request, reply) => {
    const parsed = compileRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation_failed', issues: parsed.error.issues })
    }
    const body = parsed.data
    await ensureAssets()
    const asset = deps.repos.assets.getBySymbol(body.symbol)
    if (!asset) return reply.code(404).send({ error: 'asset_not_found' })

    const events = await ensureEvents(asset)
    if (events.length === 0) {
      return reply.code(409).send({ error: 'no_lifecycle_event', message: 'no lifecycle event available for this asset' })
    }

    const event =
      (body.eventId ? events.find((candidate) => candidate.id === body.eventId) : undefined) ??
      [...events].sort((a, b) => eventTimestamp(b) - eventTimestamp(a))[0]

    const asOf = now()
    const currentState = deriveLifecycleState(events, asOf)

    let reference = undefined as ReturnType<typeof toReferenceState> | undefined
    if (deps.pyth) {
      try {
        const observation = await deps.pyth.getReference({ symbol: asset.symbol })
        reference = toReferenceState(
          observation,
          computeFreshness({
            now: asOf,
            feedUpdateTimestamp: observation.feedUpdateTimestamp,
            publishTime: observation.publishTime,
          }),
        )
      } catch {
        reference = undefined
      }
    }

    const premium = computePremium({
      tokenPrice: asset.tokenPrice,
      markPrice: asset.markPrice,
      impliedValuation: asset.impliedValuation,
      markValuation: asset.markValuation,
    })

    const conversionSpec =
      body.conversionRatio !== undefined && body.targetAssetMint !== undefined
        ? makeConversionSpec({
            sourceAssetMint: asset.mintAddress,
            targetAssetMint: body.targetAssetMint,
            ratioNumerator: body.conversionRatio,
            ratioDenominator: '1',
            deadline: event.conversionDeadline,
            sourceUrl: event.sourceUrl ?? 'manual',
            verifiedAt: asOf,
          })
        : undefined

    const deadlineDistanceSeconds = event.conversionDeadline
      ? Math.round((Date.parse(event.conversionDeadline) - Date.parse(asOf)) / 1000)
      : undefined

    const transitionGap = computeTransitionGap({
      sourceReference: asset.tokenPrice,
      targetReference: reference?.price,
      conversionRatio: body.conversionRatio,
      confidenceBps: reference?.confidenceBps.toNumber(),
      deadlineDistanceSeconds,
      marketSession: reference?.marketSession,
    })

    const plan: TransitionPlan = compileTransitionPlan({
      asOf,
      sourceAsset: toReference(asset),
      lifecycleEvent: event,
      currentState,
      referenceState: reference,
      conversionSpec,
      transitionGap,
      premium,
      liquidity: {
        mode: body.liquidity.mode,
        segments: body.liquidity.segments,
        referencePrice: body.liquidity.referencePrice,
        targetLiquidity: body.liquidity.targetLiquidity,
        quoteMint: body.liquidity.quoteMint,
        migrationQuoteThreshold: body.liquidity.migrationQuoteThreshold,
        currentObservedLiquidity: body.liquidity.currentObservedLiquidity,
        observedSource: reference ? 'pyth' : undefined,
      },
      tokenType: 'Token2022',
    })

    deps.repos.plans.insert({
      id: plan.id,
      assetId: asset.id,
      state: plan.currentState,
      algorithmVersion: plan.algorithmVersion,
      inputHash: plan.inputHash,
      outputHash: plan.outputHash,
      generatedAt: plan.generatedAt,
      payload: plan,
      createdAt: asOf,
    })
    deps.repos.audit.append({ kind: 'policy_compiled', assetId: asset.id, planId: plan.id })

    const dossier = buildTransitionDossier({
      plan,
      asset: {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        mintAddress: asset.mintAddress,
        markPrice: new Decimal(asset.markPrice),
        tokenPrice: new Decimal(asset.tokenPrice),
        premiumBps: premium.tokenPremiumBps,
      },
      targetAsset:
        body.conversionRatio !== undefined && body.targetAssetMint !== undefined
          ? { symbol: body.currency ?? 'TARGET', mintAddress: body.targetAssetMint }
          : undefined,
      mainnetEnabled: deps.config.enableMainnet,
    })

    return reply.code(201).send({ plan: toJsonValue(plan), dossier: toJsonValue(dossier) })
  })

  app.get<{ Params: { id: string } }>('/api/transition/:id', async (request, reply) => {
    const record = deps.repos.plans.get(request.params.id)
    if (!record) return reply.code(404).send({ error: 'plan_not_found' })
    return {
      plan: toJsonValue(record.payload),
      versions: deps.repos.plans
        .listVersions(record.id)
        .map((version) => ({ version: version.version, inputHash: version.inputHash, outputHash: version.outputHash })),
    }
  })

  // --- simulations ----------------------------------------------------------

  app.post('/api/simulations', async (request, reply) => {
    const parsed = simulationRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation_failed', issues: parsed.error.issues })
    }
    const record = deps.repos.plans.get(parsed.data.planId)
    if (!record) return reply.code(404).send({ error: 'plan_not_found' })

    const plan = record.payload as TransitionPlan
    const simulationPlan = simulateForCurve({
      idPrefix: plan.id,
      pricePoints: plan.dbcPlan.pricePoints,
      weights: plan.dbcPlan.liquidityWeights,
      referencePrice: plan.transitionCurve.referencePrice,
      migrationQuoteThreshold: plan.dbcPlan.migrationQuoteThreshold,
      feeBps: plan.dbcPlan.feePolicy.startingFeeBps,
      scenario: parsed.data.scenario,
    })
    const simulationId = newId('sim')
    deps.repos.simulations.insert({
      id: simulationId,
      planId: plan.id,
      scenario: parsed.data.scenario,
      payload: simulationPlan,
      createdAt: now(),
    })
    deps.repos.audit.append({ kind: 'simulation_executed', planId: plan.id, metadata: { simulationId } })
    return reply.code(201).send({ simulationId, simulation: toJsonValue(simulationPlan) })
  })

  app.get<{ Params: { id: string } }>('/api/simulations/:id', async (request, reply) => {
    const record = deps.repos.simulations.get(request.params.id)
    if (!record) return reply.code(404).send({ error: 'simulation_not_found' })
    return { simulation: toJsonValue(record.payload) }
  })

  // --- dbc ------------------------------------------------------------------

  app.post('/api/dbc/validate', async (request, reply) => {
    const parsed = dbcValidateRequestSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'validation_failed', issues: parsed.error.issues })
    if (!deps.dbc) return reply.code(503).send({ error: 'meteora_sdk_unavailable' })
    const record = deps.repos.plans.get(parsed.data.planId)
    if (!record) return reply.code(404).send({ error: 'plan_not_found' })
    const plan = record.payload as TransitionPlan
    const issues = deps.dbc.validateConfig(plan.dbcPlan)
    return { valid: issues.length === 0, issues }
  })

  app.post('/api/dbc/prepare', async (request, reply) => {
    const parsed = dbcPrepareRequestSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'validation_failed', issues: parsed.error.issues })
    if (!deps.dbc) return reply.code(503).send({ error: 'meteora_sdk_unavailable' })
    const body = parsed.data
    const record = deps.repos.plans.get(body.planId)
    if (!record) return reply.code(404).send({ error: 'plan_not_found' })
    const plan = record.payload as TransitionPlan

    const unsigned = await deps.dbc.createConfig({
      plan: plan.dbcPlan,
      tokenDecimal: body.tokenDecimal,
      initialMarketCap: String(body.initialMarketCap),
      migrationMarketCap: String(body.migrationMarketCap),
      payer: body.payer,
      config: body.config,
      feeClaimer: body.feeClaimer,
      leftoverReceiver: body.leftoverReceiver,
    })
    deps.repos.audit.append({
      kind: 'configuration_prepared',
      planId: plan.id,
      metadata: { payer: body.payer, config: body.config },
    })
    return {
      unsignedTransaction: unsigned.transaction,
      blockhash: unsigned.blockhash,
      lastValidBlockHeight: unsigned.lastValidBlockHeight,
      requiresWalletSignature: true,
      network: deps.config.network,
      note: 'unsigned: the browser wallet signs and submits; Auctra never submits automatically',
    }
  })

  // --- dbc lab --------------------------------------------------------------

  app.post('/api/dbc/lab', async (request, reply) => {
    const parsed = dbcLabRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'validation_failed', issues: parsed.error.issues })
    }
    const body = parsed.data

    const curve = buildTransitionCurve({
      referencePrice: body.referencePrice,
      referenceConfidenceBps: body.referenceConfidenceBps,
      currentPremiumBps: body.currentPremiumBps,
      eventIntensity: body.eventIntensity,
      mode: body.curveMode as CurveMode,
      segments: body.segments,
      liquidityTarget: body.targetLiquidity,
    })
    const feePolicy = computeFeePolicy({
      eventIntensity: body.eventIntensity,
      referenceConfidenceBps: body.referenceConfidenceBps,
    })
    const activation = computeActivation({ asOf: now() })
    const liquidityPlan = buildLiquidityPlan({
      curve,
      feePolicy,
      activation,
      migrationQuoteThreshold: body.migrationQuoteThreshold,
      targetLiquidity: body.targetLiquidity,
    })
    const dbcPlan = buildDbcPlan({
      curve,
      feePolicy,
      activation,
      quoteMint: body.quoteMint,
      migrationQuoteThreshold: body.migrationQuoteThreshold,
      tokenType: 'Token2022',
    })
    const simulation = simulateForCurve({
      idPrefix: 'lab',
      pricePoints: dbcPlan.pricePoints,
      weights: dbcPlan.liquidityWeights,
      referencePrice: curve.referencePrice,
      migrationQuoteThreshold: dbcPlan.migrationQuoteThreshold,
      feeBps: dbcPlan.feePolicy.startingFeeBps,
      scenario: (body.scenario ?? 'NORMAL') as Scenario,
    })

    return {
      curve: toJsonValue(curve),
      feePolicy: toJsonValue(feePolicy),
      activation: toJsonValue(activation),
      liquidityPlan: toJsonValue(liquidityPlan),
      dbcPlan: toJsonValue(dbcPlan),
      simulation: toJsonValue(simulation),
      validation: deps.dbc ? deps.dbc.validateConfig(dbcPlan) : undefined,
    }
  })

  // --- pools ----------------------------------------------------------------

  app.get('/api/pools', async () => ({
    pools: deps.repos.pools
      .list()
      .map((pool) => ({ ...pool, snapshots: deps.repos.pools.listSnapshots(pool.address) })),
  }))

  app.get<{ Params: { address: string } }>('/api/pools/:address', async (request, reply) => {
    const pool = deps.repos.pools.get(request.params.address)
    if (pool) {
      return { pool, snapshots: deps.repos.pools.listSnapshots(pool.address) }
    }
    if (!deps.dbc) return reply.code(404).send({ error: 'pool_not_found' })
    try {
      const onchain = await deps.dbc.getPool(request.params.address)
      const migration = await deps.dbc.getMigrationStatus(request.params.address)
      return { pool: toJsonValue(onchain), migration: toJsonValue(migration) }
    } catch (error) {
      return reply.code(404).send({
        error: 'pool_not_found',
        message: error instanceof Error ? error.message : 'unknown',
      })
    }
  })

  return app
}

export function defaultDeps(overrides: Partial<ApiDeps> & Pick<ApiDeps, 'repos' | 'prestocks'>): ApiDeps {
  return { config: loadConfig({}), ...overrides }
}
