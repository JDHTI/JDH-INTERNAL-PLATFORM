"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import {
  addMeses,
  buildCalendarGrid,
  type CalendarioDia,
  DIAS_SEMANA,
  MESES_LARGO,
} from "@/intranet/lib/date"
import { cn } from "@/intranet/lib/utils"

import type { Empleado } from "../types"
import { CumpleanosDiaModal } from "./cumpleanos-dia-modal"

interface CumpleanosMiniCalendarioProps {
  /** "YYYY-MM" del mes mostrado al cargar — punto de partida del switch de mes. */
  mes: string
  /** Grilla del mes inicial, computada server-side (`buildCalendarGrid`) para evitar mismatch de hidratación. */
  dias: CalendarioDia[]
  /** Todos los empleados con fecha de nacimiento registrada (sin límite ni filtro de mes). */
  cumpleanos: Empleado[]
}

/** "2026-08" → "Cumpleaños del mes de agosto" — sin año, es un rótulo recurrente. */
function tituloMes(mes: string): string {
  const month = Number(mes.split("-")[1])
  return `Cumpleaños del mes de ${MESES_LARGO[month - 1]}`
}

/**
 * Slide 3 del slider de la home: grilla del mes con los días que tienen
 * cumpleaños resaltados, más un switch de mes (chevrones, mismo patrón que
 * `EventosCalendario` pero con estado local — este widget no tiene URL propia
 * ni necesita re-fetch: ya recibe TODOS los cumpleaños del año). Clic en un
 * día resaltado abre `CumpleanosDiaModal` con la lista completa — igual
 * comportamiento tenga uno o varios cumpleaños ese día, sin caso especial.
 *
 * Agrupa por "MM-DD" (no por fecha completa): el año de nacimiento no importa
 * para saber si un día del calendario ES el cumpleaños de alguien. Mismo
 * patrón que `eventosPorDia` en `EventosCalendario`, pero indexado por
 * día-mes en vez de fecha ISO completa.
 *
 * El día de hoy va relleno con el color de texto (ink en claro, blanco en
 * oscuro; número y punto invertidos) — con solo un borde más oscuro no se
 * distinguía del resto.
 * La semana que contiene "hoy" se resalta con un fondo tenue — solo aparece
 * cuando `dias` es la grilla del mes real actual (`isToday` solo es `true`
 * ahí), así que cambiar de mes con el switch la oculta sola, sin condición
 * aparte.
 */
export function CumpleanosMiniCalendario({
  mes: mesInicial,
  dias: diasInicial,
  cumpleanos,
}: CumpleanosMiniCalendarioProps) {
  const [mes, setMes] = React.useState(mesInicial)
  const [diaAbierto, setDiaAbierto] = React.useState<string | null>(null)

  const dias = mes === mesInicial ? diasInicial : buildCalendarGrid(mes)

  const cumpleanosPorDia = React.useMemo(() => {
    const map = new Map<string, Empleado[]>()
    for (const empleado of cumpleanos) {
      if (!empleado.fechaNacimiento) continue
      const key = empleado.fechaNacimiento.slice(5)
      const existing = map.get(key)
      if (existing) existing.push(empleado)
      else map.set(key, [empleado])
    }
    return map
  }, [cumpleanos])

  const semanaActualIndex = React.useMemo(() => {
    const idx = dias.findIndex((dia) => dia.isToday)
    return idx === -1 ? -1 : Math.floor(idx / 7)
  }, [dias])

  return (
    <div className="flex h-[440px] flex-col rounded-[var(--jdh-radius-md)] border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold capitalize">{tituloMes(mes)}</h2>
        <div className="flex items-center gap-1">
          <JdhButton
            variant="secondary"
            size="icon-sm"
            aria-label="Mes anterior"
            onClick={() => setMes((m) => addMeses(m, -1))}
          >
            <ChevronLeft />
          </JdhButton>
          <JdhButton
            variant="secondary"
            size="icon-sm"
            aria-label="Mes siguiente"
            onClick={() => setMes((m) => addMeses(m, 1))}
          >
            <ChevronRight />
          </JdhButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
        {DIAS_SEMANA.map((dia) => (
          <span key={dia} className="py-1">
            {dia}
          </span>
        ))}
      </div>

      <div className="mt-1 grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1">
        {dias.map((dia, index) => {
          const empleadosDelDia = cumpleanosPorDia.get(dia.iso.slice(5)) ?? []
          const hasCumpleanos = empleadosDelDia.length > 0
          const isSemanaActual = Math.floor(index / 7) === semanaActualIndex

          return (
            <button
              key={dia.iso}
              type="button"
              disabled={!hasCumpleanos}
              aria-current={dia.isToday ? "date" : undefined}
              aria-label={
                hasCumpleanos
                  ? `${dia.day}${dia.isToday ? " (hoy)" : ""}: ${empleadosDelDia.length} cumpleaños`
                  : undefined
              }
              onClick={() => setDiaAbierto(dia.iso)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-[var(--jdh-radius-sm)] border text-sm transition-colors disabled:cursor-default",
                dia.inMonth
                  ? "border-border text-foreground"
                  : "border-transparent text-muted-foreground/50",
                isSemanaActual && "bg-foreground/8",
                hasCumpleanos &&
                  "cursor-pointer border-[var(--color-border-strong)] hover:bg-accent",
                // Hoy: relleno sólido del color de texto — ink en claro,
                // blanco en oscuro. No `bg-primary`: `--primary` es ink en
                // ambos temas y en oscuro se perdía contra la tarjeta. Va al
                // final para ganarle al fondo de la semana actual y al hover
                // de los días con cumpleaños (tailwind-merge se queda con la
                // última clase).
                dia.isToday &&
                  "border-transparent bg-foreground font-bold text-background hover:bg-foreground/90"
              )}
            >
              <span>{dia.day}</span>
              {hasCumpleanos ? (
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    dia.isToday ? "bg-background" : "bg-foreground"
                  )}
                />
              ) : null}
            </button>
          )
        })}
      </div>

      <CumpleanosDiaModal
        open={diaAbierto !== null}
        onOpenChange={(open) => {
          if (!open) setDiaAbierto(null)
        }}
        fecha={diaAbierto}
        empleados={
          diaAbierto ? (cumpleanosPorDia.get(diaAbierto.slice(5)) ?? []) : []
        }
      />
    </div>
  )
}
