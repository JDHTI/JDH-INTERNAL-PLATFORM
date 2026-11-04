"use client"

import { formatFechaLarga } from "@/intranet/lib/date"
import { DetailModal } from "@/intranet/components/modals/detail-modal"

import type { Empleado } from "../types"
import { CumpleanosRow } from "./cumpleanos-panel"

interface CumpleanosDiaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "YYYY-MM-DD" del día abierto en el calendario, o `null` con el modal cerrado. */
  fecha: string | null
  empleados: Empleado[]
}

/**
 * Lista los cumpleaños de UN día del calendario de la home — puede haber
 * varios. Calcado de `EventoDiaModal` (`modules/eventos`): no dispara fetch,
 * recibe los empleados del día ya filtrados por `CumpleanosMiniCalendario`.
 */
export function CumpleanosDiaModal({
  open,
  onOpenChange,
  fecha,
  empleados,
}: CumpleanosDiaModalProps) {
  const count = empleados.length

  return (
    <DetailModal
      open={open}
      onOpenChange={onOpenChange}
      eyebrow={fecha ? formatFechaLarga(fecha) : undefined}
      title={`${count} ${count === 1 ? "cumpleaños" : "cumpleaños"}`}
    >
      <ul className="divide-y divide-border">
        {empleados.map((empleado) => (
          <li key={empleado.id}>
            <CumpleanosRow empleado={empleado} linked />
          </li>
        ))}
      </ul>
    </DetailModal>
  )
}
