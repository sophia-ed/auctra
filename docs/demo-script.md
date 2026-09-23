# Demo script

## 60-second script (Section 95)

> “This is Auctra.
>
> PreStocks made private-company exposure tradeable on Solana, but those assets
> don't live forever in exactly the same market state. A company can announce an
> IPO, acquisition, conversion or expiration event.
>
> Auctra turns that event into a lifecycle state. Here is the current PreStock
> data. Here is the external market reference from Pyth. Here is the difference
> between the current state and the transition state.
>
> Now Auctra compiles a liquidity policy. This is the resulting Meteora DBC
> configuration. And this is what happens when we run the same scenario against a
> conventional configuration.
>
> The important part isn't the dashboard. The important part is the transition
> engine underneath it.”

## Three-sentence pitch (Section 94)

> Auctra turns PreStock lifecycle events into executable liquidity plans.
>
> It combines PreStocks asset state, Pyth market/reference data and Meteora DBC
> configuration to model what a market needs when an asset moves from one
> lifecycle state to another.
>
> Instead of building another stock trading interface, Auctra builds the
> infrastructure around the moments when the underlying market changes.

## Judge walkthrough (Section 107)

1. Open `/` — the transition path and the three pillars.
2. `/assets` — choose a PreStock (e.g. SPACEX).
3. `/assets/SPACEX` — identity, prices, derived lifecycle, reference, clocks.
4. `/create` — select SPACEX, keep the default policy, compile.
5. `/transition/[id]` — Overview, Lifecycle, Reference, Conversion, Liquidity,
   Transition Curve, Meteora DBC, Simulation, Sources, Audit Trail.
6. Run the simulation; note that it reports measurements and declares no winner.
7. `/audit` — where each number came from.
8. `/demo` — the scripted run of the same pipeline.
9. `/case-studies/xai` — a published conversion ratio used honestly.

## Scripted demo (`/demo`)

The page runs the real pipeline and prints a status per step:

```text
01 Select PreStock                 -> SPACEX
02 Load PreStocks data             -> mark / token
03 Show lifecycle state            -> PUBLIC_TRANSITION
04 Load reference data             -> skipped (no Pyth feed for SpaceX)
05 Show market session + confidence-> skipped with reason
06 Build transition dossier        -> plan id
07 Generate transition gap         -> NOT COMPUTABLE (missing targetReference, conversionRatio)
08 Generate Transition Curve       -> EVENT_ADAPTIVE, 8 segments
09 Generate Meteora DBC config     -> fee schedule
10 Run baseline and Auctra sims    -> sequence id
11 Display measurable differences  -> comparison table
12 Show raw Meteora configuration  -> JSON
13 Prepare deployment              -> unsigned only
14 Verify transaction              -> requires wallet approval
```

Steps that cannot be satisfied are marked **skipped with the reason**, never
faked. The demo works without a wallet; connecting one only enables the
deployment panel.

## What to say about honesty

- The gap is `NOT COMPUTABLE` because SpaceX publishes no numeric ratio — that is
  the correct output, not a failure.
- Pyth reads `UNCONFIGURED` or `STALE` rather than `LIVE` when it cannot produce a
  live value.
- Plans are hash-addressed and append-only; recompiling creates a new plan.
