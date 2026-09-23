# Research log — 2026-09-23

Pre-code evidence gathered for Auctra, per AUCTRA.md Sections 2, 4, 5, 13 and 31.

**Audit date:** 2026-09-23 (UTC)
**Last refresh:** 2026-09-23T12:59:10Z
**Purpose:** make every external fact in the product traceable to a source, and pin real protocol/SDK surfaces before writing application code.

| File | Contents |
|---|---|
| [`2026-09-23-prestocks.md`](./2026-09-23-prestocks.md) | Live PreStocks API schema, asset snapshot, and the two real lifecycle disclosures (xAI, SpaceX). |
| [`2026-09-23-pyth.md`](./2026-09-23-pyth.md) | Pyth payload fields, discovery endpoint behavior, keyed vs keyless access, and the verified feed registry for PreStocks assets. |
| [`2026-09-23-meteora-dbc.md`](./2026-09-23-meteora-dbc.md) | `@meteora-ag/dynamic-bonding-curve-sdk` version, enums, constraints, and the build-curve helpers relevant to the Transition Curve. |
| [`2026-09-23-prior-art.md`](./2026-09-23-prior-art.md) | Raw prior-art repository log behind `docs/originality.md`. |

## Rules for using this log

1. **Snapshot, not truth.** Prices, valuations and supplies are point-in-time and will drift. Always re-fetch; never hardcode these values as current.
2. **No invention.** Every address, feed ID and conversion ratio below was returned by a live source and is cited. Anything not cited here must be fetched before display.
3. **Source labels.** Externally sourced facts carry `PRESTOCKS_API`, `PRESTOCKS_PAGE`, `PYTH`, `METEORA` or `SOLANA`. Anything typed by a human is `MANUAL`; anything modeled is `SIMULATED`.
4. **Content hashes** are recorded for reproducibility (AUCTRA.md Section 49/63) and are only valid for the exact payload retrieved at that time.
