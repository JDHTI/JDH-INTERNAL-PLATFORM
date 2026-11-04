import * as React from "react"

import { cn } from "@/intranet/lib/utils"

/**
 * Static pill/tag (DESIGN.md: 32px, radius-full, strong border). For content
 * labels like article topics. For interactive filtering use `FilterChips`;
 * for status/counters use `StatusBadge`.
 */
export function Tag({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] px-3 text-sm text-foreground [&_svg]:size-3.5",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
