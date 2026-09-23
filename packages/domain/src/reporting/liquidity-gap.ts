import { Decimal, dec, type DecimalInput } from '../math/decimal'

/**
 * Liquidity gap view (AUCTRA.md Section 53).
 *
 * Anything modelled rather than observed is marked MODEL. An unobserved current
 * liquidity is shown as UNKNOWN, never assumed to be zero.
 */
export type DepthClass = 'OBSERVED' | 'MODEL' | 'UNKNOWN'

export interface LiquidityGapView {
  current: { value: string; valueClass: DepthClass; source?: string }
  target: { value: string; valueClass: DepthClass }
  gap: { value: string; valueClass: DepthClass; direction: 'SURPLUS' | 'SHORTFALL' | 'BALANCED' }
  note: string
}

export interface LiquidityGapInput {
  targetLiquidity: DecimalInput
  currentObservedLiquidity?: DecimalInput
  observedSource?: string
  targetIsModel?: boolean
}

export function buildLiquidityGap(input: LiquidityGapInput): LiquidityGapView {
  const target = dec(input.targetLiquidity)
  const targetClass: DepthClass = input.targetIsModel === false ? 'OBSERVED' : 'MODEL'

  if (input.currentObservedLiquidity === undefined) {
    return {
      current: { value: 'UNKNOWN', valueClass: 'UNKNOWN' },
      target: { value: target.toString(), valueClass: targetClass },
      gap: { value: 'NOT COMPUTABLE', valueClass: 'UNKNOWN', direction: 'BALANCED' },
      note: 'current liquidity was not observed; the gap cannot be computed without fabricating depth',
    }
  }

  const current = dec(input.currentObservedLiquidity)
  const gap = target.minus(current)
  const direction = gap.gt(0) ? 'SHORTFALL' : gap.lt(0) ? 'SURPLUS' : 'BALANCED'

  return {
    current: { value: current.toString(), valueClass: 'OBSERVED', source: input.observedSource },
    target: { value: target.toString(), valueClass: targetClass },
    gap: { value: gap.toString(), valueClass: 'MODEL', direction },
    note: 'target liquidity is a plan quantity; the gap is modelled, not a market fact',
  }
}
