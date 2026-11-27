"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/intranet/lib/utils"

import {
  CONTROL_DOCUMENTAL_PATH,
  SIG_BASE_PATH,
  SIG_MODULOS,
  sigModuloHref,
} from "../sig.config"

const TABS = [
  { label: "Todo el SIG", href: SIG_BASE_PATH, paso: null },
  ...SIG_MODULOS.map((modulo, index) => ({
    label: modulo.title,
    href: sigModuloHref(modulo.slug),
    paso: index + 1,
  })),
  { label: "Control documental", href: CONTROL_DOCUMENTAL_PATH, paso: null },
]

/**
 * Navegación propia del SIG: el recorrido completo (`/sig`), cada módulo por
 * separado y el control documental. Mismo patrón que `MarcaTabs`: enlaces a
 * URLs propias, no estado de cliente. Los módulos llevan su número porque el
 * recorrido tiene un orden (cultura primero); abrir uno suelto no lo rompe.
 *
 * En pantallas angostas la fila se desplaza en horizontal en vez de partirse
 * en varias líneas.
 */
export function SigTabs() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Secciones del SIG"
      data-lenis-prevent-horizontal
      className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max items-end gap-6 border-b border-border">
        {TABS.map((tab) => {
          // "/sig" solo coincide exacto; un módulo también queda activo en sus
          // páginas de lectura (/sig/gestion/politica-de-calidad).
          const active =
            tab.href === SIG_BASE_PATH || tab.href === CONTROL_DOCUMENTAL_PATH
              ? pathname === tab.href
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`)

          return (
            <li key={tab.href}>
              <Link
                href={tab.href as Route}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.paso ? (
                  <span aria-hidden className="font-mono text-xs">
                    {tab.paso}
                  </span>
                ) : null}
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
