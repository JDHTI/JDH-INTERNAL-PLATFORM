"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/intranet/lib/utils"

/**
 * Switch principal de la sección: Manual de marca ↔ Design system.
 *
 * Son `<Link>` y no `Tabs` de shadcn a propósito — cada área es una URL propia
 * (enlazable, compartible, con su propio `metadata`), no estado de cliente.
 *
 * Va sobre el fondo de página, no es chrome fijo, así que usa tokens
 * semánticos (reactivos al tema) y NO los tokens paper de `MainNav`.
 */
const TABS = [
  { label: "Manual de marca", href: "/marca" },
  { label: "Design system", href: "/marca/design-system" },
] as const

export function MarcaTabs({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Áreas de marca e identidad"
      className={cn(
        "flex items-center gap-6 border-b border-border",
        className
      )}
    >
      {TABS.map((tab) => {
        // Prefijo: /marca/design-system/componentes también marca "Design system".
        // "/marca" solo coincide exacto, si no ganaría siempre.
        const active =
          tab.href === "/marca"
            ? pathname === "/marca"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)

        return (
          <Link
            key={tab.href}
            href={tab.href as Route}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 pb-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
