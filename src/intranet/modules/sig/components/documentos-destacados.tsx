import { SectionHeader } from "@/intranet/components/common/section-header"

import { DocumentoCard } from "./documento-card"
import type { Documento } from "../types"

/**
 * Destacados al PIE del control documental (decisión de producto, no del
 * diseño original): la tabla con buscador es el gesto principal; esto es un
 * cierre editorial.
 *
 * Si no hay destacados no se renderiza NADA (ni encabezado ni EmptyState):
 * una sección vacía al final de la página es ruido, no información.
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
          <DocumentoCard key={doc.id} documento={doc} eyebrow={doc.categoria} />
        ))}
      </div>
    </section>
  )
}
