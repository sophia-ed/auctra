import type { ReactNode } from 'react'

export function Section({
  id,
  title,
  children,
  aside,
}: {
  id: string
  title: string
  children: ReactNode
  aside?: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-heading`} className="label">
          {title}
        </h2>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function DataRow({
  label,
  value,
  mono = true,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0"
      style={{ borderColor: 'var(--line)' }}
    >
      <span className="text-xs" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <span className={mono ? 'mono text-sm' : 'text-sm'} style={{ textAlign: 'right' }}>
        {value}
      </span>
    </div>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm" style={{ color: 'var(--muted)' }}>
      {children}
    </p>
  )
}
