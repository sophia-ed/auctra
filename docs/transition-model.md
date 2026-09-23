# Transition model

Source: `packages/domain/src/transition/`, `packages/domain/src/plan/`.

## Premium / discount (Section 7)

```text
tokenPremiumBps     = (tokenPrice - markPrice) / markPrice * 10,000
valuationPremiumBps = (impliedValuation - markValuation) / markValuation * 10,000
```

Labelled `MARK PREMIUM`, `MARK DISCOUNT` or `AT_MARK`. The word *mispricing* is
not used; the metric is a deviation, not a verdict.

## Conversion specification (Section 19)

```ts
type ConversionSpec = {
  sourceAssetMint, targetAssetMint,
  ratioNumerator, ratioDenominator,
  effectiveAt?, deadline?,
  sourceUrl, verifiedAt
}
```

A conversion is verified only when both mints, a positive ratio, a source URL and
a verification timestamp are present. Without one it is `UNKNOWN`, and the user
is told to provide a verified source.

## Transition gap (Section 18)

```text
impliedTargetValue = sourceReference * conversionRatio
absoluteGap        = impliedTargetValue - targetReference
gapBps             = absoluteGap / targetReference * 10,000
```

If the target reference or the conversion ratio is missing, the result is
`NOT COMPUTABLE` and lists exactly what is missing. No value is fabricated. The
caller supplies a `sourceReference` already normalised into the target's units;
the transformation is always shown.

## Reference comparison (Section 52)

A PreStock value is never compared directly to a public reference. A verified
conversion is required first, and the transformation is displayed:

```text
PreStock unit × conversion ratio = normalized target units   vs   Pyth reference
```

Without it the comparison is `UNAVAILABLE`.

## Transition plan (Section 20)

```ts
type TransitionPlan = {
  id, sourceAsset, lifecycleEvent, currentState,
  referenceState?, conversionSpec?, transitionGap?,
  premium?, eventIntensity, transitionCurve,
  liquidityPlan, dbcPlan, simulationPlan?,
  generatedAt, algorithmVersion, inputHash, outputHash
}
```

Plans are immutable. Recompiling with different inputs produces a new plan; the
repository rejects an attempt to overwrite a plan id with different content
(`PlanImmutabilityError`).

## Reproducibility (Section 47)

`canonicalize` sorts object keys, omits `undefined`, and emits numbers and
`Decimal`s as fixed-scale (18 dp) strings. `hashValue` is SHA-256 over that
canonical form. `recomputeOutputHash` re-derives a plan's `outputHash` from the
plan itself, which the tests assert.
