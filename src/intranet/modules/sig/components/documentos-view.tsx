import { PageHeader } from "@/intranet/components/common/page-header"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"
import { NoticiasDestacadas } from "@/intranet/modules/noticias"
import type { Noticia } from "@/intranet/modules/noticias"

import { DocumentosDestacados } from "./documentos-destacados"
import { DocumentosPagination } from "./documentos-pagination"
import { DocumentosTable } from "./documentos-table"
import { DocumentosToolbar } from "./documentos-toolbar"
import { SIG_BASE_PATH } from "../sig.config"
import type {
  CategoriaFacet,
  Documento,
  DocumentoFilters,
  DocumentosPage,
} from "../types"

interface DocumentosViewProps {
  filters: DocumentoFilters
  data: DocumentosPage
  facets: CategoriaFacet[]
  totalAll: number
  componenteFacets: CategoriaFacet[]
  destacados: Documento[]
  /** Bloque de noticias destacadas (selección aleatoria) al pie de la página. */
  noticiasDestacadas: Noticia[]
}

/**
 * Control documental del SIG (`/sig/control-documental`): el repositorio
 * completo en tabla, con buscador y filtros. Server Component: recibe filtros
 * ya resueltos desde `page.tsx` (que parsea `searchParams` y llama a
 * `server/queries.ts`) y renderiza el resultado.
 *
 * Importa `NoticiasDestacadas` del barrel público de `noticias` — composición
 * entre módulos vía su superficie pública, no sus internos.
 */
export function DocumentosView({
  filters,
  data,
  facets,
  totalAll,
  componenteFacets,
  destacados,
  noticiasDestacadas,
}: DocumentosViewProps) {
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const from = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1
  const to = Math.min(data.page * data.pageSize, data.total)

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Intranet", href: "/" },
          { label: "SIG", href: SIG_BASE_PATH },
          { label: "Control documental" },
        ]}
      />
      <PageHeader
        title="Control documental"
        description="Todos los documentos vigentes de la compañía, con su código, versión y fecha de revisión. Busca por nombre o filtra por componente y categoría."
      />

      <DocumentosToolbar
        categoria={filters.categoria}
        componente={filters.componente}
        q={filters.q}
        facets={facets}
        totalAll={totalAll}
        componenteFacets={componenteFacets}
        total={data.total}
        from={from}
        to={to}
      />

      <DocumentosTable items={data.items} />

      <DocumentosPagination
        filters={filters}
        page={data.page}
        totalPages={totalPages}
      />

      {/* Destacados AL FINAL: la tabla con buscador es el gesto principal de
          la página; los destacados son un cierre editorial, no una portada. */}
      <DocumentosDestacados documentos={destacados} />

      <NoticiasDestacadas noticias={noticiasDestacadas} />
    </div>
  )
}
