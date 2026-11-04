import { Newspaper } from "lucide-react"

import { EmptyState } from "@/intranet/components/common/empty-state"
import { PageHeader } from "@/intranet/components/common/page-header"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"

import { NoticiaCard } from "./noticia-card"
import { NoticiasFilters } from "./noticias-filters"
import { NoticiasPagination } from "./noticias-pagination"
import type {
  NoticiaFilters as NoticiaFiltersType,
  NoticiaTipo,
  NoticiasPage,
  ZonaId,
} from "../types"

interface NoticiasViewProps {
  filters: NoticiaFiltersType
  data: NoticiasPage
  tipoCounts: Record<NoticiaTipo | "all", number>
  zonaCounts: Record<ZonaId | "all", number>
}

/**
 * Route-facing view for the noticias module (listado, §3 del diseño).
 * Server Component: recibe filtros ya resueltos desde `page.tsx` (que parsea
 * `searchParams` y llama a `server/queries.ts`) y renderiza el resultado.
 */
export function NoticiasView({
  filters,
  data,
  tipoCounts,
  zonaCounts,
}: NoticiasViewProps) {
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const from = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1
  const to = Math.min(data.page * data.pageSize, data.total)

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Intranet", href: "/" },
          { label: "Noticias y comunicados" },
        ]}
      />
      <PageHeader
        title="Noticias y comunicados"
        description="Toda la actualidad de JDH en sus siete sedes. Filtra por zona y tipo para ver solo lo relevante para tu operación."
      />

      <NoticiasFilters
        tipo={filters.tipo}
        zona={filters.zona}
        tipoCounts={tipoCounts}
        zonaCounts={zonaCounts}
        total={data.total}
        from={from}
        to={to}
      />

      {data.items.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((noticia) => (
            <NoticiaCard key={noticia.id} noticia={noticia} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Newspaper}
          title="No hay resultados"
          description="Ajusta los filtros de zona o tipo para ver más contenido."
        />
      )}

      <NoticiasPagination
        filters={filters}
        page={data.page}
        totalPages={totalPages}
      />
    </div>
  )
}
