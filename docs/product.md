# Product

Auctra is a lifecycle intelligence and liquidity-transition system for tokenized
private markets. It starts with [PreStocks](https://prestocks.com), tracks each
asset's corporate-action lifecycle, incorporates external market state from
[Pyth](https://pyth.network), and turns the resulting transition conditions into
an inspectable [Meteora DBC](https://docs.meteora.ag/developer-guides/dbc)
liquidity configuration.

Tagline: **Liquidity for the moments markets change state.**

## The problem

A tokenized private-company asset can exist for years before the underlying
company changes state through an IPO, acquisition, merger, conversion or an
expiration deadline. The information needed to understand that transition is
fragmented across token metadata, issuer disclosures, market data, deadlines and
liquidity venues. Auctra turns that fragmented state into a machine-readable
transition plan.

## The pipeline

```text
PreStocks registry
      -> derived lifecycle state (corporate-action events)
      -> Pyth market/reference state
      -> transition gap
      -> liquidity policy (Transition Curve + fee policy + activation)
      -> Meteora DBC configuration
      -> baseline vs Auctra simulation
      -> reproducible transition plan (input/output hashes)
```

## What Auctra is not

- not another stock launchpad
- not a generic stock dashboard
- not an AI stock picker
- not a prediction market
- not a generic DEX frontend
- not a portfolio tracker
- not an LLM wrapper

## Product surface

| Route | Purpose |
|---|---|
| `/` | Overview and the signature transition-path visual |
| `/assets`, `/assets/[symbol]` | Registry and per-asset state, prices, lifecycle, reference |
| `/transition/[id]` | The transition dossier (Section 43) |
| `/create` | Plan builder |
| `/dbc-lab` | Parameter lab for the Transition Curve |
| `/monitor` | Live state across assets and pools |
| `/audit` | Source registry and provenance |
| `/pools/[address]` | Pool explorer |
| `/case-studies/[symbol]` | Historical case studies (xAI, SpaceX) |
| `/why/meteora`, `/why/pyth`, `/why/prestocks` | Track explanations |
| `/demo` | Scripted end-to-end demonstration |

## Language discipline

The product avoids unsupported financial claims. It says *observed*,
*reference*, *calculated*, *simulated*, *proposed* and *historical* — never
*guaranteed*, *risk-free*, *fair price*, *will rise* or *will fall*. The rule is
enforced by `scripts/lint-language.mjs` (Sections 66, 67, 97, 98).

## Design language (Section 96)

Brand **AUCTRA**; tagline *Liquidity for the moments markets change state.* The
visual metaphor is two market states connected by a precise transition path, and
the logo direction is two parallel shapes becoming one continuous line. No
stock-arrow, rocket, candlestick or AI-brain imagery.

The product should feel like market infrastructure, a research terminal and a
protocol engineering tool: strong typography, dense information hierarchy,
restrained color (one accent), precise charts, subtle motion, keyboard-accessible
controls, dark-first with a light mode.

## Accessibility (Section 100)

- Skip link, semantic landmarks and labelled sections.
- Visible `:focus-visible` outlines.
- Status is encoded by **symbol and text**, never color alone (`StatusBadge`).
- Charts carry `role="img"` with titles, plus an exact-values table.
- `prefers-reduced-motion` disables animation.

## Mobile (Section 101)

Layouts use responsive grids and horizontal-scroll tables. The asset, transition,
timeline, reference and simulation views remain legible on a phone; the
transition-path visual scales with the viewport.

## Performance budget (Sections 99, 102)

- Data is loaded server-side in React Server Components; only interactive panels
  are client components.
- No charting library is shipped: the curve and comparison views are SVG and
  tables rendered from the plan.
- External calls are cached with a TTL, and the worker refreshes in the
  background rather than blocking a request.
- The client JavaScript budget is dominated by the wallet adapter, which is only
  needed for connection and signing.

## Post-hackathon product (Section 92)

The intended product is **a lifecycle control plane for tokenized private
markets**. Future modules: issuer dashboards, corporate-action ingestion,
conversion monitoring, market-state alerts, liquidity planning, DBC configuration
templates, historical transition analytics, and further protocol integrations.
None of these is currently live.
