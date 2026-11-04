import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/intranet/lib/utils"

/**
 * Non-interactive status/marker badges (DESIGN.md monochrome — status is never
 * conveyed by color alone; the label carries the meaning):
 *  - `dot`    — pill with a leading status dot ("Activo", "En revisión").
 *  - `count`  — small numeric pill (notification counters). Filled ink by
 *               default; on black chrome pass an inverted className.
 *  - `region` — small overlay pill placed over card media.
 *
 * `tone` is an opt-in exception to the monochrome rule — same precedent as
 * `--destructive` (DESIGN.md §2). Defaults to `neutral` (today's look), so
 * every existing call site is unchanged unless it explicitly opts in. Only
 * affects the `dot` variant; `count`/`region` keep their filled-ink look
 * regardless of `tone`. Use where a flow was explicitly asked to carry
 * meaning through color as well as the label (e.g. vacation-request status).
 */
const statusBadgeVariants = cva(
  "inline-flex items-center font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        dot: "h-7 gap-2 rounded-full border px-3 text-xs",
        count:
          "h-5 min-w-5 justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground",
        region:
          "h-6 rounded-full bg-primary px-2.5 text-xs text-primary-foreground",
      },
      tone: {
        neutral: "",
        success: "",
        warning: "",
        info: "",
        danger: "",
      },
    },
    compoundVariants: [
      {
        variant: "dot",
        tone: "neutral",
        class: "border-[var(--color-border-strong)] text-foreground",
      },
      {
        variant: "dot",
        tone: "success",
        class:
          "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
      },
      {
        variant: "dot",
        tone: "warning",
        class:
          "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
      },
      {
        variant: "dot",
        tone: "info",
        class:
          "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
      },
      {
        variant: "dot",
        tone: "danger",
        class:
          "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
      },
    ],
    defaultVariants: {
      variant: "dot",
      tone: "neutral",
    },
  }
)

export interface StatusBadgeProps
  extends
    React.ComponentProps<"span">,
    VariantProps<typeof statusBadgeVariants> {}

export function StatusBadge({
  variant = "dot",
  tone = "neutral",
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ variant, tone }), className)}
      {...props}
    >
      {variant === "dot" ? (
        <span aria-hidden className="size-2 rounded-full bg-current" />
      ) : null}
      {children}
    </span>
  )
}

export { statusBadgeVariants }
