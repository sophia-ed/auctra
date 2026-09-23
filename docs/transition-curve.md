# Transition Curve

Source: `packages/domain/src/policy/curve.ts`.

The Transition Curve describes **how liquidity should be distributed around a
transition reference**. It is a DBC configuration policy. It is not a price peg,
not a guaranteed fair value, not an oracle-enforced corridor, and not a
prediction of a future stock price.

## Inputs

```text
referencePrice          referenceConfidenceBps
currentPremiumBps       eventIntensity (0..1)
mode                    segments (2..16)
liquidityTarget         spreadOverride? / bandwidthOverride?
```

## Modes

| Mode | Base log-spread | Bandwidth |
|---|---|---|
| `REFERENCE_CENTERED` | 0.25 | `spread / 2` |
| `TRANSITION_WIDE` | 0.60 | `spread / 1.2` |
| `EVENT_ADAPTIVE` | `0.25 + 0.35 · intensity` | `spread / (1 + 2 · intensity)` |

Uncertainty widens the band: `spread = base · (1 + 0.5 · min(confBps/100, 1))`.
All values are clamped to sane ranges.

## Mathematics (Section 25)

For segment `i`:

```text
u_i         = (i - (n-1)/2) · (2·spread/(n-1))
price_i     = referencePrice · exp(u_i)
distance_i  = |ln(price_i / referencePrice)|
rawWeight_i = exp(-distance_i / bandwidth)
```

Adaptive skew (only in `EVENT_ADAPTIVE`), oriented by the current premium:

```text
sign_i          = +1 if price_i > referencePrice else -1
direction       = +1 if currentPremiumBps >= 0 else -1
adaptiveFactor_i= clamp(1 + intensity · 0.5 · direction · sign_i · (distance_i/spread), 0.1, 10)
adjustedWeight_i= rawWeight_i · adaptiveFactor_i
weight_i        = adjustedWeight_i / Σ adjustedWeight
liquidity_i     = liquidityTarget · weight_i
```

Properties asserted by tests: prices strictly ascending, weights strictly
positive, weights sum to 1, reference inside the range, all outputs deterministic,
segments clamped to the DBC maximum of 16.

## Event intensity (Section 26)

```text
severity            = per event type (IPO 0.9, ACQUISITION 0.85, MERGER 0.8,
                      CONVERSION 0.7, EXPIRATION 0.6, CORPORATE_ACTION 0.5, CUSTOM 0.4)
confidenceFactor    = event confidence (0..1)
timeFactor          = 1 / (1 + days / 30)      days = secondsToDeadline / 86400
uncertaintyFactor   = min(confidenceBps / 100, 1)
base                = 0.55·severity + 0.25·confidenceFactor + 0.20·uncertaintyFactor
intensity           = clamp(base · (0.5 + 0.5·timeFactor), 0, 1)
```

With no deadline, `timeFactor` is neutral (0.5). The output is an **internal
policy variable**, never labelled "predicted volatility".

## Fee policy (Section 27)

```text
startingFeeBps = clamp(60 + 300·intensity + 120·confNorm, 10, 1000)
endingFeeBps   = clamp(startingFeeBps · (0.3 + 0.2·(1-intensity)), 10, 1000)
mode           = exponential if intensity > 0.6, else linear
durationSeconds= clamp(timeToDeadline or 3 days, 1 hour, 30 days)
```

Only the currently supported fee-scheduler modes are used. RateLimiter is
deprecated for new DBC configs and is never emitted.

## Activation (Section 28)

`IMMEDIATE`, `SCHEDULED` or `EVENT_RELATIVE`, mapped to Meteora timestamp
activation. Auctra generates a configuration at creation time; a later lifecycle
update produces a **new** plan and a new proposed configuration. It never
silently mutates an existing DBC config.

## Explanation

Every stage emits structured `INPUT → EFFECT → OUTPUT` metadata
(`packages/domain/src/policy/explanation.ts`), generated from the policy values —
never from a language model.
