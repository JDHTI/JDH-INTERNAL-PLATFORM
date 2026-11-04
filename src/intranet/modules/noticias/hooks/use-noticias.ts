"use client"

import { useQuery } from "@tanstack/react-query"

import { NOTICIAS_ENDPOINT } from "../noticias.config"
import type { NoticiaFilters, NoticiasPage } from "../types"

/**
 * Factory de query-keys del módulo. Establece el patrón para hooks de este y
 * otros módulos (hoy no había factory en el repo — ver `.claude/ARCHITECTURE.md`).
 */
export const noticiasKeys = {
  all: ["noticias"] as const,
  list: (filters: NoticiaFilters) =>
    [...noticiasKeys.all, "list", filters] as const,
}

function buildQueryString(filters: NoticiaFilters): string {
  const params = new URLSearchParams()
  if (filters.tipo !== "all") params.set("tipo", filters.tipo)
  if (filters.zona !== "all") params.set("zona", filters.zona)
  params.set("page", String(filters.page))
  return params.toString()
}

/**
 * Query cliente del listado de noticias, respaldada por el route handler
 * `/api/noticias` (que a su vez usa el seam `getNoticias`, manteniendo el
 * token de Strapi del lado servidor). Para Client Components que necesiten
 * datos reactivos/paginados; los Server Components deben llamar a
 * `getNoticias()` de `../server/queries` directamente.
 */
export function useNoticias(filters: NoticiaFilters) {
  return useQuery<NoticiasPage>({
    queryKey: noticiasKeys.list(filters),
    queryFn: async () => {
      const res = await fetch(
        `${NOTICIAS_ENDPOINT}?${buildQueryString(filters)}`
      )
      if (!res.ok) throw new Error("Error al cargar noticias")
      return res.json()
    },
  })
}
