import { OrganigramaView, parseEstadoOrganigrama } from "@/intranet/modules/organigrama"

export const metadata = { title: "Organigrama" }

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({ searchParams }: PageProps) {
  const estadoInicial = parseEstadoOrganigrama(await searchParams)

  return <OrganigramaView estadoInicial={estadoInicial} />
}
