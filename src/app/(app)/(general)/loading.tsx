import { Logo } from "@/intranet/components/common/logo"

/** Route-level loading state: the isotype, gently pulsing (CSS only). */
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Logo
        variant="mark"
        tone="auto"
        height={48}
        className="motion-safe:animate-pulse"
      />
    </div>
  )
}
