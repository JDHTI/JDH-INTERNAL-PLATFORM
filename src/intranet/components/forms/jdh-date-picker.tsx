"use client"

import * as React from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/intranet/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/intranet/components/ui/select"
import {
  addMeses,
  buildCalendarGrid,
  DIAS_SEMANA,
  formatFechaLarga,
  formatMesLargo,
  MESES_LARGO,
  todayIsoDate,
  toIsoParts,
} from "@/intranet/lib/date"
import { cn } from "@/intranet/lib/utils"

import { INVALID_CONTROL_CLASSES, useField } from "./field"

export interface JdhDatePickerProps {
  /** "YYYY-MM-DD", o "" si no hay fecha elegida. */
  value?: string
  onValueChange: (iso: string) => void
  placeholder?: string
  /** ISO inclusive — deshabilita días anteriores. */
  min?: string
  /** ISO inclusive — deshabilita días posteriores. */
  max?: string
  disabled?: boolean
  /** Para leer el valor de un `<form>` nativo vía `FormData`. */
  name?: string
  className?: string
}

function addDays(iso: string, delta: number): string {
  const [year, month, day] = iso.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + delta)
  return toIsoParts(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function startOfWeek(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number)
  const weekday = (new Date(year, month - 1, day).getDay() + 6) % 7 // 0 = lunes
  return addDays(iso, -weekday)
}

function endOfWeek(iso: string): string {
  return addDays(startOfWeek(iso), 6)
}

/** +/-1 mes, recortando el día si el mes destino es más corto (31 ene → 28/29 feb). */
function addMonthsClamped(iso: string, delta: number): string {
  const [year, month, day] = iso.split("-").map(Number)
  const target = new Date(year, month - 1 + delta, 1)
  const daysInTarget = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0
  ).getDate()
  return toIsoParts(
    target.getFullYear(),
    target.getMonth() + 1,
    Math.min(day, daysInTarget)
  )
}

function isDisabled(iso: string, min?: string, max?: string): boolean {
  return Boolean((min && iso < min) || (max && iso > max))
}

/**
 * Datepicker propio de JDH — reemplaza el `<input type="date">` nativo, que
 * ignora por completo el sistema monocromo de DESIGN.md y se ve distinto por
 * navegador/OS. El repo evita librerías de fecha a propósito (ver
 * `.claude/ARCHITECTURE.md`), así que la grilla mensual viene de
 * `src/lib/date.ts` (hecha a mano con `Intl`/`Date`, ya resuelve el corrimiento
 * de UTC-5 de Colombia).
 *
 * API en ISO "YYYY-MM-DD" — igual que el `<input type="date">` que reemplaza,
 * para que los schemas de zod y los payloads de la API no cambien.
 */
export function JdhDatePicker({
  value = "",
  onValueChange,
  placeholder = "Selecciona una fecha",
  min,
  max,
  disabled,
  name,
  className,
}: JdhDatePickerProps) {
  const field = useField()
  const [open, setOpen] = React.useState(false)
  const [viewMonth, setViewMonth] = React.useState(() =>
    (value || todayIsoDate()).slice(0, 7)
  )
  const [focusedIso, setFocusedIso] = React.useState(
    () => value || todayIsoDate()
  )
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const dayRefs = React.useRef(new Map<string, HTMLButtonElement>())

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      const anchor = value || todayIsoDate()
      setViewMonth(anchor.slice(0, 7))
      setFocusedIso(anchor)
    }
  }

  // Roving tabindex: mueve el foco real del DOM al día activo cada vez que
  // cambia (navegación por teclado o cambio de mes/año vía los selects).
  React.useEffect(() => {
    if (!open) return
    dayRefs.current.get(focusedIso)?.focus()
  }, [open, focusedIso, viewMonth])

  function selectDay(iso: string) {
    if (isDisabled(iso, min, max)) return
    onValueChange(iso)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function moveFocus(iso: string) {
    setFocusedIso(iso)
    setViewMonth(iso.slice(0, 7))
  }

  function handleGridKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const keyMoves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusedIso, -1),
      ArrowRight: () => addDays(focusedIso, 1),
      ArrowUp: () => addDays(focusedIso, -7),
      ArrowDown: () => addDays(focusedIso, 7),
      Home: () => startOfWeek(focusedIso),
      End: () => endOfWeek(focusedIso),
      PageUp: () => addMonthsClamped(focusedIso, -1),
      PageDown: () => addMonthsClamped(focusedIso, 1),
    }

    const move = keyMoves[event.key]
    if (move) {
      event.preventDefault()
      moveFocus(move())
      return
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      selectDay(focusedIso)
    }
  }

  const dias = buildCalendarGrid(viewMonth, new Date())
  const weeks: (typeof dias)[] = []
  for (let i = 0; i < dias.length; i += 7) weeks.push(dias.slice(i, i + 7))

  const now = new Date()
  const minYear = min ? Number(min.slice(0, 4)) : now.getFullYear() - 100
  const maxYear = max ? Number(max.slice(0, 4)) : now.getFullYear() + 10
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => maxYear - i
  )
  const [viewYear, viewMonthNum] = viewMonth.split("-").map(Number)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          id={field?.id}
          disabled={disabled}
          aria-invalid={field?.invalid || undefined}
          aria-describedby={field?.describedBy}
          aria-haspopup="dialog"
          className={cn(
            "flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30",
            field?.invalid && INVALID_CONTROL_CLASSES,
            className
          )}
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value ? formatFechaLarga(value) : placeholder}
          </span>
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-auto flex-col gap-3 p-3"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex items-center justify-between gap-2">
          <JdhButton
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Mes anterior"
            onClick={() => setViewMonth((m) => addMeses(m, -1))}
          >
            <ChevronLeft />
          </JdhButton>

          <div className="flex items-center gap-1.5">
            <Select
              value={String(viewMonthNum)}
              onValueChange={(v) =>
                setViewMonth(`${viewYear}-${v.padStart(2, "0")}`)
              }
            >
              <SelectTrigger aria-label="Mes" className="w-[128px] capitalize">
                <SelectValue>{MESES_LARGO[viewMonthNum - 1]}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                {MESES_LARGO.map((mes, index) => (
                  <SelectItem
                    key={mes}
                    value={String(index + 1)}
                    className="capitalize"
                  >
                    {mes}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(viewYear)}
              onValueChange={(v) =>
                setViewMonth(`${v}-${String(viewMonthNum).padStart(2, "0")}`)
              }
            >
              <SelectTrigger aria-label="Año" className="w-[84px]">
                <SelectValue>{viewYear}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <JdhButton
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Mes siguiente"
            onClick={() => setViewMonth((m) => addMeses(m, 1))}
          >
            <ChevronRight />
          </JdhButton>
        </div>

        <div
          role="grid"
          aria-label={formatMesLargo(viewMonth)}
          onKeyDown={handleGridKeyDown}
        >
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
            {DIAS_SEMANA.map((dia) => (
              <span key={dia} role="columnheader" className="py-1">
                {dia}
              </span>
            ))}
          </div>

          {weeks.map((week) => (
            <div
              key={week[0].iso}
              role="row"
              className="mt-1 grid grid-cols-7 gap-1"
            >
              {week.map((dia) => {
                const dayDisabled = isDisabled(dia.iso, min, max)
                const isSelected = dia.iso === value
                const isFocusTarget = dia.iso === focusedIso

                return (
                  <button
                    key={dia.iso}
                    ref={(el) => {
                      if (el) dayRefs.current.set(dia.iso, el)
                      else dayRefs.current.delete(dia.iso)
                    }}
                    type="button"
                    role="gridcell"
                    disabled={dayDisabled}
                    tabIndex={isFocusTarget ? 0 : -1}
                    aria-selected={isSelected}
                    aria-current={dia.isToday ? "date" : undefined}
                    aria-label={formatFechaLarga(dia.iso)}
                    onClick={() => selectDay(dia.iso)}
                    onFocus={() => setFocusedIso(dia.iso)}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-[var(--jdh-radius-sm)] border text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      dia.inMonth
                        ? "border-border text-foreground"
                        : "border-transparent text-muted-foreground/50",
                      dia.isToday &&
                        "border-[var(--color-border-strong)] font-medium",
                      !dayDisabled && "cursor-pointer hover:bg-accent",
                      isSelected &&
                        "border-transparent bg-primary text-primary-foreground hover:bg-primary dark:border-[var(--color-ink-border)]"
                    )}
                  >
                    {dia.day}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
