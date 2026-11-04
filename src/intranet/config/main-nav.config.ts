import type { MainNavItem } from "@/intranet/lib/navigation"

/**
 * Non-module entries for the horizontal main navigation. Real modules come
 * from the registry (`src/config/modules.ts`); this array is for entries
 * that are NOT an employee-facing module.
 *
 * "Solicitud de vacaciones" used to live here as a disabled placeholder
 * entry. It's now the real `vacaciones` module (`src/modules/vacaciones/`,
 * `order: 65`), so it moved to the registry — this array is empty until the
 * next non-module entry is needed.
 *
 * "Sistemas corporativos" and "Administración" were removed from this bar:
 * the bar is a curated set of quick-access items, not a listing of every
 * module/surface — admin is reached directly, not from here.
 *
 * Merged with the registry by `resolveMainNav` inside the client `MainNav`.
 * Icons live here (functions) and are only ever consumed client-side.
 */
export const mainNavExtras: MainNavItem[] = []
