import { NoticiasView } from "@/intranet/modules/noticias"
import { noticiaFiltersSchema } from "@/intranet/modules/noticias/schemas/noticia.schema"
import {
  getNoticias,
  getTipoCounts,
  getZonaCounts,
} from "@/intranet/modules/noticias/server/queries"

export const metadata = { title: "Noticias y comunicados" }

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function Page({ searchParams }: PageProps) {
  const rawParams = await searchParams
  const filters = noticiaFiltersSchema.parse({
    tipo: firstValue(rawParams.tipo),
    zona: firstValue(rawParams.zona),
    page: firstValue(rawParams.page),
  })

  const [data, tipoCounts, zonaCounts] = await Promise.all([
    getNoticias(filters),
    getTipoCounts(filters.zona),
    getZonaCounts(filters.tipo),
  ])

  return (
    <NoticiasView
      filters={filters}
      data={data}
      tipoCounts={tipoCounts}
      zonaCounts={zonaCounts}
    />
  )
}
