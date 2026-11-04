import type { NoticiaTipo, Zona, ZonaId } from "./types"

/**
 * Zonas del filtro: "Nacional" (contenido corporativo no ligado a una sede)
 * más las siete sedes de JDH. En Strapi esto se modela como una colección
 * `Zona` con estas mismas entradas — ver `.claude/STRAPI.md`.
 */
export const ZONAS: Zona[] = [
  { id: "nacional", label: "Nacional" },
  { id: "medellin", label: "Medellín" },
  { id: "bogota", label: "Bogotá" },
  { id: "armenia", label: "Armenia" },
  { id: "bucaramanga", label: "Bucaramanga" },
  { id: "uraba", label: "Urabá" },
  { id: "cartagena", label: "Cartagena" },
  { id: "barranquilla", label: "Barranquilla" },
]

export const NOTICIA_TIPOS: { id: NoticiaTipo; label: string }[] = [
  { id: "noticia", label: "Noticias" },
  { id: "comunicado", label: "Comunicados" },
]

/** Grid de 3×3 del diseño (03. Noticias y comunicados). */
export const PAGE_SIZE = 9

/**
 * Ruta interna del route handler que respalda al hook `useNoticias`.
 * Centralizada aquí para no repetir el literal entre el hook y el handler.
 */
export const NOTICIAS_ENDPOINT = "/api/noticias"

/**
 * Placeholder monocromo (neutral-200) para portadas sin imagen. El mapper de
 * Strapi lo usa como fallback cuando una noticia no tiene `coverImage`. Mismo
 * patrón gris del catálogo de componentes.
 */
export const COVER_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='210'%3E%3Crect%20width='400'%20height='210'%20fill='%23D9D9D9'/%3E%3C/svg%3E"

export function zonaLabel(id: ZonaId): string {
  return ZONAS.find((z) => z.id === id)?.label ?? id
}

export function tipoLabel(tipo: NoticiaTipo): string {
  return NOTICIA_TIPOS.find((t) => t.id === tipo)?.label ?? tipo
}

/** "12 jul" (card meta) vs "16 jul 2026" (detalle). */
export function formatNoticiaDate(
  isoDate: string,
  style: "short" | "long" = "short"
): string {
  return new Date(isoDate).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: style === "long" ? "numeric" : undefined,
  })
}
