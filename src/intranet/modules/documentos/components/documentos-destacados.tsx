import { Download, FileText } from "lucide-react"

import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { SectionHeader } from "@/intranet/components/common/section-header"

import { formatDocumentoDate, formatFileSize } from "../documentos.config"
import type { Documento } from "../types"

/**
 * Destacados al PIE de la página (decisión de producto, no del diseño
 * original): la tabla con buscador es el gesto principal; esto es un cierre
 * editorial. Server Component — elige sus propios iconos localmente, así que
 * ninguna función cruza la frontera server→cliente.
 *
 * Si no hay destacados no se renderiza NADA (ni encabezado ni EmptyState):
 * una sección vacía al final de la página es ruido, no información.
 *
 * Sin `eyebrow`: el rótulo "Destacadas" queda exclusivo de `NoticiasDestacadas`
 * — acá el título ya comunica que es una selección curada, no hace falta
 * repetirlo con un eyebrow encima.
 */
export function DocumentosDestacados({
  documentos,
}: {
  documentos: Documento[]
}) {
  if (documentos.length === 0) return null

  return (
    <section className="mt-16 border-t border-border pt-10">
      <SectionHeader
        title="Lo que todos deberían tener a mano"
        description="Documentos vigentes que aplican a toda la organización."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documentos.map((doc) => (
          <JdhCard key={doc.id} size="sm" className="h-full">
            <JdhCard.Body>
              <JdhCard.IconBox>
                <FileText />
              </JdhCard.IconBox>
              <JdhCard.Eyebrow className="mt-2">
                {doc.categoria}
              </JdhCard.Eyebrow>
              <JdhCard.Title>{doc.title}</JdhCard.Title>
              {doc.description ? (
                <JdhCard.Description>{doc.description}</JdhCard.Description>
              ) : null}
              <JdhCard.Meta>
                {[doc.fileType, formatFileSize(doc.fileSizeKb), doc.area]
                  .filter(Boolean)
                  .join(" · ")}
              </JdhCard.Meta>
              <JdhCard.Meta>
                Actualizado {formatDocumentoDate(doc.revisionDate)}
              </JdhCard.Meta>
              <JdhCard.Footer separated>
                <JdhButton asChild variant="secondary" size="sm">
                  <a href={doc.downloadUrl} download>
                    Descargar
                    <Download />
                  </a>
                </JdhButton>
              </JdhCard.Footer>
            </JdhCard.Body>
          </JdhCard>
        ))}
      </div>
    </section>
  )
}
