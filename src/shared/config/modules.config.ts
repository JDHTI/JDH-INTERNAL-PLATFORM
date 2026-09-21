import {
  Home,
  MessageSquareWarning,
  Newspaper,
  Package,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface ModuleItem {
  id: string;
  name: string;
  path: string;
  category: ModuleCategory;
  icon: LucideIcon;
  /**
   * False renders the entry as a disabled "Próximamente" row instead of a link.
   * A nav item must never point at a route that does not exist.
   */
  available: boolean;
  /** Pinned modules anchor the breadcrumb trail and stay out of the grouped list. */
  pinned?: boolean;
}

export const MODULE_CATEGORIES = [
  "General",
  "Operación",
  "Comercial",
  "Organización",
] as const;

export type ModuleCategory = (typeof MODULE_CATEGORIES)[number];

/**
 * The module catalog. Icons are picked for what the module actually is, not for
 * a generic "app" look: PQRSF handles complaints and claims, so it carries the
 * warning-message glyph; CRM is about people, Catálogo about goods.
 *
 * Only PQRSF is scoped for the MVP. The rest are declared so the navigation
 * shows the real shape of the platform, and they are marked unavailable so they
 * render as disabled rows rather than links to nowhere.
 */
export const MODULES: ModuleItem[] = [
  {
    id: "inicio",
    name: "Inicio",
    path: "/",
    category: "General",
    icon: Home,
    available: true,
    pinned: true,
  },
  {
    id: "pqrsf",
    name: "PQRSF",
    path: "/pqrsf",
    category: "Operación",
    icon: MessageSquareWarning,
    available: true,
  },
  {
    id: "crm",
    name: "CRM",
    path: "/crm",
    category: "Comercial",
    icon: Users,
    available: false,
  },
  {
    id: "catalogo",
    name: "Catálogo",
    path: "/catalogo",
    category: "Comercial",
    icon: Package,
    available: false,
  },
  {
    id: "intranet",
    name: "Intranet",
    path: "/intranet",
    category: "Organización",
    icon: Newspaper,
    available: false,
  },
];

export function findModuleByPath(path: string): ModuleItem | undefined {
  return MODULES.find((m) => m.path === path);
}

export const HOME_PATH = MODULES.find((m) => m.pinned)?.path ?? "/";
