/** Domain types for the documentos module. */

export interface Documento {
  id: string
  title: string
  slug: string
  description: string
  /** URL absoluta al endpoint de descarga del CMS (`GET .../download`). */
  downloadUrl: string
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
}

export interface DocumentoFilters {
  /** Slug de `categoria-documento`, o `"all"`. Catálogo editable en el CMS —
   *  no es un enum cerrado como `NoticiaTipo`/`ZonaId`. */
  categoria: string
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

/** Categoría con su conteo, para los chips del buscador. */
export interface CategoriaFacet {
  slug: string
  label: string
  count: number
}
