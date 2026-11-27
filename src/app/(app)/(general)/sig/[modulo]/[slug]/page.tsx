import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { SigDocumentoView, sigModuloHref, sigUbicacion } from "@/intranet/modules/sig"
import { getSigDocumento } from "@/intranet/modules/sig/server/queries"

interface PageProps {
  params: Promise<{ modulo: string; slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const documento = await getSigDocumento((await params).slug)
  if (!documento) return {}
  return { title: documento.title, description: documento.description }
}

export default async function Page({ params }: PageProps) {
  const { modulo: moduloSlug, slug } = await params
  const documento = await getSigDocumento(slug)
  // Fuera del SIG (sin sección) el documento solo vive en el control documental.
  const ubicacion = documento?.seccion ? sigUbicacion(documento.seccion) : undefined
  if (!documento || !ubicacion) notFound()

  // Un documento que cambió de sección en el CMS sigue respondiendo en su URL vieja.
  if (ubicacion.modulo.slug !== moduloSlug) {
    redirect(`${sigModuloHref(ubicacion.modulo.slug)}/${slug}`)
  }

  return (
    <SigDocumentoView
      documento={documento}
      modulo={ubicacion.modulo}
      seccion={ubicacion.seccion}
    />
  )
}
