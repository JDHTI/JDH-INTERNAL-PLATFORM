import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/intranet/lib/utils"

import { Spinner } from "./spinner"

/**
 * The JDH button. A purpose-built cva (not a re-skin of `ui/button`) so heights
 * and variants match DESIGN.md §4.3 exactly: the shadcn button ships a smaller
 * scale (h-8 default) and lacks the on-ink variants the black chrome needs, so
 * overriding it via className would be more fragile than owning the variants.
 * `ui/button` stays untouched as the internal dependency of shadcn compounds
 * (dialog, dropdown, …). This is THE button for app UI.
 *
 * Variants (DESIGN.md §4.3): primary = black (max one per decision block);
 * secondary = outlined; ghost/link = low emphasis; destructive = the single
 * color exception; primary-on-ink / outline-on-ink = for use on black chrome.
 */
const jdhButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent font-medium whitespace-nowrap outline-none transition-[background-color,color,border-color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-[var(--color-ink-hover)] dark:border-[var(--color-ink-border)]",
        secondary:
          "border-[var(--color-border-strong)] text-foreground hover:border-foreground hover:bg-accent",
        ghost: "text-foreground hover:bg-accent",
        link: "text-foreground underline decoration-1 underline-offset-2 hover:decoration-2",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20",
        "primary-on-ink":
          "bg-[var(--color-on-ink)] text-[var(--color-ink)] ring-offset-transparent hover:bg-[var(--color-on-ink-muted)] focus-visible:ring-[var(--color-focus-on-ink)]",
        "outline-on-ink":
          "border-[var(--color-ink-border)] text-[var(--color-on-ink)] ring-offset-transparent hover:bg-[var(--overlay-on-dark-08)] focus-visible:ring-[var(--color-focus-on-ink)]",
      },
      size: {
        sm: "h-8 px-4 text-sm",
        md: "h-10 px-6 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "size-10",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface JdhButtonProps
  extends
    React.ComponentProps<"button">,
    VariantProps<typeof jdhButtonVariants> {
  asChild?: boolean
  /** Shows a spinner, disables the button, and sets aria-busy. */
  loading?: boolean
}

function JdhButton({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: JdhButtonProps) {
  const Comp = asChild ? Slot.Root : "button"

  // Slot requires a single child, so we don't inject a spinner when asChild.
  const content = asChild ? (
    children
  ) : (
    <>
      {loading ? <Spinner size={size === "lg" ? "md" : "sm"} /> : null}
      {children}
    </>
  )

  return (
    <Comp
      data-slot="jdh-button"
      data-variant={variant}
      className={cn(jdhButtonVariants({ variant, size, className }))}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </Comp>
  )
}

export { JdhButton, jdhButtonVariants }
