"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Download, FileText } from "lucide-react"

import { EmptyState } from "@/intranet/components/common/empty-state"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { actionColumn, DataTable } from "@/intranet/components/data/data-table"

import {
  formatDocumentoDate,
  formatFileSize,
  GRID_TEMPLATE,
} from "../documentos.config"
import type { Documento } from "../types"

/**
 * `"use client"` obligatorio: las `cell` de un `ColumnDef` son funciones y
 * `DataTable` ya es un Client Component — las columnas tienen que
 * construirse de este lado de la frontera, no en `DocumentosView` (RSC).
 *
 * NO se usa `rowHref`: está tipado `(row) => \`/${string}\`` y renderiza un
 * `next/link`, así que no admite la URL absoluta de descarga del CMS; además
 * no existe una ruta de detalle `/documentos/[slug]`. La descarga vive en la
 * columna de acción, que ya se dibuja sobre el overlay de fila.
 *
 * `enableSorting` queda apagado a propósito: el orden lo resuelve Strapi
 * (`sort=revisionDate:desc`) sobre el catálogo completo — ordenar en cliente
 * solo reordenaría las 10 filas visibles, que es peor que no ordenar.
 */
const columns: ColumnDef<Documento, unknown>[] = [
  {
    accessorKey: "title",
    header: "Documento",
    cell: ({ row }) => (
      <span className="flex min-w-0 items-center gap-3">
        <FileText
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="min-w-0">
          <span className="block truncate font-medium">
            {row.original.title}
          </span>
          <span className="block truncate font-mono text-xs text-muted-foreground">
            {row.original.fileType}
            {row.original.fileSizeKb != null
              ? ` · ${formatFileSize(row.original.fileSizeKb)}`
              : ""}
          </span>
        </span>
      </span>
    ),
  },
  {
    accessorKey: "categoria",
    header: "Categoría",
    cell: ({ row }) => (
      <span className="block truncate text-muted-foreground">
        {row.original.categoria}
      </span>
    ),
  },
  {
    accessorKey: "area",
    header: "Área",
    cell: ({ row }) => (
      <span className="block truncate text-muted-foreground">
        {row.original.area}
      </span>
    ),
  },
  {
    accessorKey: "revisionDate",
    header: "Actualizado",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDocumentoDate(row.original.revisionDate)}
      </span>
    ),
  },
  actionColumn<Documento>((row) => (
    <JdhButton
      asChild
      variant="ghost"
      size="icon-sm"
      aria-label={`Descargar ${row.title}`}
    >
      <a href={row.downloadUrl} download>
        <Download />
      </a>
    </JdhButton>
  )),
]

export function DocumentosTable({ items }: { items: Documento[] }) {
  return (
    <DataTable
      columns={columns}
      data={items}
      gridTemplate={GRID_TEMPLATE}
      emptyState={
        <EmptyState
          icon={FileText}
          title="No hay documentos"
          description="Ajusta la búsqueda o el filtro de categoría para ver más resultados."
        />
      }
    />
  )
}
