/**
 * Global, non-secret site configuration. Anything environment-specific
 * (URLs, keys) belongs in env vars, not here.
 */
export const siteConfig = {
  name: "JDH Intranet",
  shortName: "Intranet",
  company: "Juan D. Hoyos Distribuciones",
  companyLegal: "Juan D. Hoyos Distribuciones S.A.S.",
  description: "Intranet corporativa de Juan D. Hoyos Distribuciones",
  locale: "es-CO",
  /** Shown in the footer legal bar. */
  version: "v1.0.0 · Fase 1",
  /** Sedes JDH (DESIGN.md §4.2) — usadas en el footer/directorio. */
  sedes: [
    "Medellín",
    "Bogotá",
    "Armenia",
    "Bucaramanga",
    "Urabá",
    "Cartagena",
    "Barranquilla",
  ],
} as const

export type SiteConfig = typeof siteConfig
