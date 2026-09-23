import { Decimal, dec } from '../math/decimal'
import { ratioToBps } from '../math/bps'
import type {
  BaselineComparison,
  SimulationConfig,
  SimulationResult,
  TradeInstruction,
  TradeResult,
  TradeSequence,
} from './types'

export const SIMULATION_ASSUMPTIONS: readonly string[] = [
  'Simulated, not observed: these are modelled outcomes of a controlled scenario, not predictions.',
  'The curve is approximated as a discrete liquidity ladder over the configuration price points.',
  'Trades are quote-denominated, so BUY and SELL are symmetric and comparable across configurations.',
  'The full trade notional advances curve progress; fees are deducted from the notional before execution.',
  'No external arbitrage, no cross-venue routing, and no on-chain slippage beyond the model are assumed.',
]

interface CurveLadder {
  /** length n+1: the n segment lows plus a terminal high */
  prices: Decimal[]
  /** length n: quote depth of each segment */
  bandDepth: Decimal[]
  referencePrice: Decimal
}

interface SimState {
  price: Decimal
  cumulativeQuote: Decimal
  cumulativeFees: Decimal
  netBase: Decimal
}

function buildLadder(config: SimulationConfig): CurveLadder {
  const prices = config.curve.pricePoints
  const weights = config.curve.weights
  if (prices.length !== weights.length) {
    throw new Error('simulate: pricePoints and weights must have equal length')
  }
  if (prices.length < 2) throw new Error('simulate: at least two price points are required')
  for (let i = 1; i < prices.length; i += 1) {
    if (!prices[i].gt(prices[i - 1])) {
      throw new Error('simulate: price points must be strictly ascending')
    }
  }
  const weightSum = weights.reduce((sum, weight) => sum.plus(weight), new Decimal(0))
  if (!weightSum.isPositive()) throw new Error('simulate: weights must be positive')

  const firstLog = prices[0].ln()
  const lastLog = prices[prices.length - 1].ln()
  const step = lastLog.minus(firstLog).div(prices.length - 1)
  const terminal = prices[prices.length - 1].times(step.exp())

  return {
    prices: [...prices, terminal],
    bandDepth: weights.map((weight) => config.migrationQuoteThreshold.times(weight.div(weightSum))),
    referencePrice: config.referencePrice,
  }
}

/** Index of the segment containing `price`: highest i with prices[i] <= price < prices[i+1]. */
function initialBand(ladder: CurveLadder, price: Decimal): number {
  const bands = ladder.bandDepth.length
  for (let i = 0; i < bands; i += 1) {
    if (price.lt(ladder.prices[i + 1])) return i
  }
  return bands - 1
}

interface SideOutcome {
  baseDelta: Decimal
  exitPrice: Decimal
}

function simulateSide(
  ladder: CurveLadder,
  startPrice: Decimal,
  side: 'BUY' | 'SELL',
  effectiveQuote: Decimal,
): SideOutcome {
  const bands = ladder.bandDepth.length
  let currentPrice = startPrice
  let remaining = effectiveQuote
  let baseDelta = new Decimal(0)
  let band = initialBand(ladder, currentPrice)

  for (let guard = 0; guard < bands + 8 && remaining.gt(0); guard += 1) {
    if (band < 0 || band >= bands) {
      // Ran off the end of the ladder: execute the remainder at the boundary price.
      const boundary = band < 0 ? ladder.prices[0] : ladder.prices[bands]
      const delta = remaining.div(boundary)
      baseDelta = baseDelta.plus(side === 'BUY' ? delta : delta.neg())
      currentPrice = boundary
      remaining = new Decimal(0)
      break
    }

    const lo = ladder.prices[band]
    const hi = ladder.prices[band + 1]
    const width = hi.minus(lo)
    const depth = ladder.bandDepth[band]

    if (!width.isPositive() || !depth.isPositive()) {
      band += side === 'BUY' ? 1 : -1
      currentPrice = side === 'BUY' ? hi : lo
      continue
    }

    if (side === 'BUY') {
      if (currentPrice.gte(hi)) {
        band += 1
        currentPrice = hi
        continue
      }
      const toTraverse = depth.times(hi.minus(currentPrice)).div(width)
      if (remaining.gte(toTraverse)) {
        baseDelta = baseDelta.plus(toTraverse.div(currentPrice.plus(hi).div(2)))
        remaining = remaining.minus(toTraverse)
        currentPrice = hi
        band += 1
      } else {
        const exitPrice = currentPrice.plus(remaining.div(toTraverse).times(hi.minus(currentPrice)))
        baseDelta = baseDelta.plus(remaining.div(currentPrice.plus(exitPrice).div(2)))
        currentPrice = exitPrice
        remaining = new Decimal(0)
      }
    } else {
      if (currentPrice.lte(lo)) {
        band -= 1
        currentPrice = lo
        continue
      }
      const toTraverse = depth.times(currentPrice.minus(lo)).div(width)
      if (remaining.gte(toTraverse)) {
        baseDelta = baseDelta.minus(toTraverse.div(currentPrice.plus(lo).div(2)))
        remaining = remaining.minus(toTraverse)
        currentPrice = lo
        band -= 1
      } else {
        const exitPrice = currentPrice.minus(remaining.div(toTraverse).times(currentPrice.minus(lo)))
        baseDelta = baseDelta.minus(remaining.div(currentPrice.plus(exitPrice).div(2)))
        currentPrice = exitPrice
        remaining = new Decimal(0)
      }
    }
  }

  return { baseDelta, exitPrice: currentPrice }
}

function simulateInstruction(
  config: SimulationConfig,
  ladder: CurveLadder,
  state: SimState,
  instruction: TradeInstruction,
): { next: SimState; result: TradeResult } {
  const notional = dec(instruction.quoteAmount)
  if (!notional.isPositive()) throw new Error('simulate: trade notional must be positive')

  const fee = notional.times(config.feeBps).div(10000)
  const effective = notional.minus(fee)
  const entryPrice = state.price

  const { baseDelta, exitPrice } = simulateSide(ladder, state.price, instruction.side, effective)

  const cumulativeQuote = state.cumulativeQuote.plus(notional)
  const cumulativeFees = state.cumulativeFees.plus(fee)
  const netBase = state.netBase.plus(baseDelta)

  const reference = ladder.referencePrice
  const absoluteBase = baseDelta.abs()
  const avgPrice = absoluteBase.isZero() ? new Decimal(0) : notional.div(absoluteBase)
  const slippageBps = avgPrice.isZero()
    ? 0
    : ratioToBps(avgPrice.minus(reference), reference).abs().toNumber()
  const priceImpactBps = ratioToBps(exitPrice.minus(entryPrice), entryPrice).toNumber()
  const referenceDeviationBps = ratioToBps(exitPrice.minus(reference), reference).toNumber()

  const result: TradeResult = {
    label: instruction.label ?? instruction.side,
    side: instruction.side,
    quoteNotional: notional,
    feePaid: fee,
    baseDelta,
    avgPrice,
    entryPrice,
    exitPrice,
    priceImpactBps,
    referenceDeviationBps,
    slippageBps,
    curveProgress: cumulativeQuote.div(config.migrationQuoteThreshold).toNumber(),
  }

  return {
    next: { price: exitPrice, cumulativeQuote, cumulativeFees, netBase },
    result,
  }
}

export function simulateSequence(config: SimulationConfig, sequence: TradeSequence): SimulationResult {
  const ladder = buildLadder(config)
  let state: SimState = {
    price: config.referencePrice,
    cumulativeQuote: new Decimal(0),
    cumulativeFees: new Decimal(0),
    netBase: new Decimal(0),
  }
  const trades: TradeResult[] = []

  for (const instruction of sequence.instructions) {
    const step = simulateInstruction(config, ladder, state, instruction)
    state = step.next
    trades.push(step.result)
  }

  const slippages = trades.map((trade) => trade.slippageBps)
  const averageSlippageBps =
    slippages.length === 0 ? 0 : slippages.reduce((sum, value) => sum + value, 0) / slippages.length
  const maxSlippageBps = slippages.length === 0 ? 0 : Math.max(...slippages)
  const finalCurveProgress = state.cumulativeQuote.div(config.migrationQuoteThreshold).toNumber()
  const finalReferenceDeviationBps = ratioToBps(
    state.price.minus(ladder.referencePrice),
    ladder.referencePrice,
  ).toNumber()

  return {
    configId: config.id,
    provenance: 'SIMULATED',
    assumptions: [...SIMULATION_ASSUMPTIONS],
    trades,
    finalPrice: state.price,
    totalQuoteConsumed: state.cumulativeQuote,
    totalFees: state.cumulativeFees,
    netBase: state.netBase,
    averageSlippageBps,
    maxSlippageBps,
    finalCurveProgress,
    finalReferenceDeviationBps,
    migrationReady: state.cumulativeQuote.gte(config.migrationQuoteThreshold),
  }
}

/**
 * Baseline vs Auctra comparison (AUCTRA.md Section 38).
 * Identical trade sequences; measurements only, no winner declared.
 */
export function compareToBaseline(
  auctraConfig: SimulationConfig,
  baselineConfig: SimulationConfig,
  sequence: TradeSequence,
): BaselineComparison {
  const auctra = simulateSequence(auctraConfig, sequence)
  const baseline = simulateSequence(baselineConfig, sequence)

  const concentration = (weights: Decimal[]): number =>
    weights.reduce((sum, weight) => sum + weight.toNumber() ** 2, 0)

  return {
    baseline,
    auctra,
    deltas: {
      averageSlippageBps: auctra.averageSlippageBps - baseline.averageSlippageBps,
      maxSlippageBps: auctra.maxSlippageBps - baseline.maxSlippageBps,
      totalFees: auctra.totalFees.minus(baseline.totalFees).toFixed(6),
      finalCurveProgress: auctra.finalCurveProgress - baseline.finalCurveProgress,
      finalReferenceDeviationBps:
        auctra.finalReferenceDeviationBps - baseline.finalReferenceDeviationBps,
      liquidityConcentration:
        concentration(auctraConfig.curve.weights) - concentration(baselineConfig.curve.weights),
    },
    note: 'Measurements only. Identical trade sequences across both configurations. No winner is declared.',
  }
}
