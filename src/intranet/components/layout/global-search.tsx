"use client"

import { SearchInput } from "@/intranet/components/forms/search-input"
import { cn } from "@/intranet/lib/utils"

/**
 * Global search field for the black header. Visual-only for now (the ⌘K hint
 * is decorative); wire it to a command palette / search route later.
 */
export function GlobalSearch({ className }: { className?: string }) {
  return (
    <div className={cn("w-full max-w-[440px]", className)}>
      <SearchInput
        variant="dark"
        placeholder="Buscar en la intranet"
        kbdHint="⌘K"
        aria-label="Buscar en la intranet"
      />
    </div>
  )
}
