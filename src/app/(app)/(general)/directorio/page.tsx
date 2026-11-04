import { DirectorioView } from "@/intranet/modules/directorio"
import { empleadoFiltersSchema } from "@/intranet/modules/directorio/schemas/empleado.schema"
import { getEmpleados, getSedes } from "@/intranet/modules/directorio/server/queries"

export const metadata = { title: "Directorio" }

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function Page({ searchParams }: PageProps) {
  const rawParams = await searchParams
  const filters = empleadoFiltersSchema.parse({
    q: firstValue(rawParams.q),
    sede: firstValue(rawParams.sede),
    page: firstValue(rawParams.page),
  })

  const [data, sedes] = await Promise.all([getEmpleados(filters), getSedes()])

  return <DirectorioView filters={filters} data={data} sedes={sedes} />
}
