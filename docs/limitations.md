# Limitations

This list is deliberately specific. Where a capability depends on something not
present in this build, it is stated rather than implied.

## Protocol and SDK

- **The Meteora DBC SDK is not installed.** The adapter targets the documented
  surface (`@meteora-ag/dynamic-bonding-curve-sdk` 1.5.12) and its network binding
  is completed in the deployment phase. `createSdkBackedClient` fails clearly
  while the SDK is absent, and `/api/dbc/prepare` returns `503`.
- **Two Meteora values are unconfirmed against the IDL**: the fee denominator
  (`PROVISIONAL_FEE_DENOMINATOR`) and the DBC program id. Both are exported
  constants flagged in [`meteora.md`](./meteora.md).
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
- **Live Pyth updates require an authenticated source.** Without a key the
  reference is reported as unavailable; discovery remains keyless.
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

- The Postgres repositories are tested against **`pg-mem`**, an emulator, not a
  live PostgreSQL server. The SQL is executed, but no production run has been
  load-tested.
- The API has **no authentication** and is intended for a trusted host.
- Demo-mode repositories are in-memory: restarting the API clears them.

## Verification gaps

- The `/demo` page and the wallet **signing** flow were not exercised in a real
  browser with a real wallet here. Every endpoint they call was verified
  individually, and the pages render, but an end-to-end click-through has not
  been performed.
- No security audit has been performed.

## What is deliberately out of scope

Auctra does not custody assets, does not provide investment advice, does not
operate a launchpad, and does not submit transactions on the user's behalf.
