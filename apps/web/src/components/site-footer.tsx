export function SiteFooter() {
  return (
    <footer
      className="mt-16 border-t"
      style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
    >
      <div
        className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs sm:flex-row sm:items-center sm:justify-between"
        style={{ color: 'var(--muted)' }}
      >
        <p>
          Auctra produces analysis and proposed configurations. It does not custody assets and does not
          provide investment advice.
        </p>
        <p className="mono">algorithm v1.0.0</p>
      </div>
    </footer>
  )
}
