"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ChevronRight, Users } from "lucide-react"

import { InitialsAvatar } from "@/intranet/components/common/initials-avatar"
import { EmptyState } from "@/intranet/components/common/empty-state"
import { DataTable } from "@/intranet/components/data/data-table"
import { esCumpleanosHoy } from "@/intranet/lib/date"

import { empleadoHref, GRID_TEMPLATE } from "../directorio.config"
import type { Empleado } from "../types"

/**
 * `"use client"` obligatorio: las `cell` de un `ColumnDef` son funciones y
 * `DataTable` ya es un Client Component — las columnas tienen que
 * construirse de este lado de la frontera, no en `DirectorioView` (RSC).
 *
 * `enableSorting` queda apagado: el orden ya lo resuelve `getEmpleados` sobre
 * el catálogo completo, ordenar en cliente solo reordenaría las 10 filas
 * visibles.
 *
 * El avatar usa `size="lg"` (48px) — un escalón por encima del 36px del
 * mockup, a pedido explícito — y ya acepta `src` para foto real cuando la API
 * la entregue, sin tocar el resto de la fila.
 *
 * La fila completa navega al perfil vía `rowHref` (overlay `<a>` a
 * `absolute inset-0 z-0` — ver `data-table.tsx:174`). La celda de correo
 * necesita `meta.className: "relative z-10"` para seguir siendo clicable
 * *por encima* de ese overlay: un elemento posicionado con `z-0` pinta sobre
 * contenido en línea sin posicionar, aunque venga después en el DOM. El
 * chevron final es solo decorativo (`aria-hidden`) — la fila entera ya es el
 * enlace, un segundo `<a>` ahí sería una parada de tabulación redundante.
 *
 * El avatar necesita `pointer-events-none`: `ui/avatar.tsx` fija `relative`
 * en el root del `Avatar` (para apilar imagen/fallback), así que también
 * pinta por encima del overlay de fila — sin esto, un clic sobre el círculo
 * quedaba atrapado en el `<span>` del avatar en vez de llegar al enlace de
 * abajo, y la fila dejaba de navegar justo en esa zona.
 *
 * `stickyFirstColumn` (`DataTable`) + los pisos `minmax()` de `GRID_TEMPLATE`
 * (`directorio.config.ts`) resuelven el móvil: en vez de encoger las 5
 * columnas hasta volverlas ilegibles (la foto y el nombre se fundían en una
 * franja angosta) o forzar un ancho de fila fijo a mano, la fila solo se
 * ensancha lo que sus columnas realmente necesitan — y la columna "Persona"
 * queda fija a la izquierda del scroll horizontal *propio de la tabla*. Así
 * la persona siempre se distingue de un vistazo y el resto (cargo, sede,
 * correo) se explora arrastrando, sin bloquear más ancho del necesario.
 */
const columns: ColumnDef<Empleado, unknown>[] = [
  {
    accessorKey: "nombre",
    header: "Persona",
    cell: ({ row }) => (
      <span className="flex min-w-0 items-center gap-3">
        <InitialsAvatar
          name={row.original.nombre}
          src={row.original.photoUrl ?? undefined}
          size="lg"
          birthday={esCumpleanosHoy(row.original.fechaNacimiento)}
          className="pointer-events-none"
        />
        <span className="truncate font-medium">{row.original.nombre}</span>
      </span>
    ),
  },
  {
    accessorKey: "cargo",
    header: "Cargo",
    cell: ({ row }) => (
      <span className="block truncate text-muted-foreground">
        {row.original.cargo}
      </span>
    ),
  },
  {
    accessorKey: "sede",
    header: "Sede",
    cell: ({ row }) => (
      <span className="block truncate text-muted-foreground">
        {row.original.sede}
      </span>
    ),
  },
  {
    accessorKey: "email",
    header: "Correo corporativo",
    cell: ({ row }) =>
      row.original.email ? (
        <a
          href={`mailto:${row.original.email}`}
          className="block truncate font-mono text-foreground hover:underline"
        >
          {row.original.email}
        </a>
      ) : (
        <span className="block truncate font-mono text-muted-foreground">
          Sin correo registrado
        </span>
      ),
    meta: { className: "relative z-10" },
  },
  {
    id: "chevron",
    header: "",
    cell: () => <ChevronRight aria-hidden className="size-[18px]" />,
    meta: { className: "flex justify-end text-muted-foreground" },
  },
]

export function DirectorioTable({ items }: { items: Empleado[] }) {
  return (
    <DataTable
      columns={columns}
      data={items}
      gridTemplate={GRID_TEMPLATE}
      stickyFirstColumn
      rowHref={(empleado) => empleadoHref(empleado.id)}
      rowLabel={(empleado) => `Ver perfil de ${empleado.nombre}`}
      emptyState={
        <EmptyState
          icon={Users}
          title="No encontramos coincidencias"
          description="Intenta con otro nombre, cargo o correo, o cambia la sede."
        />
      }
    />
  )
}
