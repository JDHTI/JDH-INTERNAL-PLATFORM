import { mapBlocks, strapiConfig, strapiMediaUrl } from "@/intranet/lib/strapi"
import type {
  StrapiBlock,
  StrapiEntity,
  StrapiMedia,
} from "@/intranet/lib/strapi"

import {
  isSigComponente,
  isSigSeccionValue,
  SIG_BASE_PATH,
  sigUbicacion,
} from "../sig.config"
import type { Documento } from "../types"

/**
 * Entidad `Documento` cruda de Strapi (forma plana v5) con sus relaciones
 * pobladas. Es la entrada del mapper; el resto de la app solo ve el tipo de
 * dominio `Documento`.
 *
 * Los campos del SIG son opcionales a propósito: mientras el CMS no los
 * despliegue llegan ausentes, y el mapper los resuelve a sus valores por
 * defecto (descarga, no obligatorio, fuera del SIG).
 */
export interface StrapiDocumento extends StrapiEntity {
  title: string
  slug: string | null
  description: string | null
  revisionDate: string
  featured: boolean
  file?: StrapiMedia | null
  categoria?: { name: string; slug: string } | null
  area?: { name: string } | null
  seccion?: string | null
  componente?: string | null
  presentacion?: string | null
  contenido?: StrapiBlock[] | null
  obligatorio?: boolean | null
  evaluacionUrl?: string | null
  codigo?: string | null
  version?: string | null
  orden?: number | null
}

/** ".pdf" → "PDF". Sin extensión (archivo raro/legacy) → "Archivo". */
function fileTypeLabel(ext: string | null | undefined): string {
  if (!ext) return "Archivo"
  return ext.replace(/^\./, "").toUpperCase()
}

/** Solo un enlace http(s) se ofrece como evaluación; cualquier otra cosa se descarta. */
function safeExternalUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.toString()
      : null
  } catch {
    return null
  }
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

/**
 * Mapea una entidad `StrapiDocumento` al tipo de dominio `Documento`.
 *
 * `downloadUrl` apunta al CMS por su URL pública (`strapiConfig.publicUrl`),
 * no a un proxy en Next — la descarga es una ruta custom de Strapi que fuerza
 * `Content-Disposition: attachment` con el nombre real del archivo.
 *
 * `href` (página de lectura) existe solo si el documento está en una sección
 * del SIG, tiene slug y se publicó como `pagina`, o si no trae archivo que
 * descargar: un documento sin archivo ni página no tendría ninguna acción.
 */
export function mapDocumento(entity: StrapiDocumento): Documento {
  const seccion = isSigSeccionValue(entity.seccion) ? entity.seccion : null
  const ubicacion = seccion ? sigUbicacion(seccion) : undefined
  const slug = entity.slug ?? ""
  const hasFile = Boolean(entity.file?.url)
  const wantsPage = entity.presentacion === "pagina" || !hasFile
  const href =
    ubicacion && slug && wantsPage
      ? (`${SIG_BASE_PATH}/${ubicacion.modulo.slug}/${slug}` as const)
      : null
  const isImage = entity.file?.mime?.startsWith("image/") ?? false

  return {
    id: entity.documentId,
    title: entity.title,
    slug,
    description: entity.description ?? "",
    downloadUrl: hasFile
      ? `${strapiConfig.publicUrl}/api/documentos/${entity.documentId}/download`
      : null,
    // Original, no una variante reducida: un mapa de procesos necesita su detalle.
    imageUrl:
      isImage && entity.file
        ? strapiMediaUrl({ ...entity.file, formats: undefined })
        : null,
    href,
    fileType: fileTypeLabel(entity.file?.ext),
    fileSizeKb: entity.file?.size ?? null,
    categoria: entity.categoria?.name ?? "",
    categoriaSlug: entity.categoria?.slug ?? "",
    area: entity.area?.name ?? "",
    revisionDate: entity.revisionDate,
    featured: entity.featured,
    seccion,
    componente: isSigComponente(entity.componente) ? entity.componente : null,
    presentacion: href ? "pagina" : "descarga",
    obligatorio: entity.obligatorio ?? false,
    evaluacionUrl: safeExternalUrl(entity.evaluacionUrl),
    codigo: blankToNull(entity.codigo),
    version: blankToNull(entity.version),
    orden: entity.orden ?? null,
    contenido: mapBlocks(entity.contenido),
  }
}
