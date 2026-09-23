import { SignatureVisual } from '@/components/signature-visual'

const PILLARS = [
  {
    label: 'TRACK THE STATE',
    body: 'Read the PreStocks registry, derive lifecycle state from stored corporate-action events, and keep every externally sourced number traceable to its source, retrieval time and content hash.',
    points: [
      'PreStocks REST ingestion with runtime schema validation',
      'Derived lifecycle state machine (no UI-assigned states)',
      'Source registry with provenance and append-only audit trail',
    ],
  },
  {
    label: 'MODEL THE TRANSITION',
    body: 'Normalize conversion terms, measure the transition gap against a Pyth reference, and refuse to produce a number when the inputs are missing rather than substituting a proxy.',
    points: [
      'Conversion specification: 1 SOURCE TOKEN → X TARGET TOKENS',
      'Pyth price, confidence, market session and feed freshness',
      'NOT COMPUTABLE surfaced when a target or ratio is unverified',
    ],
  },
  {
    label: 'BUILD THE LIQUIDITY',
    body: 'Compile an event-adaptive Transition Curve into a validated Meteora DBC configuration, then compare it against a baseline with identical trade sequences.',
    points: [
      'Transition Curve: REFERENCE_CENTERED / TRANSITION_WIDE / EVENT_ADAPTIVE',
      'DBC configuration with DAMM v2 migration and timestamp activation',
      'Baseline vs Auctra simulation, measurements only, no winner declared',
    ],
  },
]

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-14">
      <section className="flex flex-col gap-6">
        <p className="label">PreStocks · Pyth · Meteora DBC</p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Markets change state.
          <br />
          Liquidity has to cross the gap.
        </h1>
        <p className="max-w-2xl text-base" style={{ color: 'var(--muted)' }}>
          Auctra turns PreStock lifecycle events and live market state into inspectable transition plans and
          Meteora DBC liquidity configurations.
        </p>
      </section>

      <SignatureVisual />

      <section aria-labelledby="pillars-heading" className="flex flex-col gap-6">
        <h2 id="pillars-heading" className="text-sm tracking-[0.2em]" style={{ color: 'var(--muted)' }}>
          WHAT THE SYSTEM DOES
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <article key={pillar.label} className="panel flex flex-col gap-4 p-5">
              <h3 className="text-sm font-semibold tracking-[0.12em]">{pillar.label}</h3>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {pillar.body}
              </p>
              <ul className="flex flex-col gap-2 text-sm">
                {pillar.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span aria-hidden="true" style={{ color: 'var(--accent)' }}>
                      —
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="boundary-heading" className="panel-2 p-5">
        <h2 id="boundary-heading" className="label">
          Scope
        </h2>
        <p className="mt-3 max-w-3xl text-sm" style={{ color: 'var(--muted)' }}>
          Auctra is lifecycle infrastructure, not a trading interface. It does not launch a token, pick a
          stock, custody assets or submit transactions on its own. Every configuration it proposes is
          unsigned until a connected wallet approves it.
        </p>
      </section>
    </div>
  )
}
