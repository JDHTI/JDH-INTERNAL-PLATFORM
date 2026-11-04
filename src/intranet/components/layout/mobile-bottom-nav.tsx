"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { modules } from "@/intranet/config/modules"
import { useCurrentUser } from "@/intranet/hooks/use-current-user"
import { cn } from "@/intranet/lib/utils"

/**
 * Mobile bottom navigation: the first four visible `main` modules as
 * icon+label tabs. Hidden from `md` up (the horizontal `MainNav` takes over
 * there).
 */
export function MobileBottomNav() {
  const pathname = usePathname()
  const { permissions } = useCurrentUser()
  const visibleIds = new Set(
    modules.visibleTo(permissions).map((mod) => mod.id)
  )
  const items = modules
    .navItems("main")
    .filter((mod) => visibleIds.has(mod.id))
    .slice(0, 4)

  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] grid grid-cols-4 border-t border-border bg-background md:hidden"
    >
      {items.map((mod) => {
        const Icon = mod.icon
        const active =
          pathname === mod.href || pathname.startsWith(`${mod.href}/`)

        return (
          <Link
            key={mod.id}
            href={mod.href as Route}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[0.6875rem] transition-colors",
              active ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className="size-[22px] shrink-0" />
            <span className="line-clamp-1 max-w-full px-1 text-center">
              {mod.nav?.label ?? mod.title}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
