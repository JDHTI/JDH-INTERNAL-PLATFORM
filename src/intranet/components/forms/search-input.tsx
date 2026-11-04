"use client"

import * as React from "react"
import { Search } from "lucide-react"

import { cn } from "@/intranet/lib/utils"

export interface SearchInputProps extends Omit<
  React.ComponentProps<"input">,
  "type"
> {
  /** `light` for content surfaces; `dark` for the black header chrome. */
  variant?: "light" | "dark"
  /** Optional keyboard-shortcut hint rendered on the right (e.g. "⌘K"). */
  kbdHint?: string
}

/**
 * Search field with a leading magnifier icon and an optional ⌘K-style hint.
 * `light` (44px) is for content surfaces (directory, etc.); `dark` (40px) is
 * the global search in the black header, styled with on-ink overlays.
 */
export function SearchInput({
  variant = "light",
  kbdHint,
  className,
  ...props
}: SearchInputProps) {
  const isDark = variant === "dark"

  return (
    <div className="relative w-full">
      <Search
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2",
          isDark ? "text-[var(--color-on-ink-muted)]" : "text-muted-foreground"
        )}
      />
      <input
        type="search"
        className={cn(
          "block w-full rounded-lg pl-10 text-sm transition-colors outline-none [&::-webkit-search-cancel-button]:appearance-none",
          kbdHint ? "pr-14" : "pr-3",
          isDark
            ? "h-10 border border-[var(--color-ink-border)] bg-[var(--overlay-on-dark-08)] text-[var(--color-on-ink)] placeholder:text-[var(--color-on-ink-muted)] focus-visible:border-[var(--color-on-ink)]"
            : "h-11 border border-border bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className
        )}
        {...props}
      />
      {kbdHint ? (
        <kbd
          className={cn(
            "pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border px-1.5 py-0.5 font-mono text-[0.6875rem] leading-none",
            isDark
              ? "border-[var(--color-ink-border)] text-[var(--color-on-ink-muted)]"
              : "border-border text-muted-foreground"
          )}
        >
          {kbdHint}
        </kbd>
      ) : null}
    </div>
  )
}
