import { PageHeader } from "@/intranet/components/common/page-header"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"
import { NoticiasDestacadas } from "@/intranet/modules/noticias"
import type { Noticia } from "@/intranet/modules/noticias"

import { DocumentosDestacados } from "./documentos-destacados"
import { DocumentosPagination } from "./documentos-pagination"
import { DocumentosTable } from "./documentos-table"
import { DocumentosToolbar } from "./documentos-toolbar"
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
  destacados: Documento[]
  /** Bloque de noticias destacadas (selección aleatoria) al pie de la página. */
  noticiasDestacadas: Noticia[]
}

/**
 * Route-facing view del módulo documentos. Server Component: recibe filtros
 * ya resueltos desde `page.tsx` (que parsea `searchParams` y llama a
 * `server/queries.ts`) y renderiza el resultado.
 *
 * Importa `NoticiasDestacadas` del barrel público de `noticias` — composición
 * entre módulos vía su superficie pública, no sus internos; el contrato de
 * `src/modules/README.md` prohíbe importar internos de otro módulo, no su
 * barrel.
 */
export function DocumentosView({
  filters,
  data,
  facets,
  totalAll,
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
          { label: "Documentos y políticas" },
        ]}
      />
      <PageHeader
        title="Documentos y políticas"
        description="Repositorio de documentos corporativos, políticas y procedimientos vigentes. Busca por nombre o filtra por categoría."
      />

      <DocumentosToolbar
        categoria={filters.categoria}
        q={filters.q}
        facets={facets}
        totalAll={totalAll}
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
