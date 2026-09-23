# Lifecycle engine

Source: `packages/domain/src/lifecycle/`.

## States

```text
PRIVATE_ACTIVE  EVENT_ANNOUNCED  CONVERSION_OPEN  PUBLIC_TRANSITION
POST_EVENT      EXPIRING         EXPIRED          UNKNOWN
```

State is **derived** from stored events; no UI code assigns a state.

## Derivation rules

`reduceLifecycle(events, asOf, config)` expands each event into a timeline and
walks it. The rules are:

- the announcement edge is at `announcedAt`, falling back to the observation
  time, then `effectiveAt`, then the deadline;
- `CONVERSION` / `ACQUISITION` become `CONVERSION_OPEN` at the effective time;
- `IPO` / `MERGER` / `CORPORATE_ACTION` / `CUSTOM` become `PUBLIC_TRANSITION`;
- `EXPIRATION` announces `EXPIRING` and expires at its effective time;
- any event with a `conversionDeadline` becomes `EXPIRING` one window before the
  deadline (`expiringWindowSeconds`, default 7 days) and `EXPIRED` at it;
- an event with an effective time and no deadline settles to `POST_EVENT` after
  `postEventDelaySeconds` (default 30 days).

Other rules:

- entries at the same instant are processed in **ascending** rank so the derived
  chain stays plausible (`EVENT_ANNOUNCED` → `CONVERSION_OPEN` → `EXPIRING`);
- an observation timestamp is capped to the start of the expiring window, so a
  disclosure learned after expiry does not produce a backwards timeline;
- `UNKNOWN` means the events carry no usable timeline (a data-quality failure);
  an event that is simply in the future leaves the asset `PRIVATE_ACTIVE`.

## Transitions

Every transition records `previousState`, `newState`, `timestamp`, `reason` and
`source`, and is checked against the allowed-transition graph. An implausible
edge is reported as a data-quality issue rather than hidden.

## Issuer dates are not invented

PreStocks publishes swap-or-expire notices but not announcement/effective times.
Auctra therefore stores `observedAt` (when the disclosure was seen) and uses it
as an explicitly labelled anchor. `validateLifecycleEvent` emits
`ANNOUNCEMENT_TIME_OBSERVED` and `TIME_OBSERVED` issues so the UI can show that
the timestamp is an observation, not an issuer date.

## Providers (Section 9)

| Provider | Source | file |
|---|---|---|
| `PreStocksLifecycleProvider` | official asset page | `packages/prestocks/src/lifecycle/providers.ts` |
| `ManualLifecycleProvider` | verified manual entry (requires a source URL) | same |
| `DemoLifecycleProvider` | cached snapshots of real disclosures, flagged `CACHED_SNAPSHOT` | same |

The disclosure parser (`disclosure.ts`) extracts the event type, target, ratio
and deadline from the issuer's own wording, and emits explicit issues
(`NO_DISCLOSURE_FOUND`, `MISSING_DEADLINE`, `MISSING_TARGET`,
`RATIO_NOT_PUBLISHED`) rather than guessing.
