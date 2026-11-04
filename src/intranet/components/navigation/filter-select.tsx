"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/intranet/components/ui/select"
import { cn } from "@/intranet/lib/utils"

export interface FilterSelectOption {
  value: string
  label: string
  count?: number
}

interface FilterSelectProps {
  options: FilterSelectOption[]
  value: string
  onChange: (value: string) => void
  /** aria-label del trigger — el rótulo visible vive en el texto de la opción. */
  label: string
  placeholder?: string
  className?: string
}

/**
 * Dropdown de filtro para toolbars (sedes, zonas, etc.) — hermano de
 * `FilterChips`/`FilterChipGroup`, no un wrapper de `JdhSelect`
 * (`src/components/forms/jdh-select.tsx`): ese es un control de FORMULARIO —
 * 40px, `w-full`, cableado al contexto de `Field` con `aria-invalid`. Un
 * filtro de toolbar necesita 44px (para alinear con `SearchInput
 * variant="light"`, que es `h-11`), ancho al contenido y conteos por opción;
 * envolver `JdhSelect` para deshacer todo eso sería peor que construir sobre
 * el mismo primitivo shadcn (`ui/select.tsx`).
 */
export function FilterSelect({
  options,
  value,
  onChange,
  label,
  placeholder = "Selecciona una opción",
  className,
}: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          // El default de shadcn fija la altura vía `data-[size=default]:h-8`
          // (variant sobre el atributo `data-size`, siempre presente en el
          // trigger). Un `h-11` plano no le gana en especificidad — hay que
          // pisar el mismo selector con variant para igualar los 44px de
          // `SearchInput`.
          "w-auto min-w-[220px] rounded-lg border-border data-[size=default]:h-11",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      {/*
        `position="popper"` (en vez del default de Radix, "item-aligned")
        ancla el panel al trigger vía Floating UI —abre debajo, alineado a la
        izquierda— en lugar de centrar el panel sobre el ITEM seleccionado,
        que es el comportamiento nativo de <select> pero aquí lo hacía
        superponerse al trigger y quedar descentrado.
      */}
      <SelectContent position="popper" align="start" sideOffset={4}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex w-full items-center justify-between gap-3">
              <span>{option.label}</span>
              {option.count != null ? (
                <span className="font-mono text-xs text-muted-foreground">
                  {option.count}
                </span>
              ) : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
