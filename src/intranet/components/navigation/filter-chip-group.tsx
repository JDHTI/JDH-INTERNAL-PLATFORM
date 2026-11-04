"use client"

import { useState } from "react"

import { cn } from "@/intranet/lib/utils"

import { FilterChips, type FilterChipOption } from "./filter-chips"

interface FilterChipGroupProps<T extends string> {
  /** Rótulo mono-uppercase opcional sobre el grupo (p. ej. "Categoría"). */
  label?: string
  options: FilterChipOption<T>[]
  value: T
  onChange: (value: T) => void
  "aria-label": string
  /** Chips visibles antes de plegar el resto tras un "+N más". */
  visibleCount?: number
  className?: string
}

/**
 * Envuelve `FilterChips` con una delimitación de crecimiento: agrupa los
 * chips bajo un rótulo opcional y, cuando hay más de `visibleCount` opciones,
 * pliega el resto tras un "+N más" (expandible/"despliega") en vez de dejar
 * que la fila de chips crezca sin límite. Con un catálogo chico (hoy, p. ej.,
 * ~5 categorías de documentos) no se activa — existe para cuando el catálogo,
 * editable en el CMS, crezca sin que nadie toque este componente.
 *
 * La opción activa siempre queda visible aunque el recorte natural la deje
 * afuera, para que el chip seleccionado nunca desaparezca de la vista plegada.
 */
export function FilterChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  visibleCount = 8,
  className,
  ...rest
}: FilterChipGroupProps<T>) {
  const [expanded, setExpanded] = useState(false)
  const ariaLabel = rest["aria-label"]

  const overflowing = options.length > visibleCount
  const visibleOptions =
    !overflowing || expanded
      ? options
      : ensureActiveVisible(options, value, visibleCount)
  const hiddenCount = options.length - visibleOptions.length

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label ? (
        <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
          {label}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips
          aria-label={ariaLabel}
          options={visibleOptions}
          value={value}
          onChange={onChange}
        />
        {overflowing ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-muted-foreground underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {expanded ? "Mostrar menos" : `+${hiddenCount} más`}
          </button>
        ) : null}
      </div>
    </div>
  )
}

/** Recorta a `visibleCount`, garantizando que la opción activa quede incluida aunque el recorte natural la deje afuera. */
function ensureActiveVisible<T extends string>(
  options: FilterChipOption<T>[],
  value: T,
  visibleCount: number
): FilterChipOption<T>[] {
  const head = options.slice(0, visibleCount)
  if (head.some((o) => o.value === value)) return head

  const active = options.find((o) => o.value === value)
  if (!active) return head

  return [...head.slice(0, visibleCount - 1), active]
}
