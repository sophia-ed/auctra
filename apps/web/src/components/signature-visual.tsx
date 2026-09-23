/**
 * Signature visual (AUCTRA.md Section 69).
 *
 * Two market states joined by a precise transition path, with the four data
 * layers crossing it: PreStocks, Pyth, onchain state and Meteora liquidity.
 * This is a labelled diagram of the model, not live data.
 */
export function SignatureVisual() {
  return (
    <figure className="panel grid-bg overflow-hidden">
      <svg
        role="img"
        aria-labelledby="auctra-flow-title auctra-flow-desc"
        viewBox="0 0 960 460"
        className="h-auto w-full"
      >
        <title id="auctra-flow-title">The Auctra transition path</title>
        <desc id="auctra-flow-desc">
          A private market state moves through an event and a handoff to a public market state, crossed by
          the PreStocks, Pyth, onchain and Meteora liquidity layers.
        </desc>

        {/* stage rail */}
        <line x1="80" y1="120" x2="880" y2="120" stroke="var(--line-strong)" strokeWidth="1" />
        <line
          x1="330"
          y1="120"
          x2="630"
          y2="120"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeDasharray="5 5"
        />

        {[
          { x: 80, label: 'PRIVATE', sub: 'pre-IPO state' },
          { x: 330, label: 'EVENT', sub: 'corporate action' },
          { x: 630, label: 'HANDOFF', sub: 'transition gap' },
          { x: 880, label: 'PUBLIC', sub: 'new market state' },
        ].map((stage) => (
          <g key={stage.label}>
            <circle cx={stage.x} cy="120" r="5" fill="var(--accent)" />
            <text
              x={stage.x}
              y="96"
              textAnchor="middle"
              fontSize="13"
              letterSpacing="1.5"
              fill="var(--ink)"
            >
              {stage.label}
            </text>
            <text x={stage.x} y="146" textAnchor="middle" fontSize="11" fill="var(--muted)">
              {stage.sub}
            </text>
          </g>
        ))}

        {/* source lanes */}
        {[
          { y: 260, label: 'PRESTOCKS', from: 80, to: 430 },
          { y: 310, label: 'PYTH', from: 280, to: 700 },
          { y: 360, label: 'ONCHAIN', from: 80, to: 880 },
          { y: 410, label: 'METEORA DBC', from: 560, to: 880 },
        ].map((lane) => (
          <g key={lane.label}>
            <line x1="80" y1={lane.y} x2="880" y2={lane.y} stroke="var(--line)" strokeWidth="1" />
            <line
              x1={lane.from}
              y1={lane.y}
              x2={lane.to}
              y2={lane.y}
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <text x="80" y={lane.y - 10} fontSize="11" letterSpacing="1.2" fill="var(--muted)">
              {lane.label}
            </text>
          </g>
        ))}

        {/* handoff emphasis */}
        <line x1="630" y1="120" x2="630" y2="230" stroke="var(--accent-dim)" strokeWidth="1" />
        <text x="630" y="246" textAnchor="middle" fontSize="11" fill="var(--muted)">
          transition analysis
        </text>
      </svg>
      <figcaption className="border-t px-4 py-3 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>
        Diagram of the model (Section 69). Not live data.
      </figcaption>
    </figure>
  )
}
