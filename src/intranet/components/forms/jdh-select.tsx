"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/intranet/components/ui/select"
import { cn } from "@/intranet/lib/utils"

import { INVALID_CONTROL_CLASSES, useField } from "./field"

export interface JdhSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface JdhSelectProps {
  options: JdhSelectOption[]
  placeholder?: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  disabled?: boolean
  className?: string
}

/**
 * Single-select dropdown at DESIGN.md §4.5 height (40px), full width. Thin
 * wrapper over the shadcn Select compound that takes an `options` array and
 * wires up `Field` context on the trigger.
 */
export function JdhSelect({
  options,
  placeholder = "Selecciona una opción",
  className,
  ...props
}: JdhSelectProps) {
  const field = useField()

  return (
    <Select {...props}>
      <SelectTrigger
        id={field?.id}
        aria-invalid={field?.invalid || undefined}
        aria-describedby={field?.describedBy}
        className={cn(
          // El default de shadcn fija la altura vía `data-[size=default]:h-8`
          // (variant sobre el atributo `data-size`, siempre presente en el
          // trigger) — un `h-10` plano no le gana en especificidad. Hay que
          // pisar el mismo selector con variant (ver `FilterSelect`).
          "w-full data-[size=default]:h-10",
          field?.invalid && INVALID_CONTROL_CLASSES,
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={4}>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
