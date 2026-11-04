"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import type { Route } from "next"
import { useRouter } from "next/navigation"

import { FilterSelect } from "@/intranet/components/navigation/filter-select"
import { SearchInput } from "@/intranet/components/forms/search-input"

import {
  directorioHref,
  SEARCH_DEBOUNCE_MS,
  SEDE_ALL,
  SEDE_ALL_LABEL,
} from "../directorio.config"
import type { SedeOption } from "../types"

interface DirectorioToolbarProps {
  sede: string
  q: string
  sedes: SedeOption[]
  total: number
  from: number
  to: number
}

/**
 * Buscador (nombre/cargo/correo) + dropdown de sedes. Mecánica calcada de
 * `DocumentosToolbar`: el buscador es server-side por URL (`?q=`), escrito con
 * debounce y `router.replace` (no `push`, para no llenar el historial con una
 * entrada por tecla) dentro de un `useTransition`, así React mantiene la UI
 * vieja visible —y el foco en el input— mientras el Server Component se
 * re-renderiza. `scroll: false` evita que la página salte al top en cada
 * tecleo.
 *
 * `lastSyncedRef` evita el bucle clásico URL→estado→URL: sin él, cada
 * navegación propia dispararía el efecto de sincronización, que dispararía
 * otra navegación.
 *
 * El dropdown de sedes SÍ navega de inmediato (sin debounce): es una elección
 * discreta, no texto tecleado letra a letra.
 *
 * En mobile el grupo buscador+dropdown pasa a `flex-col` y ambos controles
 * llevan `w-full`: al ser hijos de un flex column con `align-items: stretch`
 * (default), se estiran al mismo ancho sin necesidad de calcularlo a mano.
 * De `sm` en adelante vuelve a la fila original (`FilterSelect` recupera su
 * ancho de contenido vía `sm:w-auto`).
 */
export function DirectorioToolbar({
  sede,
  q,
  sedes,
  total,
  from,
  to,
}: DirectorioToolbarProps) {
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
        router.replace(directorioHref({ sede, q: term }) as Route, {
          scroll: false,
        })
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [term, sede, router])

  // Sin conteo en "Todas las sedes": ese total ya lo comunica el contador de
  // la derecha ("Mostrando X–Y de Z"); duplicarlo en la opción sería
  // redundante. Los conteos por sede individual sí aportan (cuántos hay en
  // cada una antes de elegirla).
  const sedeOptions = [
    { value: SEDE_ALL, label: SEDE_ALL_LABEL },
    ...sedes.map((s) => ({ value: s.id, label: s.nombre, count: s.count })),
  ]

  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6 sm:items-center">
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        <div className="w-full max-w-[440px] sm:w-[440px]">
          <SearchInput
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar por nombre, cargo o correo…"
            aria-label="Buscar en el directorio"
          />
        </div>
        <FilterSelect
          label="Filtrar por sede"
          options={sedeOptions}
          value={sede}
          onChange={(value) =>
            startTransition(() => {
              router.replace(
                directorioHref({ sede: value, q: term }) as Route,
                {
                  scroll: false,
                }
              )
            })
          }
          className="w-full sm:w-auto"
        />
      </div>
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
  )
}
