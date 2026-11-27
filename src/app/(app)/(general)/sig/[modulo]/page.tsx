import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { SigModuloView, sigModulo } from "@/intranet/modules/sig"
import { getSigModulo } from "@/intranet/modules/sig/server/queries"

interface PageProps {
  params: Promise<{ modulo: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const modulo = sigModulo((await params).modulo)
  return modulo ? { title: `${modulo.title} · SIG` } : {}
}

export default async function Page({ params }: PageProps) {
  // Se valida aquí y no dentro de las queries: `notFound()` lanza, y el
  // `try/catch` de la capa de datos lo convertiría en una lista vacía.
  const modulo = sigModulo((await params).modulo)
  if (!modulo) notFound()

  const { data, disponible } = await getSigModulo(modulo)

  return (
    <SigModuloView modulo={modulo} documentos={data} disponible={disponible} />
  )
}
