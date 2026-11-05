import {
  contentBadgeById,
  type ContentBadgeEmphasis,
} from "@/intranet/config/content-badges.config"
import { cn } from "@/intranet/lib/utils"

const emphasisStyles: Record<ContentBadgeEmphasis, string> = {
  solid:
    "border-transparent bg-primary text-primary-foreground dark:border-[var(--color-ink-border)]",
  outline: "border-[var(--color-border-strong)] text-foreground",
  dashed:
    "border-dashed border-[var(--color-border-strong)] text-muted-foreground",
  subtle: "border-transparent bg-[var(--color-bg-subtle)] text-foreground",
}

/**
 * Renders a content badge by its config id (see `content-badges.config.ts`).
 * Unknown ids render nothing (safe for dynamic content). `overlay` adds a
 * shadow/backdrop for placing over card media. RSC-safe.
 */
export function ContentBadge({
  badge,
  overlay,
  className,
}: {
  badge: string
  overlay?: boolean
  className?: string
}) {
  const def = contentBadgeById(badge)
  if (!def) return null

  const Icon = def.icon

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap",
        emphasisStyles[def.emphasis],
        overlay && "shadow-sm backdrop-blur-sm",
        className
      )}
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {def.label}
    </span>
  )
}
