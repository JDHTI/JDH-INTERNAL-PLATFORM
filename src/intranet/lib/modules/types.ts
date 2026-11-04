import type { LucideIcon } from "lucide-react"

/**
 * Nav section a module can appear in within the intranet sidebar.
 * Extend this union to add new sidebar groupings.
 */
export type ModuleNavSection = "main" | "secondary"

/**
 * A single link inside a module's nav dropdown (the horizontal main-nav) or a
 * mega-menu group. `href` is a route template, cast to `Route` at the `<Link>`
 * site (typedRoutes) — sub-routes that don't exist yet are allowed here but
 * should be left commented until their page exists (they'd 404).
 */
export interface ModuleNavChild {
  label: string
  href: `/${string}`
  description?: string
}

export interface ModuleNavConfig {
  /** Sidebar group this module renders in. */
  section: ModuleNavSection
  /** Sort order within the section (ascending). */
  order: number
  /** Overrides the module `title` in the nav label, if set. */
  label?: string
  /**
   * Dropdown entries shown under this item in the horizontal main-nav. The
   * module owns its own dropdown (e.g. Documentos → Políticas, Manuales…).
   * Omit for a plain link.
   */
  children?: ModuleNavChild[]
  /** Trailing link after a separator in the dropdown (e.g. "Ver todo"). */
  childrenFooter?: ModuleNavChild
}

/**
 * The manifest every intranet module declares. Registering a module
 * (see `src/config/modules.ts`) is the ONLY step required for it to show
 * up in navigation, the homepage catalog, and permission checks — the
 * design goal is "drop a folder + register one manifest" scalability.
 *
 * A module never imports another module's internals; it exposes a public
 * surface via its `index.ts` barrel and declares intent through this
 * manifest. That keeps modules independently addable/removable.
 */
export interface ModuleDefinition {
  /** Stable unique id. Convention: matches the module folder and base route. */
  id: string
  /** Human-facing name (es-CO). */
  title: string
  /** Short description for catalogs / dashboard cards. */
  description?: string
  /** Base route the module owns, e.g. `/noticias`. */
  href: `/${string}`
  /** Icon shown in nav and cards. */
  icon: LucideIcon
  /** Nav placement. Omit for modules that should not appear in the sidebar. */
  nav?: ModuleNavConfig
  /**
   * Permissions required to access the module (RBAC). An empty/omitted list
   * means "any authenticated user". Values come from `src/config/permissions.ts`.
   */
  permissions?: string[]
  /** Feature flag. Defaults to `true`; set `false` to ship a module dark. */
  enabled?: boolean
}
