import {
  Activity,
  AppWindow,
  ArrowLeftRight,
  Banknote,
  Blocks,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Contact,
  MapPin,
  UserCog,
  Calculator,
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
  Hourglass,
  KeyRound,
  Laptop,
  LifeBuoy,
  ListChecks,
  ListRestart,
  MessageSquareWarning,
  Palette,
  ReceiptText,
  Settings,
  Target,
  TrendingUp,
  ShieldCheck,
  ThumbsUp,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import {
  COMMERCIAL_MASTERS,
  MASTERS_SEGMENT,
} from "@/features/commercial-masters/config/masters.config";

/** Data warehouse monitoring: its summary and the pages under it. */
export const DWH_SEGMENT = "datawarehouse";

/** The general board: the applications and the data warehouse on one screen. */
export const BOARD_SEGMENT = "monitoreo";

/** Monitored applications, and each one's page under it. */
export const APPS_SEGMENT = "aplicativos";

/**
 * Supplier support requests. Whether the page is the review tray or the
 * person's own requests comes from GET /supplier-supports/permissions.
 */
export const SUPPORT_REQUESTS_SEGMENT = "solicitudes-apoyos";

/** Where the typed commercial masters (margins, product edits) live, besides the generic ones. */
export const COMMERCIAL_MASTERS_AREA_SLUG = "bi";

/** Platform administration is a TI module, not a third place outside the workspace. */
export const ADMIN_AREA_SLUG = "ti";
export const ADMIN_SEGMENT = "administracion";
export const ADMIN_PATH = `/${ADMIN_AREA_SLUG}/${ADMIN_SEGMENT}`;

export const ADMIN_SECTIONS = [
  { key: "areas", name: "Áreas y equipos", icon: Users },
  { key: "modulos", name: "Módulos por área", icon: Blocks },
  { key: "usuarios", name: "Usuarios de la plataforma", icon: UserCog },
  { key: "directorio", name: "Directorio de empleados", icon: Contact },
  { key: "sedes", name: "Sedes", icon: MapPin },
  { key: "vendedores", name: "Vendedores", icon: BriefcaseBusiness },
  { key: "maestros", name: "Maestros", icon: Database },
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number]["key"];

/*
 * Areas themselves come from the API (features/areas), and so does which
 * modules each one has switched on (`my_modules`). This file keeps what the
 * API does not know about: how each module looks in the navigation, the
 * area-specific rows that are not API modules, and the utility links.
 */

/**
 * Sidebar order, top to bottom. Documentación closes the list: it is in every
 * area, so it goes last and the area's own modules stay together above it.
 */
export const MODULE_CATEGORIES = [
  "Operación",
  "Reportes",
  "Monitoreo",
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
  /** Only platform administrators see the row; the pages enforce it too. */
  adminOnly?: boolean;
  /**
   * API module key (`GET /permissions/catalog`). Shown and opened only when
   * the area has it switched on and the person's role grants it; absent
   * means a row of this area alone, open to every member.
   */
  permission?: string;
}

/**
 * The modules of an area the person may see: the ones `my_modules` lists
 * (switched on in the area and granted by the role), the area's own rows, and
 * administration for admins. Unavailable rows stay as "Próximamente".
 */
export function visibleModules(
  area: { slug: string; myModules: Record<string, string> },
  isAdmin: boolean
): ModuleItem[] {
  return getModulesByArea(area.slug).filter(
    (module) =>
      (!module.adminOnly || isAdmin) &&
      (module.permission === undefined || module.permission in area.myModules)
  );
}

/** Slugs the UI routes itself, so an area can never take them. */
export const UI_RESERVED_SLUGS = ["workspace", "login", "api", "completar-perfil"] as const;

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
 * Rows that belong to one area and are not API modules: TI's support and
 * administration, and the "Próximamente" placeholders that show the shape
 * each area will take.
 */
const AREA_ROWS: ModuleItem[] = [
  // ── TI ──
  {
    id: "ti-soporte",
    name: "Solicitudes de soporte",
    path: "/ti/soporte",
    areaSlug: "ti",
    category: "Operación",
    icon: LifeBuoy,
    // Also where the header's help icon links, so it can't be a 404 (R-24).
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
  {
    id: "ti-administracion",
    name: "Administración",
    path: ADMIN_PATH,
    areaSlug: ADMIN_AREA_SLUG,
    category: "Administración",
    icon: ShieldCheck,
    available: true,
    adminOnly: true,
    // The sections are the module; there is no landing screen above them.
    hasPage: false,
    subItems: ADMIN_SECTIONS.map((section) => ({
      id: `ti-administracion-${section.key}`,
      name: section.name,
      path: `${ADMIN_PATH}/${section.key}`,
      icon: section.icon,
    })),
  },

  // ── Calidad ──
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
];

type ModuleTemplate = Omit<ModuleItem, "id" | "path" | "areaSlug" | "subItems"> & {
  key: string;
  /** Path under the area; the module key when absent. */
  segment?: string;
  subItems?: (base: string, areaSlug: string) => ModuleSubItem[];
};

/**
 * Every API module, in sidebar order. An administrator switches each one on
 * in any area (`/ti/administracion/modulos`), so they are generated for every
 * slug and `my_modules` decides which ones show. `key` doubles as the row id
 * suffix; `permission` is the API key, shared by the two monitoring rows.
 */
const MODULE_TEMPLATES: ModuleTemplate[] = [
  { key: "proyectos", name: "Proyectos", category: "Operación", icon: FolderKanban, available: true, permission: "proyectos" },
  {
    key: "cotizador",
    name: "Cotizador",
    category: "Operación",
    icon: Calculator,
    available: true,
    permission: "cotizador",
  },
  {
    key: "actualizacion-listas",
    name: "Actualización de listas",
    category: "Operación",
    icon: ListRestart,
    available: true,
    permission: "actualizacion-listas",
  },
  {
    key: "validador-pedidos",
    name: "Validador de pedidos",
    category: "Operación",
    icon: ClipboardCheck,
    available: true,
    permission: "validador-pedidos",
  },
  {
    key: SUPPORT_REQUESTS_SEGMENT,
    name: "Solicitudes de apoyo JDH",
    category: "Operación",
    icon: ClipboardList,
    available: true,
    permission: "solicitudes-apoyos",
  },
  {
    key: "pqrsf",
    name: "PQRSF",
    category: "Operación",
    icon: MessageSquareWarning,
    available: true,
    permission: "pqrsf",
    subItems: (base, slug) => [
      {
        id: `${slug}-pqrsf-sugerencias`,
        name: "Sugerencias y felicitaciones",
        path: `${base}/sugerencias`,
        icon: ThumbsUp,
        managerOnly: true,
        badge: "feedback-unread",
      },
      { id: `${slug}-pqrsf-historial`, name: "Historial", path: `${base}/historial`, icon: History, managerOnly: true },
      { id: `${slug}-pqrsf-configuracion`, name: "Configuración", path: `${base}/configuracion`, icon: Settings, managerOnly: true },
    ],
  },
  {
    key: "monitoreo",
    segment: BOARD_SEGMENT,
    name: "Tablero general",
    category: "Monitoreo",
    icon: Activity,
    available: true,
    permission: "monitoreo",
  },
  {
    key: "aplicativos",
    segment: APPS_SEGMENT,
    name: "Aplicativos",
    category: "Monitoreo",
    icon: AppWindow,
    available: true,
    permission: "monitoreo",
  },
  {
    key: "datawarehouse",
    segment: DWH_SEGMENT,
    name: "Datawarehouse",
    category: "Monitoreo",
    icon: Database,
    available: true,
    permission: "datawarehouse",
    subItems: (base, slug) => [
      { id: `${slug}-datawarehouse-secuencias`, name: "Secuencias", path: `${base}/secuencias`, icon: Workflow },
      { id: `${slug}-datawarehouse-frescura`, name: "Frescura", path: `${base}/frescura`, icon: Hourglass },
      { id: `${slug}-datawarehouse-horario`, name: "Horario del día", path: `${base}/horario`, icon: CalendarClock },
      { id: `${slug}-datawarehouse-extracciones`, name: "Extracciones", path: `${base}/extracciones`, icon: ListChecks },
    ],
  },
  { key: "apoyos", name: "Maestro de apoyos", category: "Maestros", icon: HandCoins, available: true, permission: "apoyos" },
  {
    key: "casos-especiales",
    segment: "apoyos/casos-especiales",
    name: "Casos especiales",
    category: "Maestros",
    icon: ClipboardList,
    available: true,
    permission: "casos-especiales",
  },
  {
    key: "maestros",
    segment: MASTERS_SEGMENT,
    name: "Maestros",
    category: "Maestros",
    icon: Database,
    available: true,
    permission: "maestros",
    // The landing lists the area's masters; BI also keeps the typed commercial
    // tables, where it edits products and loads margins.
    subItems: (base, slug) =>
      slug === COMMERCIAL_MASTERS_AREA_SLUG
        ? COMMERCIAL_MASTERS.map((master) => ({
            id: `${slug}-maestros-${master.key}`,
            name: master.name,
            path: `${base}/${master.key}`,
            icon: master.icon,
          }))
        : [],
  },
  { key: "documentos", name: "Gestor documental", category: "Documentación", icon: FolderOpen, available: true, permission: "documentos" },
];

function buildModule({ key, segment, subItems, ...template }: ModuleTemplate, areaSlug: string): ModuleItem {
  const id = `${areaSlug}-${key}`;
  const path = `/${areaSlug}/${segment ?? key}`;
  const pages = subItems?.(path, areaSlug) ?? [];
  return {
    ...template,
    id,
    path,
    areaSlug,
    ...(pages.length > 0 ? { subItems: pages } : {}),
  };
}

/**
 * Every row an area can show: its own rows and every API module, whether or
 * not the area has it on. `visibleModules` narrows it to what the person sees;
 * the gates use the full list to know which module a route belongs to.
 */
export function getModulesByArea(areaSlug: string): ModuleItem[] {
  return [
    ...AREA_ROWS.filter((module) => module.areaSlug === areaSlug),
    ...MODULE_TEMPLATES.map((template) => buildModule(template, areaSlug)),
  ];
}

export function findModuleByPath(path: string): ModuleItem | undefined {
  const [, areaSlug] = path.split("/");
  if (!areaSlug) return undefined;
  return getModulesByArea(areaSlug).find((module) => module.path === path);
}
