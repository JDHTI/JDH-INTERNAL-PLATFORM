import * as React from "react"

/** Section wrapper for the component catalog (dev-only showcase). */
export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-1 border-b border-border pb-2">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

/** Labeled group inside a section. */
export function Subsection({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </p>
      {children}
    </div>
  )
}
