# Auctra — Technical Paper

Algorithm version **1.0.0**. All quantities are computed with fixed-precision
decimal arithmetic (`decimal.js`, 40 significant digits) and canonicalised before
hashing.

## Abstract

Auctra converts the lifecycle state of a tokenized private-market asset into a
deterministic, inspectable liquidity policy and a proposed Meteora DBC
configuration. It composes three externally controlled inputs — the PreStocks
asset registry and issuer disclosures, a Pyth market reference, and Meteora's
bonding-curve parameters — into a single artifact, the *transition plan*, whose
inputs and outputs are content-addressed so any result can be reproduced and
audited. The contribution is not a new price model; it is a pipeline that keeps
transition state, market state and liquidity configuration in one reproducible
structure and refuses to produce numbers when its inputs are missing.

## 1. Problem

A tokenized private-company asset may exist for years before the underlying
company changes state. The information needed to reason about that change is
fragmented: token metadata in one place, issuer disclosures in another, external
market state in a third, and liquidity configuration in a fourth. There is no
standard object that answers *what liquidity does this market need as it changes
state, and where did every number come from?*

## 2. Market lifecycle model

An asset has a derived state `s ∈ S`:

```text
S = { PRIVATE_ACTIVE, EVENT_ANNOUNCED, CONVERSION_OPEN, PUBLIC_TRANSITION,
      POST_EVENT, EXPIRING, EXPIRED, UNKNOWN }
```

State is a pure function of stored events `E` and an evaluation instant `t`:

```text
s(t) = Reduce(E, t)
```

Each event `e` carries `type`, `announcedAt`, `effectiveAt`, `conversionDeadline`,
`observedAt`, `sourceType` and `confidence ∈ [0,1]`. `Reduce` expands each event
into a timeline, sorts by timestamp and, at equal timestamps, by ascending state
rank, then emits a transition whenever the state changes.

Two windows are explicit: `expiringWindowSeconds` (default 7 days) and
`postEventDelaySeconds` (default 30 days). Because `t` is an explicit argument,
`Reduce` is deterministic and testable.

**Observation anchoring.** Issuers may publish a deadline without an announcement
or effective date. Rather than invent one, `observedAt` records when the
disclosure was seen and is used as a labelled anchor, capped to the start of the
expiring window so the derived chain cannot run backwards. Data-quality issues
(`ANNOUNCEMENT_TIME_OBSERVED`, `TIME_OBSERVED`) mark every such timestamp.

## 3. Transition state machine

The allowed-transition graph is `A : S → 2^S`. The reducer asserts
`newState ∈ A(previousState)` and reports `IMPLAUSIBLE_TRANSITION` otherwise. Each
emitted transition is the tuple

```text
(previousState, newState, timestamp, reason, source)
```

## 4. Reference data model

An external reference observation is

```text
r = (feedId, symbol, price p, confidence c, exponent x, marketSession, publishTime, feedUpdateTimestamp)
```

with `p = mantissa × 10^x`. Two derived quantities:

```text
confidenceBps = c / p × 10,000
age           = now − feedUpdateTimestamp
```

`age` uses the **feed update** timestamp, not the receipt time, so a
carried-forward price is not mistaken for a fresh one. Freshness is classified
`FRESH` (< 60 s), `AGING` (< 300 s), `STALE`, or `UNKNOWN`.

## 5. Transition gap

Given a source reference `v_s` (the PreStock token value), a conversion ratio `ρ`
and a target reference `v_t`:

```text
impliedTargetValue = v_s · ρ
absoluteGap        = impliedTargetValue − v_t
gapBps             = absoluteGap / v_t × 10,000
```

If `v_t` or `ρ` is undefined, or either is non-positive, the result is
`NOT COMPUTABLE` with the missing inputs listed. A direct comparison of a
PreStock value against a public reference is `UNAVAILABLE` until `ρ` is verified;
the transformation `v_s · ρ = normalized` is always displayed.

## 6. Transition Curve

The curve is a deterministic map from a reference price `P`, a spread `w`, a
segment count `n` and an intensity `κ ∈ [0,1]` to prices and normalised weights:

```text
u_i         = (i − (n−1)/2) · (2w/(n−1)),          i = 0…n−1
P_i         = P · exp(u_i)
d_i         = |ln(P_i / P)|
raw_i       = exp(−d_i / B)                         B = bandwidth
α_i         = 1                                     (REFERENCE_CENTERED, TRANSITION_WIDE)
α_i         = clamp(1 + κ·0.5·δ·σ_i·(d_i/w), 0.1, 10)   (EVENT_ADAPTIVE)
wgt_i       = raw_i · α_i / Σ_j (raw_j · α_j)
L_i         = L · wgt_i                             L = liquidity target
```

where `δ = sign(premium)` orients the skew and `σ_i = sign(P_i − P)`. Bandwidth
`B` is `w/2`, `w/1.2`, or `w/(1 + 2κ)` by mode. Spread widens with reference
uncertainty: `w = w_base · (1 + 0.5·min(confBps/100, 1))`.

Properties (asserted in tests): `P_i` strictly increasing, `wgt_i > 0`,
`Σ wgt_i = 1`, and `P` within `[P_0, P_{n−1}]`.

## 7. Liquidity weighting

Weights map directly onto Meteora's `buildCurveWithLiquidityWeights`, which
accepts at most 16 weights. Auctra also exposes a relative scale
(`wgt_i · n`, mean 1) but flags the exact SDK scale as unconfirmed pending
inspection of the installed package. Concentration is reported as the Herfindahl
index `H = Σ wgt_i² ∈ (0,1]`.

## 8. Fee policy

With `κ` the event intensity and `γ = min(confBps/100, 1)`:

```text
startBps = clamp(60 + 300κ + 120γ, 10, 1000)
endBps   = clamp(startBps · (0.3 + 0.2(1 − κ)), 10, 1000)
mode     = exponential if κ > 0.6 else linear
duration = clamp(timeToDeadline or 3 days, 1 hour, 30 days)
```

Only supported fee-scheduler modes are emitted; the deprecated RateLimiter mode
is never used for a new configuration.

## 9. Event intensity

```text
timeFactor        = 1 / (1 + days/30),   days = secondsToDeadline/86400
uncertaintyFactor = min(confBps/100, 1)
base              = 0.55·severity + 0.25·confidence + 0.20·uncertaintyFactor
κ                 = clamp(base · (0.5 + 0.5·timeFactor), 0, 1)
```

`severity` is a per-type constant. With no deadline, `timeFactor = 0.5`. `κ` is
an internal policy variable; it is never labelled predicted volatility.

## 10. Meteora implementation

The adapter produces, for a plan: curve mode, segments, normalised and relative
weights, the fee schedule, activation type and point, quote mint, migration
option (`MET_DAMM_V2`), collect-fee mode, token type and the migration quote
threshold. Validation enforces the recorded constraints (segments ≤ 16, ascending
positive prices, normalised weights, threshold > 0, fee bounds, decimals 6–9).
Transactions are returned unsigned; the browser wallet signs and submits. The
migration threshold is a permissionless protocol condition, kept separate from
the Auctra recommendation.

## 11. Simulation methodology

The curve is approximated as a discrete liquidity ladder with per-segment quote
depth `depth_i = threshold · wgt_i`. Trades are quote-denominated; a `BUY`
traverses upward, a `SELL` downward, with

```text
quoteToTraverse_i = depth_i · (boundary − price)/(hi − lo)
baseDelta         = take / midPrice
fee               = notional · feeBps/10,000
progress          = Σ notional / threshold
```

Runs compare `BASELINE DBC` (uniform weights) with `AUCTRA DBC` under identical
trade sequences and report slippage, fees, progress, reference deviation and
concentration. No winner is declared.

## 12. Reproducibility

Inputs are canonicalised — object keys sorted, `undefined` omitted, numbers and
`Decimal`s rendered at fixed 18-decimal scale, timestamps in ISO UTC — and hashed:

```text
inputHash  = SHA256(canonical(inputs))
outputHash = SHA256(canonical(outputs) ‖ inputHash)
id         = "tp_" ‖ inputHash[0..16]
```

The same input therefore yields the same plan id, hashes and policy. Plans are
append-only; a plan id cannot be overwritten with different content.

## 13. Failure modes

| Failure | Behaviour |
|---|---|
| PreStocks unavailable | cache returns the last verified snapshot, flagged `stale`; never empty |
| Pyth key absent | reference `UNCONFIGURED`; observation requests return an actionable error |
| No feed for an asset | gap `NOT COMPUTABLE`; comparison `UNAVAILABLE` |
| Missing conversion ratio | gap `NOT COMPUTABLE` with the missing inputs listed |
| Meteora SDK absent | `/api/dbc/prepare` returns `503`; no transaction is invented |
| Wallet rejects | the panel surfaces the error; nothing is submitted |
| Invalid input | `400` with structured issues; no stack traces |

## 14. Limitations

See [`limitations.md`](./limitations.md). In brief: the SDK is not installed and
two Meteora constants are unconfirmed; only three PreStocks have a Pyth
reference; the simulator is an approximation; Postgres repositories are tested
against an emulator.

## 15. Future work

Issuer dashboards, corporate-action ingestion, conversion monitoring,
market-state alerts, liquidity-planning templates, historical transition
analytics, and additional protocol integrations. None of these is currently live.
