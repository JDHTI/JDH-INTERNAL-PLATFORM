import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Database,
  FolderKanban,
  FolderOpen,
  HandCoins,
  Handshake,
  History,
  KeyRound,
  Laptop,
  Lightbulb,
  LifeBuoy,
  MessageSquareWarning,
  Palette,
  ReceiptText,
  Settings,
  Target,
  TrendingUp,
  ShieldCheck,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";

import {
  COMMERCIAL_MASTERS,
  MASTERS_SEGMENT,
} from "@/features/commercial-masters/config/masters.config";

/*
 * Areas themselves come from the API (features/areas). This file keeps what
 * the API does not know about: the module catalog of each area, indexed by
 * area slug, and the platform-wide utility links.
 */

/**
 * Sidebar order, top to bottom. Documentación closes the list: it is in every
 * area, so it goes last and the area's own modules stay together above it.
 */
export const MODULE_CATEGORIES = [
  "Operación",
  "Reportes",
  "Maestros",
  // Not "Configuración": that label already belongs to the platform-wide
  // utility link in the footer, and two different things under one word in
  // the same sidebar is a coin toss for the user.
  "Administración",
  "Documentación",
] as const;

export type ModuleCategory = (typeof MODULE_CATEGORIES)[number];

export interface ModuleSubItem {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  /** Only shown to the module's managers; the page itself enforces it too. */
  managerOnly?: boolean;
  /** Shows a live count beside the label; the sidebar knows how to fetch each kind. */
  badge?: "feedback-unread";
}

export interface ModuleItem {
  id: string;
  name: string;
  path: string;
  areaSlug: string;
  category: ModuleCategory;
  icon: LucideIcon;
  /**
   * False renders the module as a disabled "Próximamente" row instead of a
   * link. A nav item must never point at a route that does not exist.
   */
  available: boolean;
  /** Pages under the module; they turn its row into an expandable one. */
  subItems?: ModuleSubItem[];
  /**
   * False when the module has no screen at its own path: its row only opens
   * and closes its pages, and nothing links to `path`. Defaults to true, so a
   * module with pages that also has a landing screen needs no flag.
   */
  hasPage?: boolean;
}

/**
 * Whether the route is the module's own screen or a page under it. A module
 * with no screen of its own matches only its pages. When modules nest, use
 * `activeModuleId`, which picks the most specific one.
 */
export function isModuleActive(module: ModuleItem, pathname: string): boolean {
  if (module.hasPage === false) return pathname.startsWith(`${module.path}/`);
  return pathname === module.path || pathname.startsWith(`${module.path}/`);
}

/**
 * The module a route belongs to: the one whose path is the route or a prefix of
 * it, and the longest such path when several match. A page under a module (a
 * file opened from the order validator, say) keeps that module selected, while
 * /apoyos/casos-especiales selects Casos especiales and not Maestro de apoyos.
 */
export function activeModuleId(modules: ModuleItem[], pathname: string): string | null {
  let best: ModuleItem | null = null;
  for (const candidate of modules) {
    const matches = pathname === candidate.path || pathname.startsWith(`${candidate.path}/`);
    if (matches && (best === null || candidate.path.length > best.path.length)) best = candidate;
  }
  return best?.id ?? null;
}

/** Where a link to the module goes: its own screen, or its first page when it has none. */
export function moduleHref(module: ModuleItem): string {
  if (module.hasPage === false) return module.subItems?.[0]?.path ?? module.path;
  return module.path;
}

/**
 * Module catalog. Only PQRSF is scoped for the MVP; the rest are declared so
 * the navigation shows the real shape of each area, and are marked
 * unavailable so they render as disabled rows rather than links to nowhere.
 * The document manager is not listed here: every area gets it, see
 * `getModulesByArea`.
 */
export const MODULES: ModuleItem[] = [
  // ── TI ──
  {
    id: "ti-soporte",
    name: "Solicitudes de soporte",
    path: "/ti/soporte",
    areaSlug: "ti",
    category: "Operación",
    icon: LifeBuoy,
    // Real page behind it, unlike the rest of TI's modules: it's also where
    // the header's help icon links, so it can't be a 404 (R-24).
    available: true,
  },
  {
    id: "ti-proyectos",
    name: "Proyectos",
    path: "/ti/proyectos",
    areaSlug: "ti",
    category: "Operación",
    icon: FolderKanban,
    // The API enables it per area (PROJECTS_AREA_SLUGS) and today that is
    // only TI; another area gets an entry here when the API turns it on.
    available: true,
  },
  {
    id: "ti-equipos",
    name: "Inventario de equipos",
    path: "/ti/equipos",
    areaSlug: "ti",
    category: "Operación",
    icon: Laptop,
    available: false,
  },
  {
    id: "ti-accesos",
    name: "Accesos y permisos",
    path: "/ti/accesos",
    areaSlug: "ti",
    category: "Administración",
    icon: KeyRound,
    available: false,
  },

  // ── Calidad ──
  {
    id: "calidad-pqrsf",
    name: "PQRSF",
    path: "/calidad/pqrsf",
    areaSlug: "calidad",
    category: "Operación",
    icon: MessageSquareWarning,
    available: true,
    subItems: [
      {
        id: "calidad-pqrsf-sugerencias",
        name: "Sugerencias y felicitaciones",
        path: "/calidad/pqrsf/sugerencias",
        icon: ThumbsUp,
        managerOnly: true,
        badge: "feedback-unread",
      },
      {
        id: "calidad-pqrsf-historial",
        name: "Historial",
        path: "/calidad/pqrsf/historial",
        icon: History,
        managerOnly: true,
      },
      {
        id: "calidad-pqrsf-configuracion",
        name: "Configuración",
        path: "/calidad/pqrsf/configuracion",
        icon: Settings,
        managerOnly: true,
      },
    ],
  },
  {
    id: "calidad-auditorias",
    name: "Auditorías",
    path: "/calidad/auditorias",
    areaSlug: "calidad",
    category: "Operación",
    icon: ClipboardList,
    available: false,
  },

  // ── Tesorería ──
  {
    id: "tesoreria-pagos",
    name: "Pagos a proveedores",
    path: "/tesoreria/pagos",
    areaSlug: "tesoreria",
    category: "Operación",
    icon: Banknote,
    available: false,
  },
  {
    id: "tesoreria-conciliacion",
    name: "Conciliación bancaria",
    path: "/tesoreria/conciliacion",
    areaSlug: "tesoreria",
    category: "Operación",
    icon: ArrowLeftRight,
    available: false,
  },
  {
    id: "tesoreria-flujo",
    name: "Flujo de caja",
    path: "/tesoreria/flujo-de-caja",
    areaSlug: "tesoreria",
    category: "Reportes",
    icon: TrendingUp,
    available: false,
  },

  // ── Cartera ──
  {
    id: "cartera-cxc",
    name: "Cuentas por cobrar",
    path: "/cartera/cuentas-por-cobrar",
    areaSlug: "cartera",
    category: "Operación",
    icon: ReceiptText,
    available: false,
  },
  {
    id: "cartera-acuerdos",
    name: "Acuerdos de pago",
    path: "/cartera/acuerdos",
    areaSlug: "cartera",
    category: "Operación",
    icon: Handshake,
    available: false,
  },
  {
    id: "cartera-edades",
    name: "Edades de cartera",
    path: "/cartera/edades",
    areaSlug: "cartera",
    category: "Reportes",
    icon: CalendarClock,
    available: false,
  },

  // ── Mercadeo ──
  {
    id: "mercadeo-campanas",
    name: "Campañas",
    path: "/mercadeo/campanas",
    areaSlug: "mercadeo",
    category: "Operación",
    icon: Target,
    available: false,
  },
  {
    id: "mercadeo-pop",
    name: "Material POP",
    path: "/mercadeo/material-pop",
    areaSlug: "mercadeo",
    category: "Documentación",
    icon: Palette,
    available: false,
  },

  // ── Contabilidad ──
  {
    id: "contabilidad-causacion",
    name: "Causación",
    path: "/contabilidad/causacion",
    areaSlug: "contabilidad",
    category: "Operación",
    icon: BookOpen,
    available: false,
  },
  {
    id: "contabilidad-cierres",
    name: "Cierres mensuales",
    path: "/contabilidad/cierres",
    areaSlug: "contabilidad",
    category: "Operación",
    icon: CalendarCheck,
    available: false,
  },
  {
    id: "contabilidad-activos",
    name: "Activos fijos",
    path: "/contabilidad/activos-fijos",
    areaSlug: "contabilidad",
    category: "Maestros",
    icon: Building2,
    available: false,
  },

  // ── BI ──
  {
    id: "bi-validador-pedidos",
    name: "Validador de pedidos",
    path: "/bi/validador-pedidos",
    areaSlug: "bi",
    category: "Operación",
    icon: ClipboardCheck,
    available: true,
  },
  {
    id: "bi-apoyos",
    name: "Maestro de apoyos",
    path: "/bi/apoyos",
    areaSlug: "bi",
    category: "Maestros",
    icon: HandCoins,
    available: true,
  },
  {
    id: "bi-casos-especiales",
    name: "Casos especiales",
    path: "/bi/apoyos/casos-especiales",
    areaSlug: "bi",
    category: "Maestros",
    icon: ClipboardList,
    available: true,
  },
  {
    id: "bi-maestros",
    name: "Maestros generales",
    path: `/bi/${MASTERS_SEGMENT}`,
    areaSlug: "bi",
    category: "Maestros",
    icon: Database,
    available: true,
    // No screen of its own: a click on the row only opens the dropdown, and the
    // dropdown is the only way to a master. Set to true (and add a page at the
    // module's path) to give it a landing page again.
    hasPage: false,
    subItems: COMMERCIAL_MASTERS.map((master) => ({
      id: `bi-maestros-${master.key}`,
      name: master.name,
      path: `/bi/${MASTERS_SEGMENT}/${master.key}`,
      icon: master.icon,
    })),
  },
];

export const DOCUMENTS_SEGMENT = "documentos";

/**
 * The document manager exists in every area the API returns, including one
 * created in the database after this file was written, so it is generated
 * from the slug rather than declared area by area.
 */
export function documentsModule(areaSlug: string): ModuleItem {
  return {
    id: `${areaSlug}-documentos`,
    name: "Gestor documental",
    path: `/${areaSlug}/${DOCUMENTS_SEGMENT}`,
    areaSlug,
    category: "Documentación",
    icon: FolderOpen,
    available: true,
  };
}

export function getModulesByArea(areaSlug: string): ModuleItem[] {
  return [
    ...MODULES.filter((module) => module.areaSlug === areaSlug),
    documentsModule(areaSlug),
  ];
}

export function findModuleByPath(path: string): ModuleItem | undefined {
  const [, areaSlug] = path.split("/");
  if (!areaSlug) return undefined;
  return getModulesByArea(areaSlug).find((module) => module.path === path);
}

/**
 * Module pages live under the dynamic `[area]` segment, so `/[area]/pqrsf`
 * would also answer for /ti/pqrsf. A page calls this to exist only where the
 * catalog declares it.
 */
export function isAvailableModule(areaSlug: string, segment: string): boolean {
  return findModuleByPath(`/${areaSlug}/${segment}`)?.available === true;
}

/**
 * Platform-wide destinations that do not belong to any single area. They sit
 * in the sidebar footer, above the theme switch, and stay in place as the
 * user moves between areas.
 */
export interface UtilityLink {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
}

export const UTILITY_LINKS: UtilityLink[] = [
  {
    id: "sugerencias",
    name: "Sugerencias",
    path: "/sugerencias",
    icon: Lightbulb,
  },
  {
    id: "configuracion",
    name: "Configuración",
    path: "/configuracion",
    icon: Settings,
  },
];

export const ADMIN_LINK: UtilityLink = {
  id: "administracion",
  name: "Panel administrador",
  path: "/administracion",
  icon: ShieldCheck,
};

export function findUtilityLinkByPath(path: string): UtilityLink | undefined {
  return [...UTILITY_LINKS, ADMIN_LINK].find((link) => link.path === path);
}
