# AUCTRA

## THE HANDOFF LAYER FOR TOKENIZED PRIVATE MARKETS

Build the complete production-quality project called **Auctra**.

Auctra is a lifecycle intelligence and liquidity-transition platform for **PreStocks** on Solana.

Auctra solves a specific problem:

> A tokenized private-company asset can exist for years before its underlying company changes state through an IPO, acquisition, merger, conversion event, or expiration deadline. The information needed to understand that transition is fragmented across token metadata, issuer information, market data, deadlines, and liquidity venues.

Auctra turns that fragmented state into a machine-readable transition plan.

Core flow:

```text
PreStocks
    ↓
Asset + lifecycle state
    ↓
Corporate-action event
    ↓
Pyth market/reference state
    ↓
Transition analysis
    ↓
Liquidity-gap analysis
    ↓
Meteora DBC transition configuration
    ↓
Simulation
    ↓
Deployable configuration
```

Auctra is NOT:

- another stock launchpad
- another generic stock dashboard
- an AI stock picker
- a prediction market
- a generic DEX frontend
- a generic portfolio tracker
- an LLM wrapper

The core product is the **Lifecycle Transition Engine**.

The project must be technically deep, deterministic, reproducible and deployable.

---

# SECTION 1 — HACKATHON TRACKS

Target exactly these three sponsor tracks:

```text
PreStocks
Meteora
Pyth
```

Do not add unrelated sponsor integrations merely to increase the number of integrations.

The three integrations must form one coherent product.

PreStocks is the asset/lifecycle source.

Pyth is the external market-state/reference-data layer.

Meteora DBC is the liquidity configuration and simulation layer.

---

# SECTION 2 — ORIGINALITY REQUIREMENT

Before writing the application code, perform a **prior-art audit**.

Search publicly available:

- GitHub
- Google/web results
- Solana ecosystem pages
- PreStocks ecosystem
- Meteora ecosystem
- public hackathon project repositories
- public project websites

Search concepts including:

```text
PreStocks lifecycle
PreStocks IPO transition
PreStocks corporate action
PreStocks conversion
PreStocks migration
tokenized private stock IPO transition
tokenized stock lifecycle
Meteora DBC stock transition
Pyth PreStocks
private-to-public token transition
tokenized equity handoff
```

Do not copy implementations.

Create:

```text
docs/originality.md
```

Containing:

```text
Date of audit
Searches performed
Public overlaps found
How Auctra differs
```

Acknowledge that hackathon submissions may be private and public search cannot establish uniqueness against unpublished submissions.

The project must be differentiated by its **actual mechanism**, not merely by branding.

---

# SECTION 3 — PRODUCT THESIS

Auctra is built around one idea:

```text
PRIVATE ASSET
      ↓
LIFECYCLE EVENT
      ↓
TRANSITION WINDOW
      ↓
NEW MARKET STATE
      ↓
LIQUIDITY RECONFIGURATION
```

The important abstraction is a **Transition Plan**.

A transition plan contains:

- source asset
- source token state
- lifecycle event
- event timestamp
- deadline
- conversion information
- target/successor asset if known
- market reference
- market session
- confidence
- liquidity state
- transition risk indicators
- Meteora configuration proposal
- simulation results

Auctra must treat these as first-class domain objects.

---

# SECTION 4 — IMPORTANT DATA INTEGRITY RULE

Never invent:

- token addresses
- Pyth feed IDs
- conversion ratios
- event dates
- issuer claims
- public-listing dates
- acquisition terms
- market prices

Every externally sourced fact must have:

```text
source
retrievedAt
sourceType
```

Possible source types:

```text
PRESTOCKS_API
PRESTOCKS_PAGE
PYTH
SOLANA
METEORA
MANUAL
SIMULATION
```

Anything manually entered must be labeled:

```text
MANUAL
```

Anything simulated must be labeled:

```text
SIMULATED
```

Never display simulated data in a way that could be mistaken for live data.

---

# SECTION 5 — PRESTOCKS INGESTION

Use the official PreStocks API:

```text
https://prestocks.com/api/prestocks
```

Do not scrape the HTML products page when the API contains the required information.

The API response currently contains fields such as:

```text
name
symbol
description
image
external_url
contract_address
markPrice
markValuation
tokenPrice
impliedValuation
supply
```

Treat the API schema as externally controlled.

Create:

```ts
interface PreStocksProvider {
  listAssets(): Promise<PreStockAsset[]>
  getAsset(symbol: string): Promise<PreStockAsset | null>
}
```

Use runtime schema validation.

If the API adds fields, do not break.

If the API removes fields, surface an explicit data-quality error.

---

# SECTION 6 — PRESTOCK ASSET MODEL

Create:

```ts
type PreStockAsset = {
  id: string
  name: string
  symbol: string
  description?: string

  mintAddress: string

  markPrice: Decimal
  markValuation: Decimal

  tokenPrice: Decimal
  impliedValuation: Decimal

  supply: Decimal

  imageUrl?: string
  externalUrl?: string

  source: "prestocks"
  retrievedAt: string
}
```

Do not use JavaScript floating point for monetary calculations where precision matters.

Use decimal/fixed-point arithmetic.

---

# SECTION 7 — PRESTOCK PREMIUM / DISCOUNT ENGINE

Calculate:

```text
tokenPremium =
(tokenPrice - markPrice) / markPrice
```

and:

```text
valuationPremium =
(impliedValuation - markValuation) / markValuation
```

Expose the raw values in basis points.

Example:

```text
Mark price
$150.00

Token price
$153.00

Difference
+200 bps
```

Do not call this automatically:

```text
mispricing
```

unless the product explicitly defines it as a deviation metric.

Use:

```text
MARK PREMIUM
MARK DISCOUNT
DEVIATION
```

---

# SECTION 8 — LIFECYCLE ENGINE

Create a first-class lifecycle model.

```ts
enum LifecycleState {
  PRIVATE_ACTIVE
  EVENT_ANNOUNCED
  CONVERSION_OPEN
  PUBLIC_TRANSITION
  POST_EVENT
  EXPIRING
  EXPIRED
  UNKNOWN
}
```

Create:

```ts
type LifecycleEvent = {
  id: string

  assetId: string

  type:
    | "IPO"
    | "ACQUISITION"
    | "MERGER"
    | "CONVERSION"
    | "EXPIRATION"
    | "CORPORATE_ACTION"
    | "CUSTOM"

  title: string

  announcedAt?: string
  effectiveAt?: string
  conversionDeadline?: string

  sourceUrl?: string
  sourceType: string

  confidence: number

  notes?: string
}
```

The lifecycle state must be derived from events.

Do not allow random UI code to independently determine lifecycle state.

---

# SECTION 9 — CORPORATE ACTION SOURCES

Implement an extensible architecture.

```ts
interface LifecycleProvider {
  getEvents(asset: PreStockAsset): Promise<LifecycleEvent[]>
}
```

Implement:

```text
PreStocksLifecycleProvider
ManualLifecycleProvider
DemoLifecycleProvider
```

Do not pretend PreStocks' public API exposes lifecycle events unless the current API actually does.

When lifecycle data is not available through the API:

1. use the official asset page
2. allow verified manual events
3. store source and timestamp
4. clearly label source

---

# SECTION 10 — REAL LIFECYCLE EXAMPLES

Seed demonstration data around currently documented PreStocks lifecycle cases only when verified at runtime.

Examples include:

```text
SpaceX
post-IPO transition
```

and historical:

```text
xAI
acquisition by SpaceX
```

The application should not hardcode stale deadlines as live current deadlines.

Instead:

```text
fetch current source
→ parse event
→ validate
→ store
```

Historical events can remain in the database as historical examples.

---

# SECTION 11 — TRANSITION STATE MACHINE

Implement:

```text
PRIVATE_ACTIVE
      ↓
EVENT_ANNOUNCED
      ↓
CONVERSION_OPEN
      ↓
PUBLIC_TRANSITION
      ↓
POST_EVENT
```

Other paths:

```text
PRIVATE_ACTIVE
      ↓
ACQUISITION_ANNOUNCED
      ↓
CONVERSION_OPEN
      ↓
POST_EVENT
```

And:

```text
CONVERSION_OPEN
      ↓
EXPIRING
      ↓
EXPIRED
```

Every state transition must have:

```text
previousState
newState
timestamp
reason
source
```

---

# SECTION 12 — TRANSITION DOSSIER

Every lifecycle asset gets a dossier.

Example:

```text
AUCTRA
──────────────

SPACE X

Current state
POST-IPO TRANSITION

Source token
SPACEX

Event
IPO

Transition deadline
[date]

Target asset
[verified asset or unknown]

Conversion status
[verified status]

Market reference
Pyth / configured source

Liquidity state
...
```

The dossier should be the central page of the product.

---

# SECTION 13 — PYTH INTEGRATION

Build:

```ts
interface MarketReferenceProvider {
  getReference(asset: MarketAsset): Promise<ReferenceObservation>
}
```

Implement:

```text
PythProvider
MockPythProvider
```

Use current Pyth APIs/documentation.

Do not hardcode feed IDs unless verified.

The application must support feed discovery/configuration.

---

# SECTION 14 — PYTH DATA MODEL

Represent:

```ts
type ReferenceObservation = {
  feedId: string

  symbol: string

  price: Decimal
  confidence: Decimal

  exponent: number

  publisherCount?: number

  marketSession?:
    | "regular"
    | "preMarket"
    | "postMarket"
    | "overNight"
    | "closed"

  publishTime: string
  feedUpdateTimestamp?: string

  source: "pyth"
}
```

Pyth's current payload exposes price, confidence, market session and feed-update freshness. Use `feedUpdateTimestamp` to distinguish a newly generated price from a carried-forward price.

Never assume:

```text
latest payload = freshly generated price
```

---

# SECTION 15 — PYTH FRESHNESS ENGINE

Define:

```text
age =
now - feedUpdateTimestamp
```

Calculate:

```text
confidenceBps =
confidence / price × 10,000
```

Use configurable thresholds:

```text
FRESH
AGING
STALE
UNKNOWN
```

Example:

```text
Price              $182.42
Confidence         $0.07
Confidence         3.8 bps

Feed generated     4 seconds ago
Market session     regular

Status             FRESH
```

---

# SECTION 16 — PYTH MARKET SESSION

Use Pyth's market-session field when available.

Supported:

```text
regular
preMarket
postMarket
overNight
closed
```

Do not rebuild market-session logic solely from local browser time when Pyth provides it.

For visualization:

```text
REGULAR
PRE MARKET
POST MARKET
OVERNIGHT
CLOSED
```

---

# SECTION 17 — DUAL-CLOCK MODEL

Auctra explicitly distinguishes:

```text
PRIVATE MARKET CLOCK
```

from:

```text
PUBLIC MARKET CLOCK
```

and:

```text
ONCHAIN CLOCK
```

Display all three when meaningful.

Example:

```text
PRIVATE MARKET
PreStock active

PUBLIC MARKET
closed

ONCHAIN
24/7

TRANSITION
scheduled
```

This is one of the central concepts of Auctra.

---

# SECTION 18 — TRANSITION GAP

Build a `TransitionGapEngine`.

Inputs:

```text
PreStock token price
PreStock mark price
PreStock implied valuation
target public/reference price
conversion ratio
time to deadline
reference confidence
market session
liquidity metrics
```

Output:

```ts
type TransitionGap = {
  sourceReference: Decimal
  targetReference?: Decimal

  conversionRatio?: Decimal

  impliedTargetValue?: Decimal

  absoluteGap?: Decimal
  gapBps?: number

  deadlineDistanceSeconds?: number

  confidenceBps?: number
}
```

If required conversion inputs are missing:

```text
NOT COMPUTABLE
```

Do not fabricate a result.

---

# SECTION 19 — CONVERSION SPECIFICATION

Create a normalized object:

```ts
type ConversionSpec = {
  sourceAssetMint: string
  targetAssetMint: string

  ratioNumerator: Decimal
  ratioDenominator: Decimal

  effectiveAt?: string
  deadline?: string

  sourceUrl: string
  verifiedAt: string
}
```

The user must be able to inspect this data.

Display:

```text
1 SOURCE TOKEN
→
X TARGET TOKENS
```

When no verified conversion ratio exists:

```text
Conversion ratio
UNKNOWN

Provide verified source
```

---

# SECTION 20 — TRANSITION PLAN

Create:

```ts
type TransitionPlan = {
  id: string

  sourceAsset: AssetReference

  lifecycleEvent: LifecycleEvent

  currentState: LifecycleState

  referenceState?: ReferenceState

  conversionSpec?: ConversionSpec

  transitionGap?: TransitionGap

  liquidityPlan: LiquidityPlan

  dbcPlan?: DbcPlan

  simulationPlan?: SimulationPlan

  generatedAt: string
  algorithmVersion: string

  inputHash: string
  outputHash: string
}
```

Every plan must be reproducible.

---

# SECTION 21 — LIQUIDITY PLAN

Auctra is not merely an information dashboard.

Build a liquidity planning layer.

Inputs:

```text
transition gap
time to event
market session
confidence interval
current liquidity
desired liquidity
launch objective
```

Outputs:

```text
liquidity concentration
initial curve width
fee profile
activation time
migration threshold
expected curve progression
```

The liquidity engine must clearly distinguish:

```text
OBSERVED
CALCULATED
SIMULATED
PROPOSED
```

---

# SECTION 22 — TRANSITION CURVE

Create the Auctra-specific mechanism:

## Transition Curve

The transition curve represents how liquidity should be distributed around a transition reference.

It is NOT:

- a price peg
- a guaranteed fair value
- an oracle-enforced corridor
- a prediction of future stock price

It is a DBC configuration policy.

---

# SECTION 23 — TRANSITION CURVE INPUTS

Inputs:

```text
reference price
reference confidence
current token/reference premium
time to event
event severity
liquidity target
launch objective
market session
```

Outputs:

```text
price points
liquidity weights
curve segments
opening fee
ending fee
duration
activation point
migration threshold
```

---

# SECTION 24 — CURVE ALGORITHMS

Implement three modes:

```text
REFERENCE_CENTERED
TRANSITION_WIDE
EVENT_ADAPTIVE
```

## REFERENCE_CENTERED

Concentrate liquidity around the reference region.

## TRANSITION_WIDE

Distribute liquidity across a wider price region when uncertainty is elevated.

## EVENT_ADAPTIVE

Use event intensity and time-to-event to change liquidity distribution.

---

# SECTION 25 — CURVE MATHEMATICS

Implement a deterministic weighting function.

For segment `i`:

```text
distance_i =
abs(log(price_i / referencePrice))
```

Then:

```text
rawWeight_i =
exp(-distance_i / bandwidth)
```

Adjust by transition intensity:

```text
adjustedWeight_i =
rawWeight_i × adaptiveFactor_i
```

Normalize:

```text
weight_i =
adjustedWeight_i / Σ adjustedWeight
```

Do not blindly copy these equations if a mathematically superior formulation is justified.

Document the chosen model.

The output must always be deterministic.

---

# SECTION 26 — EVENT INTENSITY

Calculate:

```text
eventIntensity ∈ [0,1]
```

from:

```text
event severity
event confidence
time-to-event
reference uncertainty
```

Use a documented temporal decay.

Do not call the output:

```text
predicted volatility
```

It is an internal policy variable.

---

# SECTION 27 — FEE POLICY

Create:

```ts
type DbcFeePolicy = {
  mode: "linear" | "exponential"

  startingFeeBps: number
  endingFeeBps: number

  durationSeconds: number

  reason: string
}
```

Generate the values from:

```text
event intensity
reference uncertainty
launch phase
market state
```

Never use deprecated RateLimiter configuration for new DBC configs.

Use currently supported DBC fee-scheduler functionality.

---

# SECTION 28 — TIMESTAMP ACTIVATION

Support:

```text
IMMEDIATE
SCHEDULED
EVENT_RELATIVE
```

Where appropriate, map to Meteora's timestamp activation configuration.

Important:

Auctra does NOT pretend one DBC configuration can dynamically rewrite itself every market day.

Auctra generates a configuration at creation time.

Any later lifecycle update creates:

```text
new analysis
new policy
new proposed configuration
```

It does not silently mutate an existing DBC configuration.

---

# SECTION 29 — MIGRATION MODEL

Use current Meteora DAMM v2 migration.

The DBC migration threshold is a protocol configuration.

Do NOT create an invented oracle-based migration gate.

Do NOT claim Auctra can prevent permissionless migration when the current protocol allows migration once its conditions are met.

Instead show:

```text
Meteora protocol migration condition
```

and:

```text
Auctra transition recommendation
```

as separate concepts.

---

# SECTION 30 — METEORA ADAPTER

Create:

```text
packages/meteora/src/dbc/
```

with:

```text
MeteoraDBCAdapter
```

Responsibilities:

```text
validateConfig()
buildConfig()
createConfig()
createPool()
getPool()
getConfig()
getQuote()
getCurveProgress()
getMigrationStatus()
prepareMigration()
```

Use the current Meteora SDK.

Do not spread SDK calls throughout the frontend.

---

# SECTION 31 — METEORA VERSION SAFETY

At startup or CI:

1. inspect installed DBC SDK version
2. compare against current package metadata
3. verify expected exports
4. fail clearly if incompatible

Do not invent methods from old SDK versions.

Where docs and installed SDK disagree:

```text
inspect source/types
→ adapt implementation
→ document actual version
```

---

# SECTION 32 — DBC CONFIGURATION INSPECTOR

Every generated DBC plan must expose:

```text
BUILD CURVE MODE
CURVE SEGMENTS
LIQUIDITY WEIGHTS
BASE FEE MODE
FEE SCHEDULE
ACTIVATION TYPE
ACTIVATION POINT
DYNAMIC FEE
QUOTE MINT
MIGRATION OPTION
MIGRATION FEE
MIGRATION THRESHOLD
```

Display raw configuration in:

```json
{}
```

as well as human-readable form.

---

# SECTION 33 — MAINNET DEPLOYMENT

Support browser-wallet signing.

Never request:

```text
seed phrase
private key
exported wallet
```

The browser wallet signs transactions.

Deployment flow:

```text
Review transition plan
        ↓
Review DBC configuration
        ↓
Run simulation
        ↓
Validate configuration
        ↓
Connect wallet
        ↓
Prepare transaction
        ↓
Wallet approval
        ↓
Submit
        ↓
Verify transaction
        ↓
Display explorer link
```

Do not submit transactions automatically.

---

# SECTION 34 — MAINNET / DEMO SEPARATION

Default environment:

```env
ENABLE_MAINNET=false
```

Support:

```text
DEMO
DEVNET
MAINNET
```

Never let a missing environment variable silently select mainnet.

Mainnet UI must visibly display:

```text
MAINNET
REAL TRANSACTION
```

---

# SECTION 35 — DBC DEMO POOL

Create a clearly labeled Auctra demonstration asset for the Meteora integration.

The application should support creation of a demo DBC pool whose configuration is generated by the transition engine.

The demo asset must be clearly identified as:

```text
AUCTRA DEMO
```

unless a real issuer-authorized asset is supplied.

Do not imply that the demo token represents ownership of a company.

Use a PreStock quote asset only when the current bounty rules and configured asset make this appropriate.

---

# SECTION 36 — SIMULATION ENGINE

Build a real simulation framework.

Inputs:

```text
DBC configuration
reference price
curve
fee schedule
trade sequence
event scenario
```

Simulate:

```text
buy trades
sell trades
repeated trades
price shocks
liquidity shocks
transition changes
```

Outputs:

```text
price path
slippage
fee accumulation
quote consumption
curve progress
migration readiness
```

---

# SECTION 37 — TRANSITION SCENARIOS

At minimum:

```text
NORMAL

IPO ANNOUNCED

IPO IMMINENT

PUBLIC MARKET OPENS

PUBLIC MARKET PRICE GAP

HIGH REFERENCE UNCERTAINTY

CONVERSION DEADLINE APPROACHING

ACQUISITION EVENT

NO TARGET ASSET
```

Do not claim any scenario is a prediction.

These are controlled simulations.

---

# SECTION 38 — BASELINE COMPARISON

Every major simulation must have:

```text
BASELINE DBC
```

versus:

```text
AUCTRA TRANSITION DBC
```

Use identical trade sequences.

Compare:

```text
price impact
average slippage
maximum slippage
fees
curve progress
liquidity concentration
reference deviation
```

Do not declare a winner.

Show the measurements.

---

# SECTION 39 — HISTORICAL REPLAY

Create a replay engine.

A user can select:

```text
historical event
```

and run:

```text
PRE-EVENT
EVENT
POST-EVENT
```

using stored observations.

If historical Pyth Pro data is available and authorized, use it.

Otherwise clearly label replay values:

```text
SIMULATED
```

or:

```text
MANUAL HISTORICAL INPUT
```

---

# SECTION 40 — TRANSITION TIMELINE

Create a visual timeline.

Example:

```text
PRIVATE
   │
   ├── EVENT ANNOUNCED
   │
   ├── CONVERSION WINDOW
   │
   ├── PUBLIC MARKET
   │
   └── POST-EVENT
```

Each node should show:

```text
timestamp
state
source
confidence
```

---

# SECTION 41 — MARKET CLOCK VISUALIZATION

Create:

```text
PRIVATE CLOCK
PUBLIC CLOCK
ONCHAIN CLOCK
```

Example:

```text
PRIVATE CLOCK
ACTIVE

PUBLIC CLOCK
CLOSED

ONCHAIN CLOCK
LIVE

AUCTRA STATE
TRANSITION PENDING
```

This should be one of the signature visuals.

---

# SECTION 42 — ASSET PAGE

Route:

```text
/assets/[symbol]
```

Display:

```text
asset identity
mint address
mark price
token price
implied valuation
mark valuation
premium
supply
lifecycle state
next event
deadline
reference feed
market session
```

---

# SECTION 43 — TRANSITION PAGE

Route:

```text
/transition/[id]
```

Sections:

```text
Overview
Lifecycle
Reference
Conversion
Liquidity
Transition Curve
Meteora DBC
Simulation
Sources
Audit Trail
```

---

# SECTION 44 — TRANSITION PLAN BUILDER

Route:

```text
/create
```

Flow:

```text
Select PreStock
        ↓
Load current data
        ↓
Choose / import lifecycle event
        ↓
Load reference data
        ↓
Validate conversion data
        ↓
Generate transition plan
        ↓
Generate DBC policy
        ↓
Simulate
        ↓
Review
```

---

# SECTION 45 — POLICY EXPLANATION

For every generated decision, show:

```text
INPUT
→ EFFECT
→ OUTPUT
```

Example:

```text
Reference confidence
42 bps

caused

wider transition band

resulting in

greater liquidity allocation
near the reference zone
```

Do not use an LLM to generate the explanation.

Generate explanations from structured policy metadata.

---

# SECTION 46 — POLICY JSON

Every plan must be exportable.

Example:

```json
{
  "algorithmVersion": "1.0.0",
  "asset": {},
  "event": {},
  "reference": {},
  "transitionGap": {},
  "liquidityPlan": {},
  "dbcPlan": {},
  "simulation": {}
}
```

Include:

```text
inputHash
outputHash
generatedAt
algorithmVersion
```

---

# SECTION 47 — REPRODUCIBILITY

The same input must generate the same policy.

Normalize:

- numeric precision
- timestamps
- event ordering
- arrays
- configuration ordering

Then calculate:

```text
SHA-256(input)
SHA-256(output)
```

Store both.

---

# SECTION 48 — DATABASE

Use PostgreSQL.

Entities:

```text
PreStockAsset
LifecycleEvent
ReferenceObservation
ConversionSpec
TransitionPlan
TransitionPlanVersion
LiquidityPlan
DbcPlan
SimulationRun
SimulationScenario
Pool
PoolSnapshot
SourceRecord
AuditEvent
```

Never overwrite historical plans.

---

# SECTION 49 — SOURCE REGISTRY

Create:

```ts
type SourceRecord = {
  id: string

  sourceType:
    | "prestocks_api"
    | "prestocks_page"
    | "pyth"
    | "meteora"
    | "manual"
    | "simulation"

  url?: string

  retrievedAt: string

  contentHash?: string

  description: string
}
```

Every important external claim shown in the UI must be traceable to a source record.

---

# SECTION 50 — DATA AUDIT PAGE

Route:

```text
/audit
```

Display:

```text
Asset
Source
Retrieved
Freshness
Status
```

A judge should be able to see:

```text
where this number came from
```

without trusting the application blindly.

---

# SECTION 51 — LIVE MONITOR

Route:

```text
/monitor
```

Show:

```text
current PreStock data
Pyth reference
market session
reference confidence
feed freshness
transition status
DBC state
curve progress
```

Refresh live data through a background worker.

---

# SECTION 52 — PYTH PRICE COMPARISON

Where a suitable pair exists, compare:

```text
PreStock-derived state
vs
Pyth public equity state
```

Do not assume the two are directly comparable.

Require a conversion specification before producing a normalized comparison.

Display the transformation explicitly:

```text
PreStock unit
   ×
conversion ratio
   =
normalized target units

vs

Pyth reference
```

If a valid transformation cannot be constructed:

```text
Comparison unavailable
```

---

# SECTION 53 — LIQUIDITY GAP VIEW

Create a visual:

```text
CURRENT MARKET
      │
      │ liquidity
      ▼
TRANSITION ZONE
      │
      │ required depth
      ▼
TARGET MARKET
```

Display:

```text
current observed liquidity
target liquidity
gap
```

Anything modeled rather than observed must be marked:

```text
MODEL
```

---

# SECTION 54 — DBC CURVE LAB

Route:

```text
/dbc-lab
```

Purpose:

Allow a user to see how different DBC parameters alter transition behavior.

Controls:

```text
curve mode
segment count
reference price
uncertainty
liquidity target
fee schedule
activation
migration threshold
```

Outputs:

```text
curve graph
liquidity graph
fee graph
simulation
```

---

# SECTION 55 — CONFIGURATION DIFF

Allow:

```text
BASELINE
vs
AUCTRA
```

Display exact parameter differences:

```text
Curve
+ segment

Liquidity
+ concentration

Fees
+ starting fee

Activation
+ timestamp

Migration
+ threshold
```

---

# SECTION 56 — EXPLORER

For deployed Auctra/Meteora demo pools:

```text
/pools/[address]
```

Show:

```text
pool address
config address
base mint
quote mint
current progress
quote reserve
migration threshold
fee
activation
migration status
creation transaction
```

Every value must be retrieved from the chain where possible.

---

# SECTION 57 — WALLET

Implement Solana wallet connection using current supported libraries.

Wallet functionality:

```text
connect
disconnect
account display
network display
transaction signing
transaction confirmation
```

No custody.

---

# SECTION 58 — API

Build a typed backend API.

Required routes:

```text
GET    /api/assets
GET    /api/assets/:symbol

GET    /api/events
POST   /api/events

GET    /api/reference/:asset

POST   /api/transition/compile
GET    /api/transition/:id

POST   /api/simulations
GET    /api/simulations/:id

POST   /api/dbc/validate
POST   /api/dbc/prepare

GET    /api/pools/:address

GET    /api/health
```

Validate every input.

---

# SECTION 59 — FRONTEND STACK

Use:

```text
Next.js
TypeScript
React
Tailwind CSS
Solana wallet libraries
Recharts or an appropriate charting library
Zod
```

Use the package manager already standard for the repository, otherwise use `pnpm`.

---

# SECTION 60 — BACKEND STACK

Use:

```text
Node.js / TypeScript
PostgreSQL
Drizzle or Prisma
Zod
```

Keep the domain layer independent of the framework.

---

# SECTION 61 — ARCHITECTURE

Recommended:

```text
apps/
  web/
  worker/
  api/

packages/
  domain/
    lifecycle/
    transitions/
    policy/
    math/
    simulation/

  prestocks/
  pyth/
  meteora/
  solana/

  database/
  ui/
```

Do not import frontend code into domain packages.

---

# SECTION 62 — WORKER

The worker performs:

```text
PreStocks refresh
reference refresh
event refresh
pool snapshots
lifecycle recalculation
```

The worker must not submit financial transactions automatically.

Any blockchain action requiring user approval must remain wallet-signed.

---

# SECTION 63 — CACHING

Cache public external data.

Track:

```text
lastFetchedAt
expiresAt
etag if available
contentHash
```

Handle upstream failures gracefully.

Never replace a previously verified observation with empty data simply because an API temporarily fails.

---

# SECTION 64 — ERROR HANDLING

Handle:

```text
PreStocks unavailable
Pyth unavailable
Meteora unavailable
Solana RPC unavailable
invalid feed
stale feed
missing conversion ratio
missing target asset
wallet rejection
transaction failure
database failure
simulation failure
```

Display actionable messages.

Do not expose stack traces in production.

---

# SECTION 65 — SECURITY

Implement:

```text
input validation
rate limiting
secure headers
CORS policy
no secret exposure
server-side validation
wallet-only signing
transaction simulation
audit logging
```

Never store:

```text
seed phrases
private keys
wallet secrets
```

---

# SECTION 66 — FINANCIAL-DATA LANGUAGE

The interface must avoid unsupported financial claims.

Never say:

```text
guaranteed
safe
risk-free
fair price
will converge
will rise
will fall
best investment
buy this
sell this
```

Use:

```text
observed
reference
calculated
simulated
proposed
historical
```

Auctra is infrastructure and analysis.

---

# SECTION 67 — NO AI DEPENDENCY

Do not add an LLM to the runtime unless there is a concrete technical reason.

The core algorithm must remain:

```text
deterministic
inspectable
reproducible
testable
```

Do not label deterministic mathematics as:

```text
AI-powered
```

The fact that AI coding agents generated the software is irrelevant to the product.

---

# SECTION 68 — UI DESIGN

The product should feel like:

```text
market infrastructure
+
research terminal
+
protocol engineering tool
```

Do NOT make it look like:

```text
meme launchpad
generic crypto dashboard
AI chatbot
neon trading casino
```

Use:

- strong typography
- dark/light support
- dense information hierarchy
- restrained color
- precise charts
- subtle motion
- high information density
- keyboard-accessible controls

---

# SECTION 69 — SIGNATURE VISUAL

Build the primary Auctra visualization:

```text
PRIVATE
   │
   │
   ▼
EVENT
   │
   │  transition gap
   ▼
HANDOFF
   │
   │
   ▼
PUBLIC
```

Overlay:

```text
PreStocks state
Pyth state
onchain state
Meteora liquidity state
```

This should become the visual identity of the product.

---

# SECTION 70 — LANDING PAGE

Headline:

```text
Markets change state.
Liquidity has to cross the gap.
```

Subheadline:

```text
Auctra turns PreStock lifecycle events and live market state
into inspectable transition plans and Meteora DBC liquidity
configurations.
```

Three sections:

```text
TRACK THE STATE

MODEL THE TRANSITION

BUILD THE LIQUIDITY
```

---

# SECTION 71 — DEMO PAGE

Route:

```text
/demo
```

Create a scripted demonstration.

Flow:

```text
1. Select SpaceX or another currently valid PreStock.

2. Load current PreStocks data.

3. Show lifecycle state.

4. Load reference data where available.

5. Show Pyth market session and confidence.

6. Build transition dossier.

7. Generate transition gap.

8. Generate Transition Curve.

9. Generate Meteora DBC configuration.

10. Run identical baseline and Auctra simulations.

11. Display measurable differences.

12. Show raw Meteora configuration.

13. Show deployment preparation.

14. If mainnet-enabled and fully configured,
    allow explicit wallet-signed deployment.

15. Verify the resulting transaction.
```

---

# SECTION 72 — DEMO DATA

Provide:

```text
DemoMode
```

The demo must work without a wallet.

Demo mode may use:

```text
cached PreStocks snapshot
cached Pyth observations
historical lifecycle data
synthetic scenarios
```

Every synthetic dataset must be labeled:

```text
DEMO / SIMULATED
```

---

# SECTION 73 — REAL DATA MODE

When configured:

```text
LIVE
```

the application must show:

```text
PreStocks
LIVE

Pyth
LIVE

Solana
LIVE
```

If one provider fails:

```text
Pyth
STALE
```

rather than:

```text
LIVE
```

---

# SECTION 74 — HISTORICAL CASE STUDY

Create a case-study page for a verified real PreStocks lifecycle event.

Use one currently valid or historical official example.

The page should contain:

```text
What changed?
When?
What happened to the PreStock?
What transition information was available?
What market reference was available?
What would Auctra have generated?
```

Clearly distinguish:

```text
HISTORICAL FACT
```

from:

```text
AUCTRA SIMULATION
```

---

# SECTION 75 — POLICY ENGINE TESTS

Test:

```text
low uncertainty
high uncertainty
short deadline
long deadline
no deadline
high event confidence
low event confidence
regular market session
closed session
stale reference
missing target asset
missing conversion ratio
```

---

# SECTION 76 — LIFECYCLE TESTS

Test:

```text
private → announced
announced → conversion
conversion → public
conversion → expiring
expiring → expired
acquisition flow
merger flow
```

Ensure state transitions are deterministic.

---

# SECTION 77 — MATHEMATICAL TESTS

Test:

```text
curve prices strictly ordered
weights > 0
weights sum to 1
reference lies inside intended range
fees within protocol limits
duration valid
timestamp valid
decimal calculations deterministic
hash reproducibility
```

---

# SECTION 78 — PYTH TESTS

Test:

```text
price conversion
confidence conversion
exponent handling
freshness
stale feed
carried-forward price
market session
publisher count
```

Do not use experimental best-bid/ask values as core logic unless explicitly enabled and labeled.

---

# SECTION 79 — METEORA TESTS

Test:

```text
curve construction
fee configuration
activation
migration configuration
quote calculations
pool state reading
```

Mock network calls.

Add integration tests against an appropriate environment.

---

# SECTION 80 — E2E TEST

One complete test:

```text
PreStocks asset
        ↓
Lifecycle event
        ↓
Reference state
        ↓
Transition gap
        ↓
Auctra policy
        ↓
Meteora configuration
        ↓
simulation
        ↓
result
```

---

# SECTION 81 — CONTAINERIZATION

Provide:

```text
Dockerfile
docker-compose.yml
.env.example
```

Services:

```text
web
api
worker
postgres
```

Do not add unnecessary infrastructure.

---

# SECTION 82 — ENVIRONMENT

Create:

```env
DATABASE_URL=

SOLANA_RPC_URL=
SOLANA_WS_URL=

NEXT_PUBLIC_SOLANA_NETWORK=

PRESTOCKS_API_URL=https://prestocks.com/api/prestocks

PYTH_HERMES_URL=
PYTH_API_KEY=

METEORA_CLUSTER=

ENABLE_MAINNET=false

DEMO_MODE=true
```

Do not commit secrets.

---

# SECTION 83 — HEALTH

Create:

```text
/api/health
```

Return:

```json
{
  "application": "ok",
  "database": "ok",
  "solana": "ok",
  "prestocks": "ok",
  "pyth": "ok"
}
```

Do not expose credentials.

---

# SECTION 84 — OBSERVABILITY

Structured logs must include:

```text
requestId
assetId
transitionPlanId
simulationId
poolAddress
transactionSignature
provider
latency
errorCode
```

---

# SECTION 85 — AUDIT TRAIL

Record:

```text
asset imported
event added
reference observed
policy compiled
simulation executed
configuration prepared
deployment submitted
deployment confirmed
```

Each event should contain:

```text
timestamp
actor
source
metadata
```

---

# SECTION 86 — DOCUMENTATION

Create:

```text
README.md

docs/product.md

docs/architecture.md

docs/lifecycle-engine.md

docs/transition-model.md

docs/transition-curve.md

docs/pyth.md

docs/meteora.md

docs/simulation.md

docs/data-provenance.md

docs/security.md

docs/limitations.md

docs/originality.md

docs/demo-script.md
```

---

# SECTION 87 — TECHNICAL PAPER

Create:

```text
docs/technical-paper.md
```

Sections:

```text
Abstract
Problem
Market lifecycle model
Transition state machine
Reference data model
Transition gap
Transition Curve
Liquidity weighting
Fee policy
Meteora implementation
Simulation methodology
Reproducibility
Failure modes
Limitations
Future work
```

Include equations. Define every variable.

Do not make claims beyond what the model actually measures.

---

# SECTION 88 — ARCHITECTURE DIAGRAM

Create an architecture diagram showing:

```text
                    AUCTRA

       ┌───────────────────────────────┐
       │        Lifecycle Engine       │
       └──────────────┬────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   PreStocks        Pyth        Solana
      data          data         state
        │             │             │
        └─────────────┼─────────────┘
                      ▼
             Transition Engine
                      │
             ┌────────┴────────┐
             ▼                 ▼
       Transition Curve     Simulation
             │                 │
             ▼                 ▼
            Meteora DBC
                 │
                 ▼
              DAMM v2
```

---

# SECTION 89 — WHY METEORA PAGE

Explain:

```text
Auctra does not merely monitor markets.

It converts transition state into configurable liquidity mechanics.

Meteora DBC is the primitive that makes those liquidity mechanics
programmable.
```

Show actual generated parameters.

---

# SECTION 90 — WHY PYTH PAGE

Explain:

```text
Pyth provides the external market-state layer.

Auctra uses price, confidence, session and freshness rather than
treating a single number as unquestionable truth.
```

Show:

```text
price
confidence
publisher count
market session
feed freshness
```

---

# SECTION 91 — WHY PRESTOCKS PAGE

Explain:

```text
PreStocks supplies the actual lifecycle assets around which
Auctra is built.

The application begins with the real PreStocks asset registry,
then adds lifecycle intelligence and transition modeling.
```

---

# SECTION 92 — POST-HACKATHON PRODUCT

Auctra's future product should be:

```text
A lifecycle control plane for tokenized private markets.
```

Future modules:

```text
issuer dashboards
corporate-action ingestion
conversion monitoring
market-state alerts
liquidity planning
DBC configuration templates
historical transition analytics
protocol integrations
```

Do not claim future features are currently live.

---

# SECTION 93 — SUBMISSION DESCRIPTION

Generate:

```text
HACKATHON_SUBMISSION.md
```

Use this positioning:

```text
Auctra is a lifecycle intelligence and liquidity-transition
system for tokenized private markets.

It starts with PreStocks, tracks the state of each asset and
its corporate-action lifecycle, incorporates external market
state from Pyth, and turns the resulting transition conditions
into an inspectable Meteora DBC liquidity configuration.

The core innovation is the transition engine.

Auctra does not treat a token launch as an isolated event.
It treats it as one stage in an asset's lifecycle.
```

---

# SECTION 94 — THREE-SENTENCE PITCH

Use:

```text
Auctra turns PreStock lifecycle events into executable liquidity plans.

It combines PreStocks asset state, Pyth market/reference data and
Meteora DBC configuration to model what a market needs when an
asset moves from one lifecycle state to another.

Instead of building another stock trading interface, Auctra builds
the infrastructure around the moments when the underlying market changes.
```

---

# SECTION 95 — 60-SECOND DEMO SCRIPT

Generate:

```text
“This is Auctra.

PreStocks made private-company exposure tradeable on Solana,
but those assets don't live forever in exactly the same market state.

A company can announce an IPO, acquisition, conversion or
expiration event.

Auctra turns that event into a lifecycle state.

Here is the current PreStock data.

Here is the external market reference from Pyth.

Here is the difference between the current state and the
transition state.

Now Auctra compiles a liquidity policy.

This is the resulting Meteora DBC configuration.

And this is what happens when we run the same scenario against
a conventional configuration.

The important part isn't the dashboard.

The important part is the transition engine underneath it.”
```

---

# SECTION 96 — DESIGN LANGUAGE

Brand:

```text
AUCTRA
```

Tagline:

```text
Liquidity for the moments markets change state.
```

Visual metaphor:

```text
two market states
connected by a precise transition path
```

Logo direction:

```text
two parallel shapes becoming one continuous line
```

Avoid stock-arrow logos.

Avoid rocket logos.

Avoid candlestick logos.

Avoid AI-brain logos.

---

# SECTION 97 — NO COPYCAT LANGUAGE

Never describe Auctra as:

```text
StockLaunch but better
a better launchpad
AI-powered equity trading
an IPO prediction engine
a replacement for PreStocks
a replacement for Meteora
```

Use:

```text
lifecycle infrastructure
transition engine
liquidity transition
corporate-action state
market handoff
transition curve
```

---

# SECTION 98 — NO GENERIC AI SLOP

Do not generate:

```text
hero sections with empty buzzwords
“revolutionary”
“game-changing”
“next generation”
“seamless”
“unlock the future”
```

Prefer:

```text
specific mechanism
specific numbers
specific state
specific source
specific result
```

---

# SECTION 99 — PERFORMANCE

The UI should remain responsive while:

```text
large simulations run
historical observations load
multiple assets refresh
charts render
```

Use workers where appropriate.

Virtualize large tables.

Cache immutable source records.

---

# SECTION 100 — ACCESSIBILITY

Implement:

```text
keyboard navigation
visible focus
semantic labels
ARIA where appropriate
color-independent status indicators
responsive layout
reduced-motion support
```

---

# SECTION 101 — MOBILE

The application must work on mobile.

Priority screens:

```text
asset
transition
timeline
reference
simulation
```

The core transition visualization must remain understandable on a phone.

---

# SECTION 102 — PERFORMANCE BUDGET

Aim for:

```text
fast first render
minimal client JavaScript
server-side data loading where appropriate
lazy-loaded charts
```

Do not ship unnecessary libraries.

---

# SECTION 103 — DEPLOYMENT

The final system must be deployable to:

```text
Docker VPS
```

without requiring:

```text
Vercel
AWS
Supabase
Firebase
```

unless specifically justified.

---

# SECTION 104 — CI

Create CI that runs:

```text
install
lint
typecheck
test
build
Docker build
```

The repository must be reproducible from a clean checkout.

---

# SECTION 105 — FINAL REPOSITORY STRUCTURE

Use a structure close to:

```text
auctra/
│
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
│
├── packages/
│   ├── domain/
│   │   ├── lifecycle/
│   │   ├── transition/
│   │   ├── policy/
│   │   ├── math/
│   │   └── simulation/
│   │
│   ├── prestocks/
│   ├── pyth/
│   ├── meteora/
│   ├── solana/
│   ├── database/
│   └── ui/
│
├── docs/
│
├── scripts/
│
├── tests/
│
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

Adapt as necessary but preserve separation of responsibilities.

---

# SECTION 106 — DEFINITION OF DONE

Do not consider Auctra complete until:

- [ ] PreStocks API integration works

- [ ] PreStock assets are normalized

- [ ] Lifecycle state machine works

- [ ] Corporate-action events work

- [ ] Source registry works

- [ ] Pyth integration works

- [ ] Price confidence works

- [ ] Feed freshness works

- [ ] Market session works

- [ ] Transition gap works

- [ ] Conversion specification works

- [ ] Missing conversion information is handled honestly

- [ ] Transition Curve works

- [ ] Fee policy works

- [ ] Meteora DBC configuration generation works

- [ ] Current Meteora SDK is used

- [ ] Deprecated RateLimiter mode is not used for new configurations

- [ ] DAMM v2 configuration works

- [ ] DBC configuration can be inspected

- [ ] Simulation engine works

- [ ] Baseline comparison works

- [ ] Historical replay works

- [ ] Policy hashes work

- [ ] Audit trail works

- [ ] Live/demo distinction works

- [ ] Wallet integration works

- [ ] Transaction preparation works

- [ ] Mainnet mode is explicitly gated

- [ ] Pool monitoring works

- [ ] Docker build works

- [ ] CI works

- [ ] Tests pass

- [ ] README works from a clean checkout

- [ ] Technical paper exists

- [ ] Originality audit exists

- [ ] Demo mode works without wallet

- [ ] Judge mode works

- [ ] No fake addresses

- [ ] No fake feed IDs

- [ ] No fake transactions

- [ ] No fake statistics

- [ ] No unsupported financial claims

---

# SECTION 107 — FINAL JUDGE EXPERIENCE

The judge should be able to do this:

```text
Open Auctra
      ↓
Choose a PreStock
      ↓
See its lifecycle
      ↓
Open its transition dossier
      ↓
See Pyth reference state
      ↓
See market session + confidence
      ↓
See transition gap
      ↓
Generate Transition Curve
      ↓
Inspect Meteora DBC parameters
      ↓
Run simulation
      ↓
Compare baseline
      ↓
Inspect source evidence
      ↓
Prepare deployment
      ↓
Verify on Solana
```

The project should feel like one coherent system.

Not ten unrelated hackathon features.

---

# SECTION 108 — FINAL BUILD DIRECTIVE

Build this entire system.

Do not merely produce:

```text
landing page
mock dashboard
fake charts
placeholder buttons
```

Every major UI element must connect to real domain logic.

Every important number must have a source or calculation.

Every calculated output must be reproducible.

Every blockchain transaction must be real when explicitly enabled.

Every unsupported capability must be clearly labeled.

Use current official documentation for:

```text
PreStocks
Pyth
Meteora
Solana
```

Inspect current SDK source/types whenever documentation is insufficient.

Do not use stale examples.

Do not invent protocol behavior.

Do not copy an existing public project.

The goal is:

> **Auctra should look like a new piece of market infrastructure that happens to be built for a hackathon, not like a hackathon project built because there was a bounty.**
