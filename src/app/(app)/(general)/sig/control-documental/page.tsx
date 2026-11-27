import { DocumentosView } from "@/intranet/modules/sig"
import { documentoFiltersSchema } from "@/intranet/modules/sig/schemas/documento.schema"
import {
  getCategoriaFacets,
  getComponenteFacets,
  getDocumentos,
  getDocumentosDestacados,
} from "@/intranet/modules/sig/server/queries"
// Deep import al seam de OTRO módulo: excepción consciente — el barrel de
// noticias no puede exponer `server/` (server-only rompería bundles cliente).
import { getNoticiasDestacadas } from "@/intranet/modules/noticias/server/queries"

export const metadata = { title: "Control documental · SIG" }

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
    componente: firstValue(rawParams.componente),
    q: firstValue(rawParams.q),
    page: firstValue(rawParams.page),
  })

  const [data, categorias, componentes, destacados, noticiasDestacadas] =
    await Promise.all([
      getDocumentos(filters),
      getCategoriaFacets(filters.q, filters.componente),
      getComponenteFacets(filters.q, filters.categoria),
      getDocumentosDestacados(),
      getNoticiasDestacadas(3),
    ])

  return (
    <DocumentosView
      filters={filters}
      data={data}
      facets={categorias.facets}
      totalAll={categorias.all}
      componenteFacets={componentes}
      destacados={destacados}
      noticiasDestacadas={noticiasDestacadas}
    />
  )
}
