import type { Route } from "next"
import Link from "next/link"

import { InitialsAvatar } from "@/intranet/components/common/initials-avatar"
import { EmptyState } from "@/intranet/components/common/empty-state"
import { PageHeader } from "@/intranet/components/common/page-header"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"
import { esCumpleanosHoy } from "@/intranet/lib/date"
import { Calendar } from "lucide-react"

import { empleadoHref, formatCumpleanos } from "../directorio.config"
import type { Empleado } from "../types"
import { DirectorioTabs } from "./directorio-tabs"

/**
 * Route-facing view de "Directorio de cumpleaños" (`/directorio/cumpleanos`).
 * Server Component: recibe la lista ya ordenada cronológicamente desde
 * `page.tsx` (`getProximosCumpleanos`). Sin buscador ni filtro de sede —
 * alcance simple, no se pidió.
 */
export function CumpleanosView({ empleados }: { empleados: Empleado[] }) {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: "Intranet", href: "/" }, { label: "Directorio" }]}
      />
      <PageHeader
        title="Directorio de cumpleaños"
        description="Próximos cumpleaños del equipo, en orden cronológico."
      />

      <DirectorioTabs />

      {empleados.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No hay cumpleaños para mostrar"
          description="Todavía no hay fechas de nacimiento cargadas en el directorio."
        />
      ) : (
        <ul className="divide-y divide-border">
          {empleados.map((empleado) => (
            <li key={empleado.id}>
              <Link
                href={empleadoHref(empleado.id) as Route}
                className="flex items-center gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <InitialsAvatar
                  name={empleado.nombre}
                  src={empleado.photoUrl ?? undefined}
                  size="lg"
                  birthday={esCumpleanosHoy(empleado.fechaNacimiento)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {empleado.nombre}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {empleado.cargo}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm text-muted-foreground">
                  {formatCumpleanos(empleado.fechaNacimiento)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
