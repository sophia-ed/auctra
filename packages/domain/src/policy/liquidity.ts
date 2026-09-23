import { Decimal, dec, type DecimalInput } from '../math/decimal'
import type { TransitionCurve } from './curve'
import type { DbcFeePolicy } from './fees'
import type { ActivationPlan } from './activation'
import { explain, type PolicyExplanation } from './explanation'

/**
 * Provenance classes (AUCTRA.md Section 21). Every value in a liquidity plan
 * must declare which of these it is.
 */
export type Provenance = 'OBSERVED' | 'CALCULATED' | 'SIMULATED' | 'PROPOSED'

export interface SourcedValue<T> {
  value: T
  provenance: Provenance
  source?: string
  note?: string
}

export interface LiquidityPlan {
  concentration: SourcedValue<number>
  initialCurveWidth: SourcedValue<number>
  feeProfile: SourcedValue<DbcFeePolicy>
  activation: SourcedValue<ActivationPlan>
  migrationThreshold: SourcedValue<Decimal>
  expectedCurveProgression: SourcedValue<{ quoteCumulative: Decimal[]; weightCumulative: Decimal[] }>
  currentObservedLiquidity?: SourcedValue<Decimal>
  targetLiquidity: SourcedValue<Decimal>
  liquidityGap?: SourcedValue<Decimal>
  explanation: PolicyExplanation[]
}

export interface LiquidityPlanInput {
  curve: TransitionCurve
  feePolicy: DbcFeePolicy
  activation: ActivationPlan
  migrationQuoteThreshold: DecimalInput
  targetLiquidity: DecimalInput
  currentObservedLiquidity?: DecimalInput
  observedSource?: string
}

export function buildLiquidityPlan(input: LiquidityPlanInput): LiquidityPlan {
  const migrationQuoteThreshold = dec(input.migrationQuoteThreshold)
  const targetLiquidity = dec(input.targetLiquidity)

  const hhi = input.curve.points.reduce(
    (sum, point) => sum.plus(point.weight.times(point.weight)),
    new Decimal(0),
  )

  let quoteCumulative = new Decimal(0)
  let weightCumulative = new Decimal(0)
  const quoteCumulativeArr: Decimal[] = []
  const weightCumulativeArr: Decimal[] = []
  for (const point of input.curve.points) {
    quoteCumulative = quoteCumulative.plus(point.liquidity)
    weightCumulative = weightCumulative.plus(point.weight)
    quoteCumulativeArr.push(quoteCumulative)
    weightCumulativeArr.push(weightCumulative)
  }

  const currentObservedLiquidity =
    input.currentObservedLiquidity === undefined
      ? undefined
      : {
          value: dec(input.currentObservedLiquidity),
          provenance: 'OBSERVED' as const,
          source: input.observedSource,
        }

  const liquidityGap =
    currentObservedLiquidity === undefined
      ? undefined
      : {
          value: targetLiquidity.minus(currentObservedLiquidity.value),
          provenance: 'CALCULATED' as const,
          note: 'target liquidity minus observed liquidity; a MODEL quantity, not a market fact',
        }

  return {
    concentration: {
      value: hhi.toNumber(),
      provenance: 'CALCULATED',
      note: 'Herfindahl index over normalized segment weights (1 = fully concentrated)',
    },
    initialCurveWidth: {
      value: input.curve.spread.times(2).toNumber(),
      provenance: 'CALCULATED',
      note: 'total log-space width of the transition curve',
    },
    feeProfile: { value: input.feePolicy, provenance: 'PROPOSED', note: input.feePolicy.reason },
    activation: { value: input.activation, provenance: 'PROPOSED', note: input.activation.reason },
    migrationThreshold: {
      value: migrationQuoteThreshold,
      provenance: 'PROPOSED',
      note: 'DBC migrationQuoteThreshold; the protocol migrates when this quote balance is reached',
    },
    expectedCurveProgression: {
      value: { quoteCumulative: quoteCumulativeArr, weightCumulative: weightCumulativeArr },
      provenance: 'CALCULATED',
      note: 'cumulative liquidity and weight across segments; simulation replaces this with a trade path',
    },
    currentObservedLiquidity,
    targetLiquidity: { value: targetLiquidity, provenance: 'PROPOSED' },
    liquidityGap,
    explanation: [
      explain(
        'normalized segment weights',
        'distribute liquidity across the transition curve',
        `HHI concentration ${hhi.toFixed(4)}`,
      ),
      explain(
        `curve spread ${input.curve.spread.toFixed(4)}`,
        'sets the initial curve width',
        `${input.curve.spread.times(2).toFixed(4)} log width`,
      ),
      explain(
        'migration quote threshold',
        'sets the protocol migration condition (separate from Auctra advice)',
        migrationQuoteThreshold.toString(),
      ),
      ...(liquidityGap
        ? [explain('observed vs target liquidity', 'measures the liquidity gap', liquidityGap.value.toString())]
        : [explain('observed liquidity unavailable', 'gap not computed', 'NOT COMPUTABLE')]),
    ],
  }
}
