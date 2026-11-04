import * as React from "react"

import { cn } from "@/intranet/lib/utils"

export interface CtaBannerProps {
  eyebrow?: string
  title: string
  description?: string
  /** Action(s) — use `JdhButton` with an on-ink variant. */
  children?: React.ReactNode
  className?: string
}

/**
 * Full-width ink banner for cross-sell / related-module calls to action
 * (DESIGN.md §4 inverse section). Stacks on mobile, row on ≥sm.
 */
export function CtaBanner({
  eyebrow,
  title,
  description,
  children,
  className,
}: CtaBannerProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-[var(--jdh-radius-md)] border border-transparent bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center sm:justify-between dark:border-[var(--color-ink-border)]",
        className
      )}
    >
      <div className="space-y-1">
        {eyebrow ? (
          <p className="font-mono text-xs tracking-[0.08em] text-[var(--color-on-ink-muted)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="text-lg font-medium">{title}</h3>
        {description ? (
          <p className="max-w-prose text-sm text-[var(--color-on-ink-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap gap-3">{children}</div>
      ) : null}
    </div>
  )
}
