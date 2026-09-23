# PreStocks — live evidence

**Source type:** `PRESTOCKS_API` / `PRESTOCKS_PAGE`
**Retrieved:** 2026-09-23T12:57Z (API), 2026-09-23T12:59Z (pages)
**API endpoint:** `https://prestocks.com/api/prestocks`
**Content hash (SHA-256 of API response):** `eb85b7e5037229af447c5143ee53795738170f3899965b048076198a03eb2a26`
**Hash computed:** 2026-09-23T12:59:10Z

---

## 1. API schema (observed, externally controlled)

The response is a **JSON array of asset objects** with these keys, in this order:

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

Notes for the ingestion layer (AUCTRA.md Sections 5–6):

- `contract_address` is the Solana mint (Token-2022). All observed mints begin with `Pre…`.
- Numbers arrive as JSON numbers (`markPrice`, `tokenPrice`, `supply` are frequently high-precision floats). They **must** be parsed into decimal arithmetic at the boundary — never carried as JS floats into policy math.
- `markValuation` / `impliedValuation` are company-level valuations (large integers), **not** `price × supply`. Do not assume `impliedValuation === tokenPrice × supply`; the two use different bases. Compute `valuationPremium` only from the two valuation fields.
- The API exposes **no lifecycle, event, conversion, deadline or listing-date fields.** Lifecycle must come from elsewhere (see §3).
- Schema is externally controlled: validate at runtime, tolerate added fields, and raise an explicit **data-quality error** if a required field disappears.

## 2. Point-in-time asset snapshot (8 assets)

| Symbol | Mint (`contract_address`) | markPrice | tokenPrice | markValuation | impliedValuation | supply |
|---|---|---|---|---|---|---|
| ANDURIL | `PresTj4Yc2bAR197Er7wz4UUKSfqt6FryBEdAriBoQB` | 151.8593635 | 149.6868801188559 | 134349835729 | 132427841730 | 11805.820587074 |
| ANTHROPIC | `Pren1FvFX6J3E4kXhJuCiAD5aDmGEb7qJRncwA8Lkhw` | 1049.36317021 | 1015.6648971354647 | 1719216073161 | 1664006766839 | 7381.826001601 |
| FIGUREAI | `PreZad18qfPtbxNpMtMuAuX2zVpvkEU8DnJx56faCWd` | 181.5252598 | 175.20636296987558 | 39577404922 | 38199714904 | 3012.857155916 |
| KALSHI | `PreLWGkkeqG1s4HEfFZSy9moCrJ7btsHuUtfcCeoRua` | 885.24983765 | 865.0730375171579 | 32198354046 | 31464482402 | 904.868345532 |
| NEURALINK | `PrekqLJvJ3qVdXmBGDiexvwUTF4rLFDa6HWS4HJbw9S` | 338.22209158 | 430.6855806051775 | 64429634079 | 82043470998 | 2595.30414425 |
| OPENAI | `PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF` | 1021.7813107654374 | 1305.8950165148256 | 1265915823681 | 1617912901768 | 2826.3865844512234 |
| POLYMARKET | `Pre8AREmFPtoJFT8mQSXQLh56cwJmM7CFDRuoGBZiUP` | 144.2528757 | 145.72495809198998 | 14227049998 | 14372235248 | 4816.970106875 |
| SPACEX | `PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh` | 153.46590420780728 | 112.496991575484 | 2012108521836 | 1474960556212 | 43712.532115040005 |

**Observations relevant to the premium engine (Section 7):**

- SpaceX is at a **MARK DISCOUNT** (tokenPrice < markPrice → negative bps).
- OpenAI and Neuralink are at a **MARK PREMIUM** (tokenPrice > markPrice).
- These are **snapshot values only.** Do not ship them as current.

**Critical:** `XAI` is **not** present in the current API response. The xAI asset is historical/expired. Any UI that shows xAI must label it historical and must not imply it is tradeable now.

## 3. Lifecycle disclosures (the part the API does not carry)

The PreStocks API has no lifecycle fields, so lifecycle evidence is read from the official asset pages and stored as `PRESTOCKS_PAGE` source records. Two verified cases exist as of the audit date.

### 3.1 xAI — historical acquisition + conversion (window closed)

Source: `https://www.prestocks.com/xai` — `PRESTOCKS_PAGE`, retrieved 2026-09-23.

Verbatim disclosure:

> 🚨 xAI was acquired by SpaceX. Each XAI token must be swapped into **0.7165 SPACEX** before **11:59pm UTC on 12 September 2026**, or it will expire worthless.

Derived, citable facts:

- Event type: `ACQUISITION` (xAI acquired by SpaceX).
- Conversion: `1 XAI → 0.7165 SPACEX`.
- Deadline: `2026-09-12T23:59:00Z`.
- Status as of audit: **windows closed → `EXPIRED`** (do not present as a live deadline).

### 3.2 SpaceX — post-IPO transition (window open)

Source: `https://www.prestocks.com/spacex` — `PRESTOCKS_PAGE`, retrieved 2026-09-23.

Verbatim disclosure:

> ⚠️ SpaceX has gone public! SpaceX PreStocks tokens must be swapped into **$SPCXx** or any other token before **11:59pm UTC on 12 March 2027**, or they will expire worthless.

Derived, citable facts:

- Event type: `IPO` (SpaceX has gone public).
- Target/successor asset: **`$SPCXx`** (the SpaceX xStock) or any other token.
- Deadline: `2027-03-12T23:59:00Z`.
- No numeric source→target ratio is published for SpaceX; the SpaceX disclosure is a **swap-or-expire** deadline, not a fixed ratio. Therefore a `ConversionSpec` for SpaceX has **`ratioNumerator/ratioDenominator = UNKNOWN`** unless separately verified. Do not invent one.

### 3.3 Lifecycle interpretation

| Case | Event | Ratio | Deadline | State at 2026-09-23 | Data quality |
|---|---|---|---|---|---|
| xAI | ACQUISITION (by SpaceX) | 1 XAI → 0.7165 SPACEX | 2026-09-12 23:59 UTC | `EXPIRED` | Official page; asset absent from API |
| SpaceX | IPO | swap to `$SPCXx` (no numeric ratio) | 2027-03-12 23:59 UTC | `EVENT_ANNOUNCED` / `PUBLIC_TRANSITION` | Official page; asset present in API |

Per AUCTRA.md Section 10, these are **not** hardcoded as live deadlines. The ingestion path is:

```text
fetch current source (page / future API field)
  -> parse disclosure
  -> validate (deadline in future? target resolvable? ratio present?)
  -> store as LifecycleEvent with sourceType PRESTOCKS_PAGE + retrievedAt + contentHash
```

Historical events (xAI) remain stored as historical examples and are surfaced with a `HISTORICAL` / closed-window label.

## 4. Open questions to resolve at runtime (do not guess)

- Does the PreStocks API ever add lifecycle fields? Re-check the schema on every refresh; the current shape is a snapshot, not a contract.
- Is there an authoritative machine-readable disclosure endpoint behind the pages? Until confirmed, page parsing is `PRESTOCKS_PAGE` with a content hash.
- For SpaceX, is a numeric SPACEX→SPCXx ratio published anywhere official? Until verified, the ratio stays `UNKNOWN` (Section 19).
- `markValuation` vs `impliedValuation` basis: confirm before displaying anything that implies `price × supply`.
