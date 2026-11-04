"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/intranet/lib/utils"

import { PERFIL_NAV, type PerfilNavItem } from "../perfil.config"

/**
 * Rail permanente de `/perfil`, segmentado por grupo ("Configuración",
 * "Solicitudes" — crece agregando ítems/grupos a `PERFIL_NAV`). A diferencia
 * de `Sidebar` (chrome negro, navegación de app completa), este es un rail
 * claro embebido dentro del contenido de la ruta — mismo patrón visual que
 * las settings de GitHub/Slack, no el nav principal de la intranet.
 */
export function PerfilRail() {
  const pathname = usePathname()

  const isActive = (item: PerfilNavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`)

  return (
    <nav
      aria-label="Configuración de perfil"
      className="flex w-full shrink-0 flex-col gap-6 lg:w-56"
    >
      {PERFIL_NAV.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className="mb-1 px-3 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
            {group.title}
          </p>
          {group.items.map((item) => {
            const Icon = item.icon
            const active = isActive(item)

            return (
              <Link
                key={item.href}
                href={item.href as Route}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "text-muted-foreground hover:bg-accent hover:text-foreground",
                  active && "bg-accent text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
