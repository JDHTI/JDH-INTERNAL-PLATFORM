import type { ReactNode } from "react"
import type { Route } from "next"
import Link from "next/link"

import { cn } from "@/intranet/lib/utils"

import { DateChip } from "./date-chip"

export interface EventItemProps {
  title: string
  date: Date
  /** Secondary line, e.g. time · location. `ReactNode` so a caller can style
   *  part of it (e.g. underline a call-to-action fragment) without a second prop. */
  meta?: ReactNode
  href?: `/${string}`
  /** `"on-ink"` for use on a black chrome background (`ProximosEventos` `tone="inverse"`) — self-contained (doesn't rely on inheriting color from an ancestor). */
  tone?: "default" | "on-ink"
  className?: string
}

/**
 * Compact event row: a date chip beside a title and optional meta line. Renders
 * as a link when `href` is provided. Used in "Próximos eventos" rail panels.
 */
export function EventItem({
  title,
  date,
  meta,
  href,
  tone = "default",
  className,
}: EventItemProps) {
  const onInk = tone === "on-ink"

  const content = (
    <div className={cn("flex items-center gap-4", className)}>
      <DateChip date={date} tone={tone} />
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-sm font-medium",
            onInk && "text-[var(--color-on-ink)]"
          )}
        >
          {title}
        </p>
        {meta ? (
          <p
            className={cn(
              "truncate text-xs",
              onInk
                ? "text-[var(--color-on-ink-muted)]"
                : "text-muted-foreground"
            )}
          >
            {meta}
          </p>
        ) : null}
      </div>
    </div>
  )

  if (href) {
    return (
      <Link
        href={href as Route}
        className={cn(
          "block rounded-[var(--jdh-radius-sm)] outline-none focus-visible:ring-2",
          onInk
            ? "ring-offset-transparent focus-visible:ring-[var(--color-focus-on-ink)]"
            : "focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
      >
        {content}
      </Link>
    )
  }

  return content
}
