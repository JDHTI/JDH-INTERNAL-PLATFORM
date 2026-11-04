import type { LucideIcon } from "lucide-react"

import type { ModuleNavChild, ModuleRegistry } from "@/intranet/lib/modules"

/** A plain navigation link (dropdowns, mega-menu, footer). */
export type NavLink = ModuleNavChild

/**
 * A resolved item in the horizontal main navigation (the bar under the
 * header). Produced by {@link resolveMainNav} from the module registry plus
 * the non-module extras in `src/config/main-nav.config.ts`.
 *
 * Carries a `LucideIcon` (a function) so it must only ever be built and
 * consumed inside a Client Component — never passed across the RSC boundary.
 */
export interface MainNavItem {
  /** Stable key (module id, or an explicit id for extras). */
  id: string
  label: string
  /** Base route. Omit for a pure dropdown parent with no landing page. */
  href?: `/${string}`
  icon: LucideIcon
  /** Ascending sort order across modules + extras. */
  order: number
  /** Dropdown entries (module-owned or config-owned). */
  children?: NavLink[]
  /** Trailing link after a separator in the dropdown. */
  childrenFooter?: NavLink
  /** Rendered muted + non-interactive, with a tooltip reason. */
  disabled?: boolean
  disabledReason?: string
  /** Shows a lock icon (permission-gated surface, e.g. Administración). */
  locked?: boolean
  /** `"end"` pushes the item to the right edge (margin-left:auto). */
  align?: "start" | "end"
}

/**
 * Merges the registry's `main`-section modules with the non-module extras
 * (disabled/locked items declared in config) into one ordered list.
 *
 * Pure: takes both inputs explicitly so it has no import cycle with the
 * config and stays trivially testable. Call it from the client `MainNav`,
 * which already imports the registry and the extras directly.
 *
 * `permissions` gates module-derived items via `registry.visibleTo` — an
 * omitted/empty list hides every module with a non-empty `permissions`
 * requirement (fail-closed, matching "no session yet" while `useSession` is
 * still pending). `extras` (config-only items) are never gated here.
 */
export function resolveMainNav(
  registry: ModuleRegistry,
  extras: MainNavItem[] = [],
  permissions: readonly string[] = []
): MainNavItem[] {
  const visibleIds = new Set(
    registry.visibleTo(permissions).map((mod) => mod.id)
  )
  const fromModules: MainNavItem[] = registry
    .navItems("main")
    .filter((mod) => visibleIds.has(mod.id))
    .map((mod) => ({
      id: mod.id,
      label: mod.nav?.label ?? mod.title,
      href: mod.href,
      icon: mod.icon,
      order: mod.nav?.order ?? 0,
      children: mod.nav?.children,
      childrenFooter: mod.nav?.childrenFooter,
    }))

  const alignRank = (item: MainNavItem) => (item.align === "end" ? 1 : 0)

  return [...fromModules, ...extras].sort(
    (a, b) => alignRank(a) - alignRank(b) || a.order - b.order
  )
}
