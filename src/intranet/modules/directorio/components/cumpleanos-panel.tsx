import type { Route } from "next"
import Link from "next/link"

import { InitialsAvatar } from "@/intranet/components/common/initials-avatar"
import { StatusBadge } from "@/intranet/components/common/status-badge"
import { esCumpleanosHoy } from "@/intranet/lib/date"

import {
  diasHastaProximoCumpleanos,
  empleadoHref,
  formatCumpleanos,
} from "../directorio.config"
import type { Empleado } from "../types"

/**
 * "hoy" / "mañana" / "en 12 días" — la distancia importa más que la fecha
 * cuando el cumpleaños está a la vuelta de la esquina, que es justo para lo
 * que sirve el panel. `Infinity` (sin fecha registrada en Entra) no debería
 * llegar aquí: `getProximosCumpleanos` solo devuelve empleados con fecha, y
 * los que no la tienen ordenan al final y quedan fuera del `slice`.
 */
function distanciaLabel(dias: number): string | null {
  if (!Number.isFinite(dias)) return null
  if (dias === 0) return "hoy"
  if (dias === 1) return "mañana"
  return `en ${dias} días`
}

/**
 * Fila visual de un cumpleaños, reutilizada en la vista previa (dentro de
 * `<summary>`, sin link) y en la lista ampliada (con link al perfil). Un
 * `<a>` anidado en `<summary>` competiría por el clic con el toggle nativo de
 * `<details>` (el navegador dispara ambos: la navegación Y el toggle) — por
 * eso la vista previa se renderiza sin `Link`.
 */
export function CumpleanosRow({
  empleado,
  linked,
}: {
  empleado: Empleado
  linked: boolean
}) {
  const dias = diasHastaProximoCumpleanos(empleado.fechaNacimiento)
  const distancia = distanciaLabel(dias)

  const content = (
    <>
      <InitialsAvatar
        name={empleado.nombre}
        src={empleado.photoUrl ?? undefined}
        size="md"
        birthday={esCumpleanosHoy(empleado.fechaNacimiento)}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{empleado.nombre}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {empleado.cargo}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-sm text-muted-foreground">
          {formatCumpleanos(empleado.fechaNacimiento)}
        </span>
        {dias === 0 ? (
          <StatusBadge className="h-6 px-2.5">Hoy</StatusBadge>
        ) : distancia ? (
          <span className="text-xs text-muted-foreground">{distancia}</span>
        ) : null}
      </span>
    </>
  )

  if (!linked) {
    return <div className="flex flex-1 items-center gap-3 py-3">{content}</div>
  }

  return (
    <Link
      href={empleadoHref(empleado.id) as Route}
      className="flex items-center gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {content}
    </Link>
  )
}
