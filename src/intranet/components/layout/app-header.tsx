"use client"

import Link from "next/link"

import { Logo } from "@/intranet/components/common/logo"
import { ThemeSwitcher } from "@/intranet/components/common/theme-switcher"
import { notificacionesModule } from "@/intranet/modules/notificaciones/notificaciones.module"

import { GlobalSearch } from "./global-search"
import { MegaMenu } from "./mega-menu"
import { NotificationsPopover } from "./notifications-popover"
import { UserMenu } from "./user-menu"

/**
 * Intranet top bar (DESIGN.md §4.1) — black chrome, 68px. Orchestrates the
 * logo, global search, mega menu, theme switcher, notifications, and the user
 * menu. `relative` so the mega-menu panel can anchor to it and span the full
 * header width. Client component; no props cross the RSC boundary.
 *
 * No hamburger/drawer here — the mega menu is the *only* navigation surface
 * below `md` (it already lists every registered module, so nothing is lost).
 *
 * The mark is `full` at every breakpoint (same asset, same size, no
 * responsive swap) — `height={48}` is close to the ceiling the 68px bar
 * allows (a few px of breathing room above/below so it doesn't touch the
 * bottom border), same on mobile and desktop.
 */
export function AppHeader() {
  return (
    <header className="relative flex h-[68px] items-center gap-4 border-b border-[var(--color-ink-border)] bg-[var(--color-ink)] px-4 text-[var(--color-on-ink)] sm:px-6">
      <Link href="/" aria-label="Inicio" className="flex shrink-0 items-center">
        <Logo variant="full" tone="white" height={48} priority />
      </Link>

      <div className="hidden flex-1 justify-center md:flex">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex items-center gap-1 md:ml-0">
        <MegaMenu />
        <ThemeSwitcher variant="on-ink" />
        {notificacionesModule.enabled === false ? null : <NotificationsPopover />}
        <span
          aria-hidden
          className="mx-1 hidden h-7 w-px bg-[var(--color-ink-border)] sm:block"
        />
        <UserMenu />
      </div>
    </header>
  )
}
