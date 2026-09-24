# Auctra — Submission Runbook

Everything to do to submit. Recorded 2026-09-24. **Stocklana deadline: Sep 25, 2026,
4:00 PM ET** (per the prior-art audit — confirm the current time on the hackathon
page before relying on it).

Target tracks: **PreStocks, Meteora, Pyth** only.

---

## A. Verify the build (do this first)

Run each command; each must exit cleanly.

```bash
pnpm install --frozen-lockfile
pnpm verify:versions
pnpm lint
pnpm typecheck
pnpm test          # expect 150 passing
pnpm build
```

Then verify the runtime stack:

```bash
docker compose up -d --build
curl -s localhost:3000/api/health           # application ok
curl -s localhost:3000/api/assets | jq '.assets | length'   # 8
docker compose ps                            # postgres healthy, web/api/worker up
docker compose down
```

If any step fails, fix it before continuing. Do not submit a red build.

---

## B. Deploy (so the demo URL is reachable)

Pick one:

1. **Coolify (your VPS):** follow `docs/deployment.md`. New Resource → Docker
   Compose from `https://github.com/sophia-ed/auctra` (branch `main`), domain on the
   `web` service (port 3000), env vars as documented, health check `/api/health`.
2. **Any Docker VPS:** `docker compose up -d` and point a domain at port 3000.

After deploy, verify from the public URL (not localhost):

```bash
curl -s https://<your-domain>/api/health
curl -s https://<your-domain>/api/assets | jq '.assets | length'
```

Optional but recommended: set `PYTH_API_KEY` so references read live instead of
`UNCONFIGURED`.

---

## C. Browser click-through (the judge path)

Do this once with the deployed URL and confirm each step renders:

```text
/            -> hero + transition path
/assets      -> registry (8 assets)
/assets/SPACEX -> identity, prices, lifecycle, reference, clocks
/create      -> pick SPACEX, keep defaults, Compile
/transition/<id> -> Overview .. Audit Trail; run the simulation
/demo        -> Run demonstration (steps marked ok / skipped with reason)
/audit       -> source registry rows
/case-studies/spacex and /case-studies/xai
/why/meteora /why/pyth /why/prestocks
```

Note anything broken and fix it before recording.

---

## D. Record the demo video (1–3 minutes)

Use the script in `docs/demo-script.md`. Suggested beats:

1. The landing page and the transition-path visual.
2. `/assets/SPACEX` — derived lifecycle + clocks.
3. `/create` — compile a plan.
4. `/transition/[id]` — transition curve, DBC config (raw JSON), simulation.
5. Point out: `NOT COMPUTABLE` for the gap (no published ratio), `UNCONFIGURED`
   for Pyth (no key) — that honesty is the point.
6. `/demo` — the scripted run.
7. One line: "The important part isn't the dashboard. It's the transition engine."

Optional, if you have a devnet-funded wallet: connect, prepare a transaction,
sign it in the wallet, show the explorer link. The prepared transaction is real.

---

## E. Fill the submission

Use these values.

**Name:** Auctra

**Tagline:** Liquidity for the moments markets change state.

**Tracks:** PreStocks, Meteora, Pyth.

**Three-sentence pitch (verbatim from `HACKATHON_SUBMISSION.md`):**

> Auctra turns PreStock lifecycle events into executable liquidity plans. It
> combines PreStocks asset state, Pyth market/reference data and Meteora DBC
> configuration to model what a market needs when an asset moves from one
> lifecycle state to another. Instead of building another stock trading
> interface, Auctra builds the infrastructure around the moments when the
> underlying market changes.

**Description:** use `HACKATHON_SUBMISSION.md` — its positioning, pipeline and
differentiators are written for the judges.

**Links:**

- Repository: `https://github.com/sophia-ed/auctra`
- Demo URL: your deployed Coolify/VPS URL
- Docs: `docs/technical-paper.md`, `docs/originality.md`, `docs/limitations.md`
- Demo video: the recording from section D

**What to point judges at (in the description):**

- The transition engine, not the dashboard.
- Reproducible, hash-addressed, append-only plans.
- The disclosure parser turns issuer text into lifecycle events with sources.
- `/api/dbc/prepare` produces a real unsigned devnet transaction; nothing is
  submitted without a wallet signature.
- The app says `NOT COMPUTABLE` / `UNCONFIGURED` instead of inventing values.

---

## F. Submission checklist

- [ ] Build green locally (`pnpm test`, `pnpm build`, `pnpm lint`, `pnpm verify:versions`).
- [ ] CI green on GitHub (build + docker jobs).
- [ ] Deployed and the public `/api/health` returns `ok`.
- [ ] Judge path click-through done with no broken pages.
- [ ] Demo video recorded.
- [ ] Tracks selected: PreStocks, Meteora, Pyth.
- [ ] Pitch, description, links and video attached.
- [ ] Submitted before **Sep 25, 2026, 4:00 PM ET**.
- [ ] Confirmed the current deadline/time on the hackathon page (it was extended
      once already; verify rather than assume).

## G. Honest caveats to mention in the submission

Judges respond well to candour. Say these plainly:

- The Meteora SDK is installed and `/api/dbc/prepare` returns a real unsigned
  devnet transaction; a wallet-signed deployment to a live pool was not performed.
- Only three of eight PreStocks have a Pyth reference, so `NOT COMPUTABLE` is a
  normal output.
- The simulator is a documented approximation of DBC, not an on-chain replica.
- Postgres repositories are tested against an emulator plus a real compose run.

All of this is already written for you in `docs/limitations.md` and
`docs/definition-of-done.md`.
