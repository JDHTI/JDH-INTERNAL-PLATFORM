import { hasAll } from "@/intranet/config/permissions"

import type { ModuleDefinition, ModuleNavSection } from "./types"

/**
 * Identity helper that gives a module manifest its type and enables
 * editor autocomplete at the definition site. Every module's
 * `<id>.module.ts` wraps its manifest in this.
 */
export function defineModule(definition: ModuleDefinition): ModuleDefinition {
  return definition
}

export interface ModuleRegistry {
  /** All enabled modules, in registration order. */
  all: ModuleDefinition[]
  /** Look up a module by id (undefined if disabled or unknown). */
  byId: (id: string) => ModuleDefinition | undefined
  /** Enabled modules for a nav section, sorted ascending by `nav.order`. */
  navItems: (section: ModuleNavSection) => ModuleDefinition[]
  /**
   * Enabled modules the given permission set can access. A module with an
   * empty/omitted `permissions` list is visible to any authenticated user.
   */
  visibleTo: (permissions: readonly string[]) => ModuleDefinition[]
}

/**
 * Builds the registry from the list of registered modules. Disabled
 * modules (`enabled: false`) are filtered out once, here, so every
 * consumer sees only live modules.
 */
export function createRegistry(modules: ModuleDefinition[]): ModuleRegistry {
  const enabled = modules.filter((m) => m.enabled !== false)

  return {
    all: enabled,
    byId: (id) => enabled.find((m) => m.id === id),
    navItems: (section) =>
      enabled
        .filter((m) => m.nav?.section === section)
        .sort((a, b) => a.nav!.order - b.nav!.order),
    visibleTo: (permissions) =>
      enabled.filter((m) => hasAll(permissions, m.permissions ?? [])),
  }
}
