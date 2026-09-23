export { Decimal, dec, isDecimal, type DecimalInput } from './math/decimal'
export {
  BPS_DENOMINATOR,
  ZERO,
  ONE,
  ratioToBps,
  bpsToRatio,
  clampDecimal,
  clamp01,
} from './math/bps'
export { canonicalize, canonicalDecimal, sha256Hex, hashValue } from './math/hash'

export {
  LifecycleState,
  STATE_RANK,
  ALLOWED_TRANSITIONS,
  isTerminal,
  isAllowedTransition,
} from './lifecycle/states'
export {
  type LifecycleEvent,
  type LifecycleEventType,
  type SourceType,
  type DataQualityIssue,
  validateLifecycleEvent,
  normalizeLifecycleEvents,
} from './lifecycle/events'
export {
  type LifecycleConfig,
  type StateTransition,
  type LifecycleResult,
  DEFAULT_LIFECYCLE_CONFIG,
  eventTimeline,
  reduceLifecycle,
  deriveLifecycleState,
} from './lifecycle/machine'

export {
  type PremiumLabel,
  type PremiumInput,
  type PremiumResult,
  labelFor,
  computePremium,
} from './transition/premium'
export {
  type ConversionSpec,
  type ConversionInput,
  makeConversionSpec,
  conversionRatio,
  isConversionVerified,
  describeConversion,
  unknownConversion,
  CONVERSION_RATIO_UNKNOWN,
} from './transition/conversion'
export { type TransitionGap, type TransitionGapInput, computeTransitionGap } from './transition/gap'

export { type PolicyExplanation, explain } from './policy/explanation'
export {
  EVENT_SEVERITY,
  EVENT_INTENSITY_TAU_DAYS,
  UNCERTAINTY_SATURATION_BPS,
  type EventIntensityInput,
  type EventIntensityResult,
  computeEventIntensity,
} from './policy/intensity'
export {
  type CurveMode,
  type TransitionCurve,
  type TransitionCurveInput,
  type CurvePoint,
  CURVE_MODES,
  MAX_CURVE_SEGMENTS,
  MIN_CURVE_SEGMENTS,
  buildTransitionCurve,
} from './policy/curve'
export { type FeeMode, type DbcFeePolicy, type FeePolicyInput, computeFeePolicy } from './policy/fees'
export { type ActivationType, type ActivationPlan, type ActivationInput, computeActivation } from './policy/activation'
export { type Provenance, type SourcedValue, type LiquidityPlan, type LiquidityPlanInput, buildLiquidityPlan } from './policy/liquidity'
export { type DbcPlan, type DbcPlanInput, buildDbcPlan } from './policy/dbc'
export {
  type SourceRecord,
  type SourceRecordInput,
  type SourceRecordType,
  makeSourceRecord,
} from './provenance/source'
export { SourceRegistry, SourceConflictError } from './provenance/registry'

export {
  type Scenario,
  type SimulationCurve,
  type SimulationConfig,
  type TradeInstruction,
  type TradeSequence,
  type TradeResult,
  type SimulationResult,
  type BaselineComparison,
  SCENARIOS,
} from './simulation/types'
export {
  SIMULATION_ASSUMPTIONS,
  simulateSequence,
  compareToBaseline,
} from './simulation/engine'
export { type ScenarioPreset, getScenarioPreset, listScenarioPresets } from './simulation/scenarios'

export {
  type MarketSession,
  type Freshness,
  type AssetReference,
  type ReferenceState,
  type SimulationPlan,
  type TransitionPlan,
} from './plan/types'
export {
  ALGORITHM_VERSION,
  type CompileInput,
  type CompileLiquidityInput,
  compileTransitionPlan,
  recomputeOutputHash,
  recompileInputHash,
} from './plan/compile'
