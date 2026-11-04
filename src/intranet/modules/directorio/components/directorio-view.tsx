import { PageHeader } from "@/intranet/components/common/page-header"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"

import { DirectorioPagination } from "./directorio-pagination"
import { DirectorioTabs } from "./directorio-tabs"
import { DirectorioTable } from "./directorio-table"
import { DirectorioToolbar } from "./directorio-toolbar"
import type { EmpleadoFilters, EmpleadosPage, SedeOption } from "../types"

interface DirectorioViewProps {
  filters: EmpleadoFilters
  data: EmpleadosPage
  sedes: SedeOption[]
}

/**
 * Route-facing view del módulo directorio. Server Component: recibe filtros
 * ya resueltos desde `page.tsx` (que parsea `searchParams` y llama a
 * `server/queries.ts`) y renderiza el resultado.
 */
export function DirectorioView({ filters, data, sedes }: DirectorioViewProps) {
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))
  const from = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1
  const to = Math.min(data.page * data.pageSize, data.total)

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: "Intranet", href: "/" }, { label: "Directorio" }]}
      />
      <PageHeader
        title="Directorio de personas"
        description="Encuentra a cualquier colaborador de JDH por nombre, cargo, sede o correo corporativo."
      />

      <DirectorioTabs />

      <DirectorioToolbar
        sede={filters.sede}
        q={filters.q}
        sedes={sedes}
        total={data.total}
        from={from}
        to={to}
      />

      <DirectorioTable items={data.items} />

      <DirectorioPagination
        filters={filters}
        page={data.page}
        totalPages={totalPages}
      />
    </div>
  )
}
