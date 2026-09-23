/**
 * API response shapes. Decimals cross the wire as strings (the API serialises
 * `Decimal` values), so these types intentionally type them as strings.
 */

export interface AssetRecord {
  id: string
  symbol: string
  name: string
  mintAddress: string
  markPrice: string
  markValuation: string
  tokenPrice: string
  impliedValuation: string
  supply: string
  source: string
  retrievedAt: string
}

export interface LifecycleEventJson {
  id: string
  assetId: string
  type: string
  title: string
  announcedAt?: string
  effectiveAt?: string
  conversionDeadline?: string
  observedAt?: string
  sourceType: string
  sourceUrl?: string
  confidence: number
  notes?: string
}

export interface StateTransitionJson {
  previousState: string
  newState: string
  timestamp: string
  reason: string
  source: string
  eventId?: string
}

export interface TimelineNodeJson {
  timestamp: string
  state: string
  source: string
  confidence: number
  reason: string
  eventId?: string
  title: string
  future: boolean
}

export interface DataQualityIssueJson {
  code: string
  message: string
}

export interface LifecycleResponse {
  symbol: string
  asOf: string
  state: string
  transitions: StateTransitionJson[]
  issues: DataQualityIssueJson[]
  timeline: TimelineNodeJson[]
  events: LifecycleEventJson[]
}

export interface ReferenceStateJson {
  feedId: string
  symbol: string
  price: string
  confidence: string
  exponent: number
  publisherCount?: number
  marketSession?: string
  publishTime: string
  feedUpdateTimestamp?: string
  confidenceBps: string
  ageSeconds?: number
  freshness: string
  source: string
}

export interface ReferenceResponse {
  observation: Record<string, unknown>
  referenceState: ReferenceStateJson
}

export interface ExplanationJson {
  input: string
  effect: string
  output: string
}

export interface CurvePointJson {
  index: number
  price: string
  weight: string
  liquidity: string
  rawWeight: string
  adaptiveFactor: string
  adjustedWeight: string
  distance: string
}

export interface TransitionCurveJson {
  mode: string
  referencePrice: string
  segments: number
  spread: string
  bandwidth: string
  points: CurvePointJson[]
  totalLiquidity: string
  explanation: ExplanationJson[]
}

export interface PremiumJson {
  tokenPremiumBps: string
  valuationPremiumBps: string | null
  tokenLabel: string
  valuationLabel: string | null
}

export interface TransitionGapJson {
  status: string
  missingInputs: string[]
  sourceReference: string
  targetReference?: string
  conversionRatio?: string
  impliedTargetValue?: string
  absoluteGap?: string
  gapBps?: number
  deadlineDistanceSeconds?: number
  confidenceBps?: number
  marketSession?: string
}

export interface ConversionSpecJson {
  sourceAssetMint: string
  targetAssetMint: string
  ratioNumerator: string
  ratioDenominator: string
  effectiveAt?: string
  deadline?: string
  sourceUrl: string
  verifiedAt: string
}

export interface EventIntensityJson {
  intensity: string
  components: {
    severity: string
    confidenceFactor: string
    timeFactor: string
    uncertaintyFactor: string
  }
  explanation: ExplanationJson[]
}

export interface FeePolicyJson {
  mode: string
  startingFeeBps: number
  endingFeeBps: number
  durationSeconds: number
  reason: string
  explanation: ExplanationJson[]
}

export interface ActivationJson {
  type: string
  timestamp?: string
  reason: string
  explanation: ExplanationJson[]
}

export interface DbcPlanJson {
  curveMode: string
  segments: number
  pricePoints: string[]
  sqrtPrices: string[]
  liquidityWeights: string[]
  liquidityWeightsRelative: number[]
  feePolicy: FeePolicyJson
  activation: ActivationJson
  quoteMint: string
  migrationQuoteThreshold: string
  migrationOption: string
  collectFeeMode: string
  tokenType: string
  activationType: string
  warnings: string[]
}

export interface LiquidityPlanJson {
  concentration: { value: number; provenance: string; note?: string }
  initialCurveWidth: { value: number; provenance: string; note?: string }
  feeProfile: { value: FeePolicyJson; provenance: string; note?: string }
  activation: { value: ActivationJson; provenance: string }
  migrationThreshold: { value: string; provenance: string; note?: string }
  expectedCurveProgression: {
    value: { quoteCumulative: string[]; weightCumulative: string[] }
    provenance: string
  }
  currentObservedLiquidity?: { value: string; provenance: string; source?: string }
  targetLiquidity: { value: string; provenance: string }
  liquidityGap?: { value: string; provenance: string; note?: string }
  explanation: ExplanationJson[]
}

export interface PlanJson {
  id: string
  currentState: string
  sourceAsset: {
    id: string
    symbol: string
    name: string
    mintAddress: string
    source: string
    retrievedAt: string
  }
  lifecycleEvent: LifecycleEventJson
  referenceState?: ReferenceStateJson
  conversionSpec?: ConversionSpecJson
  transitionGap?: TransitionGapJson
  premium?: PremiumJson
  eventIntensity: EventIntensityJson
  transitionCurve: TransitionCurveJson
  liquidityPlan: LiquidityPlanJson
  dbcPlan: DbcPlanJson
  generatedAt: string
  algorithmVersion: string
  inputHash: string
  outputHash: string
}

export interface CompileResponse {
  plan: PlanJson
  dossier: Record<string, unknown>
}

export interface TransitionResponse {
  plan: PlanJson
  versions: { version: number; inputHash: string; outputHash: string }[]
}

export interface TradeResultJson {
  label: string
  side: string
  quoteNotional: string
  feePaid: string
  baseDelta: string
  avgPrice: string
  entryPrice: string
  exitPrice: string
  priceImpactBps: number
  referenceDeviationBps: number
  slippageBps: number
  curveProgress: number
}

export interface SimulationResultJson {
  configId: string
  provenance: string
  assumptions: string[]
  trades: TradeResultJson[]
  finalPrice: string
  totalQuoteConsumed: string
  totalFees: string
  netBase: string
  averageSlippageBps: number
  maxSlippageBps: number
  finalCurveProgress: number
  finalReferenceDeviationBps: number
  migrationReady: boolean
}

export interface ComparisonJson {
  baseline: SimulationResultJson
  auctra: SimulationResultJson
  deltas: {
    averageSlippageBps: number
    maxSlippageBps: number
    totalFees: string
    finalCurveProgress: number
    finalReferenceDeviationBps: number
    liquidityConcentration: number
  }
  note: string
}

export interface SimulationPlanJson {
  scenario: string
  sequenceId: string
  comparison: ComparisonJson
}

export interface SimulateResponse {
  simulationId: string
  simulation: SimulationPlanJson
}

export interface HealthResponse {
  application: string
  database: string
  solana: string
  prestocks: string
  pyth: string
}

export interface PoolResponse {
  pool: Record<string, unknown>
  snapshots?: unknown[]
  migration?: Record<string, unknown>
}

export interface ClockReadingJson {
  venue: string
  status: string
  label: string
  detail?: string
}

export interface ClockModelJson {
  asOf: string
  private: ClockReadingJson
  public: ClockReadingJson
  onchain: ClockReadingJson
  transition: ClockReadingJson
}

export interface SourceRecordJson {
  id: string
  sourceType: string
  url?: string
  retrievedAt: string
  contentHash?: string
  description: string
}

export interface ObservationJson {
  id: string
  assetSymbol: string
  feedId: string
  symbol: string
  price: string
  confidence: string
  exponent: number
  marketSession?: string
  freshness: string
  source: string
  publishTime: string
  retrievedAt: string
}

export interface LifecycleEventRecordJson {
  id: string
  assetId: string
  type: string
  title: string
  observedAt?: string
  announcedAt?: string
  effectiveAt?: string
  conversionDeadline?: string
  sourceType: string
  sourceUrl?: string
  confidence: string
  createdAt: string
}

export interface AuditResponse {
  assets: AssetRecord[]
  sources: SourceRecordJson[]
  events: LifecycleEventRecordJson[]
  observations: ObservationJson[]
}

export interface PoolSnapshotJson {
  poolAddress: string
  quoteReserve: string
  progress: string
  migrationReady: boolean
  observedAt: string
}

export interface PoolJson {
  address: string
  config: string
  baseMint: string
  quoteMint: string
  creationSignature?: string
  createdAt: string
  snapshots?: PoolSnapshotJson[]
}

export interface MonitorAssetJson {
  asset: AssetRecord
  state: string
  reference?: {
    feedId: string
    symbol: string
    price: string
    confidence: string
    marketSession?: string
    feedUpdateTimestamp?: string
    source: string
  }
  clocks: ClockModelJson
}

export interface MonitorResponse {
  asOf: string
  assets: MonitorAssetJson[]
  pools: PoolJson[]
}

export interface LabResponse {
  curve: TransitionCurveJson
  feePolicy: FeePolicyJson
  activation: ActivationJson
  liquidityPlan: LiquidityPlanJson
  dbcPlan: DbcPlanJson
  simulation: SimulationPlanJson
  validation?: { code: string; message: string }[]
}

export interface LabRequest {
  curveMode: 'REFERENCE_CENTERED' | 'TRANSITION_WIDE' | 'EVENT_ADAPTIVE'
  segments: number
  referencePrice: string
  referenceConfidenceBps?: string
  currentPremiumBps?: string
  eventIntensity: string
  targetLiquidity: string
  migrationQuoteThreshold: string
  quoteMint: string
  scenario?: string
}
