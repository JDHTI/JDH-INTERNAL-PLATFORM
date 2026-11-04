"use client"

import { LenisProvider } from "@/intranet/components/providers/lenis-provider"
import { Toaster } from "@/intranet/components/ui/sonner"
import { TooltipProvider } from "@/intranet/components/ui/tooltip"

// Registers boneyard skeleton bones so every <Skeleton name="…"> resolves its
// captured layout. Side-effect import.
import "@/intranet/bones/registry"

/**
 * What the intranet mounted at its root, now only around the general view.
 * React Query and the theme come from the platform's `(app)` layout, shared
 * with the workspace.
 */
export function IntranetProviders({ children }: { children: React.ReactNode }) {
  return (
    <LenisProvider>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
    </LenisProvider>
  )
}
