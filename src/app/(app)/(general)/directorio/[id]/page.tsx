import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { EmpleadoDetail } from "@/intranet/modules/directorio"
import { getEmpleadoById, getEquipo } from "@/intranet/modules/directorio/server/queries"
import { getHorarioContacto } from "@/intranet/modules/perfil/server/queries"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const empleado = await getEmpleadoById(id)
  if (!empleado) return {}

  return {
    title: empleado.nombre,
    description: `${empleado.cargo} · ${empleado.sede}`,
  }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params
  const empleado = await getEmpleadoById(id)
  if (!empleado) notFound()

  const [equipo, horario] = await Promise.all([
    getEquipo(id),
    getHorarioContacto(id),
  ])

  return (
    <EmpleadoDetail empleado={empleado} equipo={equipo} horario={horario} />
  )
}
