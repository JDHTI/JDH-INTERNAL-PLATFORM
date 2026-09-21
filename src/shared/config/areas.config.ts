import {
  ArrowLeftRight,
  Banknote,
  BookOpen,
  Building2,
  Calculator,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FolderOpen,
  HandCoins,
  Handshake,
  KeyRound,
  Landmark,
  Laptop,
  LifeBuoy,
  Megaphone,
  MessageSquareWarning,
  Palette,
  ReceiptText,
  Server,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/**
 * An area is a company department with its own space and its own assigned
 * people. Every route in the platform belongs to exactly one area, so the
 * sidebar always has an area in context and the URL is the source of truth
 * for which one is active.
 */
export interface Area {
  id: string;
  name: string;
  path: string;
  /** Square mark in the switcher. Chosen for what the department does. */
  icon: LucideIcon;
  /** One line describing the area's remit, shown on its overview page. */
  remit: string;
}

export const MODULE_CATEGORIES = [
  "Operación",
  "Reportes",
  "Documentación",
  "Maestros",
  "Configuración",
] as const;

export type ModuleCategory = (typeof MODULE_CATEGORIES)[number];

export interface ModuleItem {
  id: string;
  name: string;
  path: string;
  areaId: string;
  category: ModuleCategory;
  icon: LucideIcon;
  /**
   * False renders the module as a disabled "Próximamente" row instead of a
   * link. A nav item must never point at a route that does not exist.
   */
  available: boolean;
}

export const AREAS: Area[] = [
  {
    id: "ti",
    name: "TI",
    path: "/ti",
    icon: Server,
    remit: "Infraestructura, soporte y accesos de la compañía.",
  },
  {
    id: "calidad",
    name: "Calidad",
    path: "/calidad",
    icon: ClipboardCheck,
    remit: "PQRSF, auditorías y documentación del sistema de gestión.",
  },
  {
    id: "tesoreria",
    name: "Tesorería",
    path: "/tesoreria",
    icon: Landmark,
    remit: "Pagos, bancos y disponibilidad de efectivo.",
  },
  {
    id: "cartera",
    name: "Cartera",
    path: "/cartera",
    icon: HandCoins,
    remit: "Recaudo, acuerdos de pago y edades de cartera.",
  },
  {
    id: "mercadeo",
    name: "Mercadeo",
    path: "/mercadeo",
    icon: Megaphone,
    remit: "Campañas, material POP y marca.",
  },
  {
    id: "contabilidad",
    name: "Contabilidad",
    path: "/contabilidad",
    icon: Calculator,
    remit: "Causación, cierres y activos fijos.",
  },
];

/**
 * Module catalog. Only PQRSF is scoped for the MVP; the rest are declared so
 * the navigation shows the real shape of each area, and are marked
 * unavailable so they render as disabled rows rather than links to nowhere.
 */
export const MODULES: ModuleItem[] = [
  // ── TI ──
  {
    id: "ti-soporte",
    name: "Solicitudes de soporte",
    path: "/ti/soporte",
    areaId: "ti",
    category: "Operación",
    icon: LifeBuoy,
    available: false,
  },
  {
    id: "ti-equipos",
    name: "Inventario de equipos",
    path: "/ti/equipos",
    areaId: "ti",
    category: "Operación",
    icon: Laptop,
    available: false,
  },
  {
    id: "ti-accesos",
    name: "Accesos y permisos",
    path: "/ti/accesos",
    areaId: "ti",
    category: "Configuración",
    icon: KeyRound,
    available: false,
  },

  // ── Calidad ──
  {
    id: "calidad-pqrsf",
    name: "PQRSF",
    path: "/calidad/pqrsf",
    areaId: "calidad",
    category: "Operación",
    icon: MessageSquareWarning,
    available: true,
  },
  {
    id: "calidad-auditorias",
    name: "Auditorías",
    path: "/calidad/auditorias",
    areaId: "calidad",
    category: "Operación",
    icon: ClipboardList,
    available: false,
  },
  {
    id: "calidad-sig",
    name: "Documentos SIG",
    path: "/calidad/documentos",
    areaId: "calidad",
    category: "Documentación",
    icon: FolderOpen,
    available: false,
  },

  // ── Tesorería ──
  {
    id: "tesoreria-pagos",
    name: "Pagos a proveedores",
    path: "/tesoreria/pagos",
    areaId: "tesoreria",
    category: "Operación",
    icon: Banknote,
    available: false,
  },
  {
    id: "tesoreria-conciliacion",
    name: "Conciliación bancaria",
    path: "/tesoreria/conciliacion",
    areaId: "tesoreria",
    category: "Operación",
    icon: ArrowLeftRight,
    available: false,
  },
  {
    id: "tesoreria-flujo",
    name: "Flujo de caja",
    path: "/tesoreria/flujo-de-caja",
    areaId: "tesoreria",
    category: "Reportes",
    icon: TrendingUp,
    available: false,
  },

  // ── Cartera ──
  {
    id: "cartera-cxc",
    name: "Cuentas por cobrar",
    path: "/cartera/cuentas-por-cobrar",
    areaId: "cartera",
    category: "Operación",
    icon: ReceiptText,
    available: false,
  },
  {
    id: "cartera-acuerdos",
    name: "Acuerdos de pago",
    path: "/cartera/acuerdos",
    areaId: "cartera",
    category: "Operación",
    icon: Handshake,
    available: false,
  },
  {
    id: "cartera-edades",
    name: "Edades de cartera",
    path: "/cartera/edades",
    areaId: "cartera",
    category: "Reportes",
    icon: CalendarClock,
    available: false,
  },

  // ── Mercadeo ──
  {
    id: "mercadeo-campanas",
    name: "Campañas",
    path: "/mercadeo/campanas",
    areaId: "mercadeo",
    category: "Operación",
    icon: Target,
    available: false,
  },
  {
    id: "mercadeo-pop",
    name: "Material POP",
    path: "/mercadeo/material-pop",
    areaId: "mercadeo",
    category: "Documentación",
    icon: Palette,
    available: false,
  },

  // ── Contabilidad ──
  {
    id: "contabilidad-causacion",
    name: "Causación",
    path: "/contabilidad/causacion",
    areaId: "contabilidad",
    category: "Operación",
    icon: BookOpen,
    available: false,
  },
  {
    id: "contabilidad-cierres",
    name: "Cierres mensuales",
    path: "/contabilidad/cierres",
    areaId: "contabilidad",
    category: "Operación",
    icon: CalendarCheck,
    available: false,
  },
  {
    id: "contabilidad-activos",
    name: "Activos fijos",
    path: "/contabilidad/activos-fijos",
    areaId: "contabilidad",
    category: "Maestros",
    icon: Building2,
    available: false,
  },
];

export const DEFAULT_AREA = AREAS[0];

export function findAreaById(areaId: string): Area | undefined {
  return AREAS.find((area) => area.id === areaId);
}

/** Resolves the area that owns a pathname, e.g. /calidad/pqrsf → Calidad. */
export function findAreaByPathname(pathname: string): Area | undefined {
  const [, firstSegment] = pathname.split("/");
  return AREAS.find((area) => area.id === firstSegment);
}

export function findModuleByPath(path: string): ModuleItem | undefined {
  return MODULES.find((module) => module.path === path);
}

export function getModulesByArea(areaId: string): ModuleItem[] {
  return MODULES.filter((module) => module.areaId === areaId);
}
