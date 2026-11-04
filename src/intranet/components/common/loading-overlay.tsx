import { cn } from "@/intranet/lib/utils"

import { Spinner } from "./spinner"

/**
 * Full-surface loading overlay (DESIGN.md: login "Redirigiendo…" pattern).
 * Absolutely positioned — the nearest positioned ancestor must be `relative`.
 */
export function LoadingOverlay({
  label,
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm",
        className
      )}
    >
      <Spinner size="lg" />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  )
}
