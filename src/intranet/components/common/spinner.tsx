import { cn } from "@/intranet/lib/utils"

const sizeClasses = {
  sm: "size-4 border-2",
  md: "size-5 border-2",
  lg: "size-6 border-[3px]",
} as const

/**
 * Monochrome loading spinner. Pure CSS (no icon dependency); inherits the
 * current text color via `border-current`. Respects reduced-motion globally.
 */
export function Spinner({
  size = "md",
  className,
}: {
  size?: keyof typeof sizeClasses
  className?: string
}) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        "inline-block animate-spin rounded-full border-current border-t-transparent",
        sizeClasses[size],
        className
      )}
    />
  )
}
