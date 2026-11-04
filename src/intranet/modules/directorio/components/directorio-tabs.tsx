"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/intranet/lib/utils"

/**
 * Switch principal de la sección: Directorio de personas ↔ Directorio de
 * cumpleaños. Mismo patrón que `MarcaTabs` (`src/modules/marca/components`):
 * `<Link>` y no `Tabs` de shadcn a propósito — cada vista es una URL propia
 * (enlazable, compartible, con su propio `metadata`), no estado de cliente.
 *
 * Ambas rutas comparan con igualdad exacta (no por prefijo, a diferencia de
 * `MarcaTabs`): `/directorio/[id]` (perfil de un empleado) no debe activar
 * "Directorio de personas" — ese caso ni siquiera monta este componente, pero
 * la comparación exacta lo hace correcto por construcción.
 */
const TABS = [
  { label: "Directorio de personas", href: "/directorio" },
  { label: "Directorio de cumpleaños", href: "/directorio/cumpleanos" },
] as const

export function DirectorioTabs({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Vistas del directorio"
      className={cn(
        "flex items-center gap-6 border-b border-border",
        className
      )}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href

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
