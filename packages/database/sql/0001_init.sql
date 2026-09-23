-- Auctra PostgreSQL schema (AUCTRA.md Section 48)
-- Monetary and ratio values are stored as text to preserve decimal precision.
-- Historical plans are append-only.

CREATE TABLE IF NOT EXISTS prestock_assets (
  id                text PRIMARY KEY,
  symbol            text NOT NULL,
  name              text NOT NULL,
  mint_address      text NOT NULL,
  mark_price        text NOT NULL,
  mark_valuation    text NOT NULL,
  token_price       text NOT NULL,
  implied_valuation text NOT NULL,
  supply            text NOT NULL,
  source            text NOT NULL,
  retrieved_at      timestamptz NOT NULL,
  raw               jsonb
);

CREATE TABLE IF NOT EXISTS lifecycle_events (
  id                  text PRIMARY KEY,
  asset_id            text NOT NULL,
  type                text NOT NULL,
  title               text NOT NULL,
  announced_at        timestamptz,
  effective_at        timestamptz,
  conversion_deadline timestamptz,
  observed_at         timestamptz,
  source_type         text NOT NULL,
  source_url          text,
  confidence          text NOT NULL,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reference_observations (
  id                    text PRIMARY KEY,
  asset_symbol          text NOT NULL,
  feed_id               text NOT NULL,
  symbol                text NOT NULL,
  price                 text NOT NULL,
  confidence            text NOT NULL,
  exponent              integer NOT NULL,
  market_session        text,
  publisher_count       integer,
  publish_time          timestamptz NOT NULL,
  feed_update_timestamp timestamptz,
  freshness             text NOT NULL,
  source                text NOT NULL,
  retrieved_at          timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS conversion_specs (
  id                text PRIMARY KEY,
  source_asset_mint text NOT NULL,
  target_asset_mint text NOT NULL,
  ratio_numerator   text NOT NULL,
  ratio_denominator text NOT NULL,
  effective_at      timestamptz,
  deadline          timestamptz,
  source_url        text NOT NULL,
  verified_at       timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS transition_plans (
  id                text PRIMARY KEY,
  asset_id          text NOT NULL,
  state             text NOT NULL,
  algorithm_version text NOT NULL,
  input_hash        text NOT NULL,
  output_hash       text NOT NULL,
  generated_at      timestamptz NOT NULL,
  payload           jsonb NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transition_plan_versions (
  id          serial PRIMARY KEY,
  plan_id     text NOT NULL REFERENCES transition_plans(id),
  version     integer NOT NULL,
  input_hash  text NOT NULL,
  output_hash text NOT NULL,
  payload     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS liquidity_plans (
  id      text PRIMARY KEY,
  plan_id text NOT NULL REFERENCES transition_plans(id),
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS dbc_plans (
  id      text PRIMARY KEY,
  plan_id text NOT NULL REFERENCES transition_plans(id),
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS simulation_scenarios (
  id      text PRIMARY KEY,
  name    text NOT NULL,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS simulation_runs (
  id         text PRIMARY KEY,
  plan_id    text REFERENCES transition_plans(id),
  scenario   text NOT NULL,
  payload    jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pools (
  address            text PRIMARY KEY,
  config             text NOT NULL,
  base_mint          text NOT NULL,
  quote_mint         text NOT NULL,
  creation_signature text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pool_snapshots (
  id                serial PRIMARY KEY,
  pool_address      text NOT NULL REFERENCES pools(address),
  quote_reserve     text NOT NULL,
  progress          text NOT NULL,
  migration_ready   boolean NOT NULL,
  observed_at       timestamptz NOT NULL,
  payload           jsonb
);

CREATE TABLE IF NOT EXISTS source_records (
  id           text PRIMARY KEY,
  source_type  text NOT NULL,
  url          text,
  retrieved_at timestamptz NOT NULL,
  content_hash text,
  description  text NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id                  serial PRIMARY KEY,
  kind                text NOT NULL,
  actor               text,
  source              text,
  asset_id            text,
  plan_id             text,
  pool_address        text,
  transaction_signature text,
  metadata            jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lifecycle_events_asset_idx ON lifecycle_events (asset_id);
CREATE INDEX IF NOT EXISTS reference_observations_symbol_idx ON reference_observations (asset_symbol);
CREATE INDEX IF NOT EXISTS transition_plans_asset_idx ON transition_plans (asset_id);
CREATE INDEX IF NOT EXISTS pool_snapshots_pool_idx ON pool_snapshots (pool_address);
