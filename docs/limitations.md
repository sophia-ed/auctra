# Limitations

This list is deliberately specific. Where a capability depends on something not
present in this build, it is stated rather than implied.

## Protocol and SDK

- **The Meteora DBC SDK (1.5.12) is installed and fully wired.** The version
  guard checks the real installed package, the curve builder
  (`buildCurveWithLiquidityWeights`) is used directly, and `createSdkBackedClient`
  constructs the real `DynamicBondingCurveClient`. `/api/dbc/prepare` returns a
  genuine **unsigned** devnet transaction (verified: ~1.4 KB with a real
  blockhash). It defaults to devnet, so it cannot reach mainnet by accident.
- **The fee denominator and program id are confirmed**: the installed SDK exports
  `FEE_DENOMINATOR = 1000000000` and `MAX_CURVE_POINT = 16`, and the developer
  guide confirms the program id `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`
  (same on mainnet and devnet). The fee-scheduler period units and the exact
  `liquidityWeights` scale remain SDK-verified rather than documented.
- **The SDK's curve builder always produces 16 segments** and requires leftover
  token headroom; Auctra resamples its policy weights onto 16 and exposes
  `leftover` explicitly. Its validator also requires ≥10% locked liquidity at day
  1, which the generated `liquidityDistribution` satisfies.
- **No DBC pool has been deployed.** The pool explorer therefore has nothing to
  show until a wallet-signed deployment happens; it reads from the chain when it
  can and returns an honest empty state otherwise.

## Data

- **The PreStocks API carries no lifecycle fields.** Lifecycle evidence comes from
  the official asset pages, parsed and stored with its source. Issuer announcement
  and effective dates are not published, so Auctra anchors on an explicitly
  labelled observation time.
- **Only 3 of 8 current PreStocks have a Pyth reference** (OPENAI, ANTHROPIC,
  SPCX). For the rest, the transition gap is `NOT COMPUTABLE` and the comparison
  is `UNAVAILABLE`.
- **Live Pyth updates require an API key.** With `PYTH_API_KEY` set, Auctra uses
  Pyth Pro (Lazer), which returns market session, feed-update timestamp and
  publisher count. Without a key it falls back to Hermes Core's keyless discovery
  and reports the reference as unavailable. One Pyth Terminal key covers both.
- **SpaceX has no published numeric conversion ratio** (swap-or-expire), so its
  gap cannot be computed. The xAI ratio (`0.7165`) is published and is used as the
  worked example.

## Model

- The simulator is a **discrete liquidity-ladder approximation**, not a bit-exact
  replica of the on-chain program. It does not model pool account state,
  Token-2022 transfer fees, or cross-venue effects.
- The Transition Curve and event intensity are **policy choices** with documented
  formulas. They are not derived from, and do not predict, future prices.
- Fee, spread and bandwidth constants are reasoned defaults, not protocol
  requirements.

## Persistence and operations

- The Postgres repositories are verified two ways: SQL unit tests against
  **`pg-mem`**, and a full `docker compose up` run against **real PostgreSQL 16**
  where assets, events, plans, plan versions, simulations, source records and
  audit events all persisted. No load testing has been performed.
- The API has **no authentication** and is intended for a trusted host.
- Demo-mode repositories are in-memory: restarting the API clears them (the
  compose stack uses PostgreSQL, so it persists).
- Server-side rendering needs an internal API URL (`API_INTERNAL_URL`); the
  browser uses `NEXT_PUBLIC_API_URL`. Both are set in `docker-compose.yml`.

## Verification gaps

- The `/demo` page and the wallet **signing** flow were not exercised in a real
  browser with a real wallet here. Every endpoint they call was verified
  individually, and the pages render, but an end-to-end click-through has not
  been performed.
- No security audit has been performed.

## What is deliberately out of scope

Auctra does not custody assets, does not provide investment advice, does not
operate a launchpad, and does not submit transactions on the user's behalf.
