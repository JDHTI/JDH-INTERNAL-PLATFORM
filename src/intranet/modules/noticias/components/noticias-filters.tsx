"use client"

import { useState } from "react"
import type { Route } from "next"
import { useRouter, useSearchParams } from "next/navigation"
import { Filter } from "lucide-react"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import { StatusBadge } from "@/intranet/components/common/status-badge"
import { FilterChips } from "@/intranet/components/navigation/filter-chips"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/intranet/components/ui/popover"

import { NOTICIA_TIPOS, ZONAS, zonaLabel } from "../noticias.config"
import type { NoticiaTipo, ZonaId } from "../types"

interface NoticiasFiltersProps {
  tipo: NoticiaTipo | "all"
  zona: ZonaId | "all"
  tipoCounts: Record<NoticiaTipo | "all", number>
  zonaCounts: Record<ZonaId | "all", number>
  total: number
  from: number
  to: number
}

/**
 * Tipo y zona viven detrás de un único trigger "Filtros" (Popover flotante)
 * en vez de dos barras de chips siempre visibles — evita saturar la fila y
 * resuelve de una vez el caso de "demasiadas zonas": el panel tiene un alto
 * máximo con scroll propio, así que crecer el catálogo de zonas nunca rompe
 * el layout. Cada `FilterChips` sigue escribiendo su valor en la URL
 * (`?tipo=&zona=`) y resetea `page` a 1; el listado (`NoticiasView`, Server
 * Component) reacciona a la navegación resultante. El resumen de resultados
 * ("Mostrando X–Y de N · zona") queda solo, empujado a la derecha.
 */
export function NoticiasFilters({
  tipo,
  zona,
  tipoCounts,
  zonaCounts,
  total,
  from,
  to,
}: NoticiasFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  function navigate(next: { tipo?: string; zona?: string }) {
    const params = new URLSearchParams(searchParams.toString())

    for (const key of ["tipo", "zona"] as const) {
      const value = next[key]
      if (value === undefined) continue
      if (value === "all") params.delete(key)
      else params.set(key, value)
    }
    params.delete("page")

    const qs = params.toString()
    router.push((qs ? `/noticias?${qs}` : "/noticias") as Route)
  }

  const tipoOptions = [
    { value: "all" as const, label: "Todos", count: tipoCounts.all },
    ...NOTICIA_TIPOS.map((t) => ({
      value: t.id,
      label: t.label,
      count: tipoCounts[t.id],
    })),
  ]

  const zonaOptions = [
    { value: "all" as const, label: "Todas", count: zonaCounts.all },
    ...ZONAS.map((z) => ({
      value: z.id,
      label: z.label,
      count: zonaCounts[z.id],
    })),
  ]

  const activeCount = (tipo !== "all" ? 1 : 0) + (zona !== "all" ? 1 : 0)
  const zonaText = zona === "all" ? "todas las zonas" : zonaLabel(zona)

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <JdhButton variant="secondary" size="sm">
            <Filter />
            Filtros
            {activeCount > 0 ? (
              <StatusBadge variant="count">{activeCount}</StatusBadge>
            ) : null}
          </JdhButton>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80">
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
                Tipo
              </p>
              <FilterChips
                aria-label="Filtrar por tipo"
                options={tipoOptions}
                value={tipo}
                onChange={(value) => navigate({ tipo: value })}
              />
            </div>

            <div>
              <p className="mb-2 font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
                Zona
              </p>
              <div className="max-h-64 overflow-y-auto pr-1">
                <FilterChips
                  aria-label="Filtrar por zona"
                  options={zonaOptions}
                  value={zona}
                  onChange={(value) => navigate({ zona: value })}
                />
              </div>
            </div>

            {activeCount > 0 ? (
              <button
                type="button"
                onClick={() => navigate({ tipo: "all", zona: "all" })}
                className="self-start text-sm font-medium text-foreground underline underline-offset-2"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>

      <span className="font-mono text-xs text-muted-foreground">
        {total > 0
          ? `Mostrando ${from}–${to} de ${total} · ${zonaText}`
          : `Sin resultados · ${zonaText}`}
      </span>
    </div>
  )
}
