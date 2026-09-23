# Simulation

Source: `packages/domain/src/simulation/`, `apps/api` `/api/simulations` and
`/api/dbc/lab`.

Simulation answers: *for a given configuration and a given trade sequence, what
happens?* It is a controlled model, not a forecast, and every result is labelled
`SIMULATED`.

## Model

The curve is approximated as a **discrete liquidity ladder** over the
configuration's price points.

- Each segment `i` has quote depth `depth_i = migrationQuoteThreshold · weight_i`.
- Trading is **quote-denominated**, so `BUY` and `SELL` are symmetric and
  comparable across configurations.
- A `BUY` of quote `q` walks upward: the quote needed to reach the top of the
  current segment is `depth_i · (hi - price) / (hi - lo)`; base received is
  `take / midPrice`. A `SELL` mirrors downward.
- Fees are deducted from the notional before execution: `fee = notional · feeBps /
  10,000`.
- The full notional advances curve progress: `progress = Σ notional /
  migrationQuoteThreshold`.

Stated assumptions (returned with every result): the ladder is an approximation
of DBC, trades are quote-denominated, fees are taken from the notional, and no
external arbitrage, routing or extra on-chain slippage is modelled.

## Outputs

Per trade: `avgPrice`, `entryPrice`, `exitPrice`, `priceImpactBps`,
`referenceDeviationBps`, `slippageBps`, `feePaid`, `curveProgress`.
Per run: `finalPrice`, `totalQuoteConsumed`, `totalFees`, `netBase`,
`averageSlippageBps`, `maxSlippageBps`, `finalCurveProgress`,
`finalReferenceDeviationBps`, `migrationReady`.

## Scenarios (Section 37)

```text
NORMAL  IPO_ANNOUNCED  IPO_IMMINENT  PUBLIC_MARKET_OPENS  PUBLIC_MARKET_PRICE_GAP
HIGH_REFERENCE_UNCERTAINTY  CONVERSION_DEADLINE_APPROACHING  ACQUISITION_EVENT  NO_TARGET_ASSET
```

Each preset supplies a reference shock, reference confidence, an optional event
intensity, a baseline fee and a trade sequence. Scenarios are controlled
simulations; none is a prediction.

## Baseline comparison (Section 38)

Every run compares `BASELINE DBC` (uniform weights, preset fee) against
`AUCTRA DBC` using **identical trade sequences**, and reports:

```text
average slippage   max slippage   fees   curve progress
reference deviation   migration readiness   liquidity concentration
```

The comparison states "Measurements only… No winner is declared." It never ranks
the configurations.

## Historical replay (Section 39)

`replayTransition` classifies stored observations into `PRE_EVENT`, `EVENT` and
`POST_EVENT` relative to the event's effective time, attaches the derived
lifecycle state at each point, and labels provenance. Values that are not live
Pyth history are labelled `SIMULATED` or `MANUAL HISTORICAL INPUT`.

## Known limits

The simulator is a model of behaviour, not a bit-exact replica of the on-chain
program. It does not model pool account state, Token-2022 transfer fees, or
network effects between venues.
