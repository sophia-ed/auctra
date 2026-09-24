# Pyth

Source: `packages/pyth/src/`. Research: [`research/2026-09-23-pyth.md`](./research/2026-09-23-pyth.md).

Pyth provides the external market-state layer. Auctra uses price, confidence,
market session and feed freshness — not a single number treated as truth.

## Access model (verified)

**Base URL:** `https://pyth.dourolabs.app/hermes` (Pyth's documented endpoint since
the Pyth Core upgrade, Aug 26 2026). The legacy host `hermes.pyth.network` still
works but now also requires a key, and Pyth's guide says to move off it.
API keys come from the [Pyth Terminal](https://pythdata.app/signup).

| Endpoint | Auth |
|---|---|
| `GET /v2/price_feeds?query=…` (discovery) | keyless |
| `GET /v2/updates/price/latest` | `Authorization: Bearer <key>`; `401` without one |
| Pyth Pro stream | subscription |

`HttpPythProvider` performs keyless discovery, and produces a live price when an
API key is present (`PYTH_API_KEY`), via `fetchLatestObservation` (a real Hermes
call using `Authorization: Bearer <key>`). Without a key, `getReference` fails
with an actionable error instead of inventing a value. The worker simply omits
the reference stage when no key is configured.

### Keyed update path

```text
GET {baseUrl}/v2/updates/price/latest?ids[]=<feed id>
Authorization: Bearer <key>
```

Response `parsed[]` entries carry `price { price, conf, expo, publish_time }` and
`metadata`. Note: **Hermes Core does not provide a market session or a feed-update
timestamp** — those are Pyth Pro fields. So `marketSession` is `undefined` and
freshness is derived from `publish_time`, which is exactly what Section 14 warns
about: never assume the latest payload is freshly generated.

## Reference model (Section 14)

```ts
type ReferenceObservation = {
  feedId, symbol,
  price, confidence, exponent,
  publisherCount?,
  marketSession?: 'regular' | 'preMarket' | 'postMarket' | 'overNight' | 'closed',
  publishTime, feedUpdateTimestamp?,
  source: 'pyth'
}
```

`mantissaToDecimal(value, exponent)` applies `mantissa × 10^exponent`. The
experimental best bid/ask fields are never used as core logic.

## Freshness (Section 15)

```text
age = now - feedUpdateTimestamp
confidenceBps = confidence / price * 10,000
```

Thresholds: `FRESH` < 60s, `AGING` < 300s, `STALE` otherwise, `UNKNOWN` when no
applicable timestamp exists. `feedUpdateTimestamp` is the freshness origin, never
the receipt time, so a carried-forward price is not mistaken for a fresh one.
A carried-forward price is flagged when `feedUpdateTimestamp < publishTime`.

## Market session (Section 16)

Pyth's `marketSession` is used as provided; Auctra does not reconstruct sessions
from local browser time. Display labels: `REGULAR`, `PRE MARKET`, `POST MARKET`,
`OVERNIGHT`, `CLOSED`.

## Verified feed registry

`registry.ts` records feeds observed live on 2026-09-23 (ids verbatim):

| Asset | Pyth symbol | Role |
|---|---|---|
| OPENAI | `Equity.Index.OPENAI/USD` | 24/7 index |
| ANTHROPIC | `Equity.Index.ANTHROPIC/USD` | 24/7 index |
| SPCX | `Equity.US.SPCX/USD`, `Equity.Index.SPCX/USD`, `Crypto.SPCXX/USD`, `Crypto.SPCXX/SPCX.RR` | public equity, 24/7, xStock, redemption |
| TSLA | `Equity.US.TSLA/USD` | public equity |

## What has no reference

ANDURIL, FIGUREAI, KALSHI, NEURALINK and POLYMARKET returned no Pyth feed, and
XAI is absent from both the PreStocks registry and Pyth. For those assets the
transition gap stays `NOT COMPUTABLE` and the comparison is `UNAVAILABLE`. This
is a first-class outcome, not an error.
