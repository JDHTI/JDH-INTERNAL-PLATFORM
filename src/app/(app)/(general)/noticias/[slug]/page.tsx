import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { NoticiaDetail } from "@/intranet/modules/noticias"
import {
  getNoticiaBySlug,
  getRelatedNoticias,
} from "@/intranet/modules/noticias/server/queries"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const noticia = await getNoticiaBySlug(slug)
  if (!noticia) return {}

  return { title: noticia.title, description: noticia.excerpt }
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const noticia = await getNoticiaBySlug(slug)
  if (!noticia) notFound()

  const related = await getRelatedNoticias(slug, 2)

  return <NoticiaDetail noticia={noticia} related={related} />
}
