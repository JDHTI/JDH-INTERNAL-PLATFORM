import { DocumentosView } from "@/intranet/modules/sig"
import { documentoFiltersSchema } from "@/intranet/modules/sig/schemas/documento.schema"
import {
  getCategoriaFacets,
  getDocumentos,
  getDocumentosDestacados,
} from "@/intranet/modules/sig/server/queries"
// Deep import al seam de OTRO módulo: excepción consciente a la regla de
// barrel-only, justificada porque quien compone dos dominios en una sola
// página es la capa de rutas (thin), no un módulo importando los internos de
// otro. Ver `.claude/ARCHITECTURE.md`.
import { getNoticiasDestacadas } from "@/intranet/modules/noticias/server/queries"

export const metadata = { title: "Documentos y políticas" }

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function Page({ searchParams }: PageProps) {
  const rawParams = await searchParams
  const filters = documentoFiltersSchema.parse({
    categoria: firstValue(rawParams.categoria),
    q: firstValue(rawParams.q),
    page: firstValue(rawParams.page),
  })

  const [data, categorias, destacados, noticiasDestacadas] = await Promise.all([
    getDocumentos(filters),
    getCategoriaFacets(filters.q),
    getDocumentosDestacados(),
    getNoticiasDestacadas(3),
  ])

  return (
    <DocumentosView
      filters={filters}
      data={data}
      facets={categorias.facets}
      totalAll={categorias.all}
      destacados={destacados}
      noticiasDestacadas={noticiasDestacadas}
    />
  )
}
