import { strapiConfig } from "@/intranet/lib/strapi"
import type { StrapiEntity, StrapiMedia } from "@/intranet/lib/strapi"

import type { Documento } from "../types"

/**
 * Entidad `Documento` cruda de Strapi (forma plana v5) con sus relaciones
 * pobladas. Es la entrada del mapper; el resto de la app solo ve el tipo de
 * dominio `Documento`.
 */
export interface StrapiDocumento extends StrapiEntity {
  title: string
  slug: string
  description: string | null
  revisionDate: string
  featured: boolean
  file?: StrapiMedia | null
  categoria?: { name: string; slug: string } | null
  area?: { name: string } | null
}

/** ".pdf" → "PDF". Sin extensión (archivo raro/legacy) → "Archivo". */
function fileTypeLabel(ext: string | null | undefined): string {
  if (!ext) return "Archivo"
  return ext.replace(/^\./, "").toUpperCase()
}

/**
 * Mapea una entidad `StrapiDocumento` al tipo de dominio `Documento`.
 *
 * `downloadUrl` apunta al CMS por su URL pública (`strapiConfig.publicUrl`),
 * no a un proxy en Next — la descarga es una ruta custom de Strapi
 * (`.claude/STRAPI.md` § Módulo: documentos) que fuerza
 * `Content-Disposition: attachment` con el nombre real del archivo.
 */
export function mapDocumento(entity: StrapiDocumento): Documento {
  return {
    id: entity.documentId,
    title: entity.title,
    slug: entity.slug,
    description: entity.description ?? "",
    downloadUrl: `${strapiConfig.publicUrl}/api/documentos/${entity.documentId}/download`,
    fileType: fileTypeLabel(entity.file?.ext),
    fileSizeKb: entity.file?.size ?? null,
    categoria: entity.categoria?.name ?? "",
    categoriaSlug: entity.categoria?.slug ?? "",
    area: entity.area?.name ?? "",
    revisionDate: entity.revisionDate,
    featured: entity.featured,
  }
}
