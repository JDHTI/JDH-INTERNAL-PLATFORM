"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ChevronRight, Download } from "lucide-react"

import { InitialsAvatar } from "@/intranet/components/common/initials-avatar"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { actionColumn, DataTable } from "@/intranet/components/data/data-table"
import {
  mockDocumentRows,
  mockPersonRows,
  type MockDocumentRow,
  type MockPersonRow,
} from "@/intranet/lib/mock/table-rows"

import { Section, Subsection } from "./section"

const documentColumns: ColumnDef<MockDocumentRow, unknown>[] = [
  {
    accessorKey: "name",
    header: "Documento",
    cell: ({ row }) => (
      <span className="truncate font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "area",
    header: "Área",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.area}</span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Actualizado",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.updatedAt}</span>
    ),
  },
  actionColumn<MockDocumentRow>(() => (
    <JdhButton variant="ghost" size="icon-sm" aria-label="Descargar">
      <Download />
    </JdhButton>
  )),
]

const personColumns: ColumnDef<MockPersonRow, unknown>[] = [
  {
    accessorKey: "name",
    header: "Persona",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="flex min-w-0 items-center gap-3">
        <InitialsAvatar name={row.original.name} size="sm" />
        <span className="truncate font-medium">{row.original.name}</span>
      </span>
    ),
  },
  {
    accessorKey: "role",
    header: "Rol",
    cell: ({ row }) => (
      <span className="truncate text-muted-foreground">
        {row.original.role}
      </span>
    ),
  },
  {
    accessorKey: "sede",
    header: "Sede",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.sede}</span>
    ),
  },
  {
    accessorKey: "email",
    header: "Correo",
    cell: ({ row }) => (
      <span className="truncate font-mono text-xs text-muted-foreground">
        {row.original.email}
      </span>
    ),
  },
  actionColumn<MockPersonRow>(() => (
    <ChevronRight className="size-4 text-muted-foreground" />
  )),
]

export function DataTableSection() {
  return (
    <Section
      title="Tablas de datos"
      description="DataTable (TanStack Table + render en grid) con acciones por fila, filas enlazables y ordenamiento opcional."
    >
      <Subsection label="Documentos — acción de descarga por fila">
        <DataTable
          columns={documentColumns}
          data={mockDocumentRows}
          gridTemplate="1fr 160px 120px 40px"
        />
      </Subsection>

      <Subsection label="Directorio — filas enlazables + ordenamiento">
        <DataTable
          columns={personColumns}
          data={mockPersonRows}
          gridTemplate="1fr 240px 160px 1fr 40px"
          enableSorting
          rowHref={() => "/directorio"}
          rowLabel={(row) => `Ver perfil de ${row.name}`}
        />
      </Subsection>

      <Subsection label="Estado vacío">
        <DataTable
          columns={documentColumns}
          data={[]}
          gridTemplate="1fr 160px 120px 40px"
        />
      </Subsection>
    </Section>
  )
}
