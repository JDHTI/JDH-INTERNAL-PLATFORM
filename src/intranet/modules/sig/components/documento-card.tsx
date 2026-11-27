import type { Route } from "next"
import Link from "next/link"
import { Download, ExternalLink } from "lucide-react"

import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { ContentBadge } from "@/intranet/components/common/content-badge"
import { JdhButton } from "@/intranet/components/common/jdh-button"

import { formatDocumentoDate, formatFileSize } from "../documentos.config"
import type { Documento } from "../types"

/** "M.02.F.01 · v02 · PDF · 180 KB · Revisado 15 jul 2026", sin los datos que falten. */
export function documentoMeta(documento: Documento): string {
  const codigo = [
    documento.codigo,
    documento.version ? `v${documento.version}` : null,
  ]
    .filter(Boolean)
    .join(" · ")
  const archivo = documento.downloadUrl
    ? [documento.fileType, formatFileSize(documento.fileSizeKb)]
        .filter(Boolean)
        .join(" · ")
    : ""

  return [codigo, archivo, `Revisado ${formatDocumentoDate(documento.revisionDate)}`]
    .filter(Boolean)
    .join(" · ")
}

/**
 * Las acciones de un documento, en el orden en que se usan: leerlo (si tiene
 * página), descargarlo (si tiene archivo) y presentar la evaluación (si el CMS
 * la enlaza). La evaluación es la única acción sólida: es la que el
 * colaborador debe completar, el resto es consulta.
 */
export function DocumentoAcciones({
  documento,
  leer = true,
}: {
  documento: Documento
  /** `false` en la propia página de lectura, donde «Leer» no lleva a ningún lado nuevo. */
  leer?: boolean
}) {
  return (
    <>
      {leer && documento.href ? (
        <JdhButton asChild variant="secondary">
          <Link href={documento.href as Route}>
            Leer<span className="sr-only"> {documento.title}</span>
          </Link>
        </JdhButton>
      ) : null}
      {documento.downloadUrl ? (
        <JdhButton asChild variant="secondary">
          <a href={documento.downloadUrl} download>
            <Download />
            Descargar<span className="sr-only"> {documento.title}</span>
          </a>
        </JdhButton>
      ) : null}
      {documento.evaluacionUrl ? (
        <JdhButton asChild variant="primary">
          <a
            href={documento.evaluacionUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Presentar evaluación
            <ExternalLink />
            <span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
        </JdhButton>
      ) : null}
    </>
  )
}

/**
 * Tarjeta de un documento del SIG. No es un enlace entero (`JdhCard href`):
 * las acciones apuntan a destinos distintos (página, descarga, evaluación
 * externa) y anidar enlaces no es HTML válido.
 */
export function DocumentoCard({
  documento,
  eyebrow,
  titleAs = "h3",
}: {
  documento: Documento
  eyebrow?: string
  titleAs?: "h3" | "h4"
}) {
  return (
    <JdhCard size="sm" className="h-full">
      <JdhCard.Body>
        {documento.obligatorio ? (
          <ContentBadge badge="obligatorio" className="self-start" />
        ) : null}
        {eyebrow ? <JdhCard.Eyebrow>{eyebrow}</JdhCard.Eyebrow> : null}
        <JdhCard.Title as={titleAs}>
          {documento.title}
        </JdhCard.Title>
        {documento.description ? (
          <JdhCard.Description>{documento.description}</JdhCard.Description>
        ) : null}
        <JdhCard.Meta>{documentoMeta(documento)}</JdhCard.Meta>
        <JdhCard.Footer separated className="flex-wrap">
          <DocumentoAcciones documento={documento} />
        </JdhCard.Footer>
      </JdhCard.Body>
    </JdhCard>
  )
}
