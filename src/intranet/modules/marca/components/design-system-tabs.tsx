"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/intranet/lib/utils"

/**
 * Sub-navegación del Design system: Fundamentos ↔ Componentes.
 *
 * Deliberadamente más discreta que `MarcaTabs` (pills en vez de subrayado) para
 * que no compita con el switch principal de la sección.
 */
const TABS = [
  { label: "Fundamentos", href: "/marca/design-system" },
  { label: "Componentes", href: "/marca/design-system/componentes" },
] as const

export function DesignSystemTabs({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Secciones del design system"
      className={cn("flex items-center gap-1", className)}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href

        return (
          <Link
            key={tab.href}
            href={tab.href as Route}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-[var(--jdh-radius-sm)] px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
