"use client"

import { cn } from "@/intranet/lib/utils"

export interface FilterChipOption<T extends string> {
  value: T
  label: string
  /** Optional trailing count (e.g. results in that category). */
  count?: number
}

interface BaseProps<T extends string> {
  options: FilterChipOption<T>[]
  "aria-label": string
  className?: string
}

type SingleProps<T extends string> = BaseProps<T> & {
  multiple?: false
  value: T
  onChange: (value: T) => void
}

type MultipleProps<T extends string> = BaseProps<T> & {
  multiple: true
  value: T[]
  onChange: (value: T) => void
}

export type FilterChipsProps<T extends string> =
  SingleProps<T> | MultipleProps<T>

/**
 * Segmented filter control (Documentos / Noticias / Solicitudes in the design).
 * Active chip = filled ink, inactive = outlined. Single-select renders as a
 * `radiogroup`; multi-select toggles each chip with `aria-pressed`.
 *
 * `onChange` always receives the clicked value; the parent owns the state
 * (sets it for single-select, toggles the array for multi-select).
 */
export function FilterChips<T extends string>(props: FilterChipsProps<T>) {
  const { options, className, multiple } = props
  const ariaLabel = props["aria-label"]

  const isActive = (value: T) =>
    multiple ? props.value.includes(value) : props.value === value

  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const active = isActive(option.value)

        return (
          <button
            key={option.value}
            type="button"
            role={multiple ? undefined : "radio"}
            aria-checked={multiple ? undefined : active}
            aria-pressed={multiple ? active : undefined}
            onClick={() => props.onChange(option.value)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-[var(--color-border-strong)] text-foreground hover:bg-accent"
            )}
          >
            {option.label}
            {option.count != null ? (
              <span
                className={cn(
                  "text-xs",
                  active
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
