"use client"

import type { ColumnDef } from "@tanstack/react-table"
import type { Route } from "next"
import Link from "next/link"
import { BookOpen, Download, FileText } from "lucide-react"

import { ContentBadge } from "@/intranet/components/common/content-badge"
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
 * NO se usa `rowHref`: está tipado `(row) => \`/${string}\`` y no todos los
 * documentos tienen página de lectura (los de solo descarga no). El título
 * enlaza a la página cuando existe, y la columna de acción descarga el
 * archivo o, si no hay archivo, abre la página.
 *
 * `enableSorting` queda apagado a propósito: el orden lo resuelve Strapi
 * (`sort=revisionDate:desc`) sobre el catálogo completo — ordenar en cliente
 * solo reordenaría las 10 filas visibles, que es peor que no ordenar.
 */
function documentoDetalle(documento: Documento): string {
  const codigo = [
    documento.codigo,
    documento.version ? `v${documento.version}` : null,
  ]
    .filter(Boolean)
    .join(" ")
  const archivo = documento.downloadUrl
    ? [documento.fileType, formatFileSize(documento.fileSizeKb)]
        .filter(Boolean)
        .join(" · ")
    : "Página"
  return [codigo, archivo].filter(Boolean).join(" · ")
}

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
          <span className="flex min-w-0 items-center gap-2">
            {row.original.href ? (
              <Link
                href={row.original.href as Route}
                className="truncate rounded-sm font-medium underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {row.original.title}
              </Link>
            ) : (
              <span className="truncate font-medium">{row.original.title}</span>
            )}
            {row.original.obligatorio ? (
              <ContentBadge badge="obligatorio" className="shrink-0" />
            ) : null}
          </span>
          <span className="block truncate font-mono text-xs text-muted-foreground">
            {documentoDetalle(row.original)}
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
  actionColumn<Documento>((row) =>
    row.downloadUrl ? (
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
    ) : row.href ? (
      <JdhButton
        asChild
        variant="ghost"
        size="icon-sm"
        aria-label={`Leer ${row.title}`}
      >
        <Link href={row.href as Route}>
          <BookOpen />
        </Link>
      </JdhButton>
    ) : null
  ),
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
          description="Ajusta la búsqueda o los filtros para ver más resultados."
        />
      }
    />
  )
}
