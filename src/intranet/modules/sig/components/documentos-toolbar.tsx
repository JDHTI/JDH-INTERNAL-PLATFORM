"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import type { Route } from "next"
import { useRouter } from "next/navigation"

import { SearchInput } from "@/intranet/components/forms/search-input"
import { FilterChipGroup } from "@/intranet/components/navigation/filter-chip-group"

import { documentosHref, SEARCH_DEBOUNCE_MS } from "../documentos.config"
import { isSigComponente } from "../sig.config"
import type { SigComponente } from "../sig.config"
import type { CategoriaFacet } from "../types"

interface DocumentosToolbarProps {
  categoria: string
  componente: SigComponente | "all"
  q: string
  facets: CategoriaFacet[]
  totalAll: number
  /** Vacío mientras ningún documento tenga componente: el grupo no se muestra. */
  componenteFacets: CategoriaFacet[]
  total: number
  from: number
  to: number
}

/**
 * Barra de filtros del catálogo. A diferencia de `NoticiasFilters` (tipo y
 * zona detrás de un Popover, porque hay muchas zonas), acá buscador y chips
 * van SIEMPRE visibles: son el gesto principal de la página, no un
 * refinamiento secundario — hay ~4 categorías y el buscador es lo primero
 * que se usa.
 *
 * El buscador es server-side por URL (`?q=`): se escribe con debounce y
 * `router.replace` (no `push`, para no llenar el historial con una entrada
 * por tecla) dentro de un `useTransition`, así React mantiene la UI vieja
 * visible —y el foco en el input— mientras el Server Component se
 * re-renderiza. `scroll: false` evita que la página salte al top en cada
 * tecleo (también sacaría de vista el bloque de destacados, al pie).
 *
 * `lastSyncedRef` evita el bucle clásico URL→estado→URL: sin él, cada
 * navegación propia dispararía el efecto de sincronización, que dispararía
 * otra navegación.
 *
 * Los chips van en `FilterChipGroup` (no `FilterChips` a secas): agrupa las
 * categorías bajo un rótulo y pliega el resto tras un "+N más" cuando el
 * catálogo (editable en el CMS) crezca más allá de lo que cabe en una fila.
 * El resumen "Mostrando X–Y de N" vive en la MISMA fila que los chips, no en
 * la del buscador — la fila de búsqueda queda sola arriba.
 */
export function DocumentosToolbar({
  categoria,
  componente,
  q,
  facets,
  totalAll,
  componenteFacets,
  total,
  from,
  to,
}: DocumentosToolbarProps) {
  const router = useRouter()
  const [term, setTerm] = useState(q)
  const [isPending, startTransition] = useTransition()
  const lastSyncedRef = useRef(q)

  // URL → estado, solo si el cambio vino de fuera (back/forward, enlace).
  useEffect(() => {
    if (q !== lastSyncedRef.current) {
      lastSyncedRef.current = q
      setTerm(q)
    }
  }, [q])

  // Estado → URL, con debounce.
  useEffect(() => {
    if (term === lastSyncedRef.current) return
    const id = setTimeout(() => {
      lastSyncedRef.current = term
      startTransition(() => {
        router.replace(
          documentosHref({ categoria, componente, q: term }) as Route,
          { scroll: false }
        )
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [term, categoria, componente, router])

  const options = [
    { value: "all", label: "Todas", count: totalAll },
    ...facets.map((f) => ({ value: f.slug, label: f.label, count: f.count })),
  ]

  // «Todos» va sin conteo: incluye los documentos sin componente, que los
  // conteos por componente no cubren, y una suma parcial engañaría.
  const componenteOptions = [
    { value: "all", label: "Todos" },
    ...componenteFacets.map((f) => ({
      value: f.slug,
      label: f.label,
      count: f.count,
    })),
  ]

  function navigate(next: { categoria?: string; componente?: string }) {
    const nextComponente = next.componente ?? componente
    startTransition(() => {
      router.replace(
        documentosHref({
          categoria: next.categoria ?? categoria,
          componente: isSigComponente(nextComponente) ? nextComponente : "all",
          q: term,
        }) as Route,
        { scroll: false }
      )
    })
  }

  return (
    <div className="mb-8 space-y-4 border-b border-border pb-6">
      <div className="max-w-sm min-w-[240px]">
        <SearchInput
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar en todo el catálogo…"
          aria-label="Buscar documentos"
        />
      </div>

      {componenteFacets.length > 0 ? (
        <FilterChipGroup
          label="Componente"
          aria-label="Filtrar por componente del SIG"
          options={componenteOptions}
          value={componente}
          onChange={(value) => navigate({ componente: value })}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <FilterChipGroup
          label="Categoría"
          aria-label="Filtrar por categoría"
          options={options}
          value={categoria}
          visibleCount={8}
          onChange={(value) => navigate({ categoria: value })}
        />
        <span
          aria-live="polite"
          className="shrink-0 font-mono text-xs text-muted-foreground"
        >
          {isPending
            ? "Buscando…"
            : total > 0
              ? `Mostrando ${from}–${to} de ${total}`
              : "Sin resultados"}
        </span>
      </div>
    </div>
  )
}
