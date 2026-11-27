/** Domain types for the SIG module (documentos del CMS). */

import type { ArticleBlock } from "@/intranet/lib/strapi"

import type {
  SigComponente,
  SigPresentacion,
  SigSeccionValue,
} from "./sig.config"

export interface Documento {
  id: string
  title: string
  slug: string
  description: string
  /**
   * URL absoluta al endpoint de descarga del CMS (`GET .../download`), o
   * `null` cuando el documento no tiene archivo (página de solo texto).
   */
  downloadUrl: string | null
  /** Archivo de imagen para mostrar dentro de la página (p. ej. mapa de procesos). */
  imageUrl: string | null
  /** Página de lectura en el SIG, o `null` si el documento solo se descarga. */
  href: `/${string}` | null
  /** Extensión en mayúsculas sin punto, p. ej. "PDF". */
  fileType: string
  /** Peso del archivo en KILOBYTES (Strapi lo reporta así, no en bytes). */
  fileSizeKb: number | null
  categoria: string
  categoriaSlug: string
  area: string
  /** Fecha de revisión editorial, ISO 8601 (`date`, sin hora). */
  revisionDate: string
  featured: boolean
  /** Sección del SIG; `null` = solo aparece en el control documental. */
  seccion: SigSeccionValue | null
  componente: SigComponente | null
  presentacion: SigPresentacion
  obligatorio: boolean
  /** Enlace externo a la evaluación de aprobación (solo http/https). */
  evaluacionUrl: string | null
  codigo: string | null
  version: string | null
  orden: number | null
  /** Texto de lectura. Vacío en los listados, que no lo piden al CMS. */
  contenido: ArticleBlock[]
}

export interface DocumentoFilters {
  /** Slug de `categoria-documento`, o `"all"`. Catálogo editable en el CMS —
   *  no es un enum cerrado como `NoticiaTipo`/`ZonaId`. */
  categoria: string
  /** Componente del SIG, o `"all"`. */
  componente: SigComponente | "all"
  /** Término de búsqueda server-side sobre todo el catálogo. */
  q: string
  page: number
}

export interface DocumentosPage {
  items: Documento[]
  total: number
  page: number
  pageSize: number
}

/** Opción de filtro con su conteo, para los chips del buscador. */
export interface CategoriaFacet {
  slug: string
  label: string
  count: number
}
