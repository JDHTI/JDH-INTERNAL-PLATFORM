"use client"

import * as React from "react"
import type { Route } from "next"
import Link from "next/link"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type RowData,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react"

import { cn } from "@/intranet/lib/utils"

// Per-column layout hooks (applied to header + body cells).
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string
    headerClassName?: string
  }
}

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  /** CSS grid-template-columns, e.g. "1fr 160px 120px 40px" (design layout). */
  gridTemplate: string
  /** Makes each row a full-row link (overlay anchor). */
  rowHref?: (row: TData) => `/${string}`
  /** Accessible label for the row link (defaults to "Ver detalle"). */
  rowLabel?: (row: TData) => string
  onRowClick?: (row: TData) => void
  emptyState?: React.ReactNode
  enableSorting?: boolean
  /**
   * Pins column 1 to the left edge of the table's own scroll container while
   * the rest of the row scrolls underneath — so the row stays identifiable
   * (e.g. a person's photo + name) even before scrolling.
   *
   * Give flexible columns a floor via `minmax(180px, 1fr)` (instead of a bare
   * `1fr`) in `gridTemplate` — that's what determines how wide the row is
   * allowed to get before it stops shrinking. There's no separate "min
   * width" prop to keep in sync by hand: a block-level grid row with
   * `width: auto` doesn't grow to fit its own tracks' floors (it just fills
   * its container and lets the excess overflow *without* the row's own box
   * — and therefore its background — covering it, which is why unstyled
   * "blank" columns appear once you scroll past the container's width). So
   * `computeRowMinWidth` below parses those same floors back out of
   * `gridTemplate` and applies the total as the row's real `min-width`,
   * keeping template and floor a single source of truth instead of two
   * numbers that can drift apart.
   */
  stickyFirstColumn?: boolean
}

const ROW_GAP_PX = 16 // Tailwind `gap-4`
const ROW_HORIZONTAL_PADDING_PX = 24 // `pr-6` (the sticky row drops `pl-6` to the cell itself)

/**
 * Sums the pixel floor of each grid-template track — a bare `Npx` track
 * contributes `N`; `minmax(Npx, …)` contributes its `N`; anything else (a
 * bare `fr`) contributes 0, since it has no declared floor — plus the
 * column gaps and the row's own padding, giving the row's true minimum
 * rendered width. Assumes tracks are space-separated with no internal
 * whitespace (e.g. `minmax(200px,1.2fr)`, not `minmax(200px, 1.2fr)`).
 */
function computeRowMinWidth(gridTemplate: string): number {
  const tracks = gridTemplate.trim().split(/\s+/).filter(Boolean)
  const floors = tracks.reduce((sum, track) => {
    const minmax = /^minmax\(([\d.]+)px/.exec(track)
    if (minmax) return sum + parseFloat(minmax[1])
    const px = /^([\d.]+)px$/.exec(track)
    return px ? sum + parseFloat(px[1]) : sum
  }, 0)
  const gaps = ROW_GAP_PX * Math.max(0, tracks.length - 1)
  return floors + gaps + ROW_HORIZONTAL_PADDING_PX
}

/**
 * Data table rendered as a CSS grid ("grid of links" per the design, not a
 * `<table>`), driven by TanStack Table. This fixes the project's table
 * convention: columns are `ColumnDef`s, an action column is just another
 * column (see `actionColumn`), and sorting is client-side and opt-in.
 *
 * ARIA table/row/cell roles preserve semantics; when `rowHref` is set an
 * overlay anchor makes the whole row clickable while action-column cells sit
 * above it (they carry `relative z-10` via their meta.className).
 */
export function DataTable<TData>({
  columns,
  data,
  gridTemplate,
  rowHref,
  rowLabel,
  onRowClick,
  emptyState,
  enableSorting = false,
  stickyFirstColumn = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns non-memoizable functions by design; state is managed internally.
  const table = useReactTable({
    data,
    columns,
    enableSorting,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const rows = table.getRowModel().rows
  const rowMinWidth = stickyFirstColumn
    ? computeRowMinWidth(gridTemplate)
    : undefined

  return (
    <div
      role="table"
      className="overflow-hidden rounded-[var(--jdh-radius-md)] border border-border"
    >
      <div className="overflow-x-auto">
        <div role="rowgroup">
          {table.getHeaderGroups().map((headerGroup) => (
            <div
              key={headerGroup.id}
              role="row"
              className={cn(
                "grid items-center gap-4 border-b border-border bg-muted py-3",
                stickyFirstColumn ? "pr-6" : "px-6"
              )}
              style={{
                gridTemplateColumns: gridTemplate,
                minWidth: rowMinWidth,
              }}
            >
              {headerGroup.headers.map((header, index) => {
                const canSort = header.column.getCanSort()
                const sorted = header.column.getIsSorted()

                return (
                  <div
                    key={header.id}
                    role="columnheader"
                    aria-sort={
                      sorted
                        ? sorted === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={cn(
                      "font-mono text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase",
                      header.column.columnDef.meta?.headerClassName,
                      stickyFirstColumn &&
                        index === 0 &&
                        "sticky left-0 z-20 border-r border-border bg-muted pl-6"
                    )}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 uppercase outline-none hover:text-foreground focus-visible:text-foreground"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {sorted === "asc" ? (
                          <ChevronUp className="size-3" />
                        ) : sorted === "desc" ? (
                          <ChevronDown className="size-3" />
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div role="rowgroup">
          {rows.length === 0 ? (
            <div role="row">
              <div role="cell" className="px-6 py-12">
                {emptyState ?? (
                  <p className="text-center text-sm text-muted-foreground">
                    No hay datos para mostrar.
                  </p>
                )}
              </div>
            </div>
          ) : (
            rows.map((row) => {
              const href = rowHref?.(row.original)

              return (
                <div
                  key={row.id}
                  role="row"
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                  className={cn(
                    "group relative grid items-center gap-4 border-b border-border py-4 transition-colors last:border-b-0",
                    stickyFirstColumn ? "pr-6" : "px-6",
                    (href || onRowClick) && "hover:bg-accent",
                    onRowClick && "cursor-pointer"
                  )}
                  style={{
                    gridTemplateColumns: gridTemplate,
                    minWidth: rowMinWidth,
                  }}
                >
                  {href ? (
                    <Link
                      href={href as Route}
                      aria-label={rowLabel?.(row.original) ?? "Ver detalle"}
                      className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    />
                  ) : null}
                  {row.getVisibleCells().map((cell, index) => (
                    <div
                      key={cell.id}
                      role="cell"
                      className={cn(
                        "min-w-0 text-sm",
                        cell.column.columnDef.meta?.className,
                        stickyFirstColumn &&
                          index === 0 &&
                          "pointer-events-none sticky left-0 z-20 border-r border-border bg-background pl-6 transition-colors group-hover:bg-accent"
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </div>
                  ))}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Builds an action column (buttons/menus per row). Its cells sit above the
 * row's overlay link (`relative z-10`) so their controls stay clickable.
 * `align` defaults to `"end"` (existing callers keep their right-aligned
 * icons unchanged) — pass `"center"` to center both the header label and the
 * row's controls under it (e.g. a header that reads "Acciones").
 */
export function actionColumn<TData>(
  render: (row: TData) => React.ReactNode,
  options?: {
    id?: string
    header?: string
    align?: "start" | "center" | "end"
  }
): ColumnDef<TData, unknown> {
  const align = options?.align ?? "end"
  const justify =
    align === "center"
      ? "justify-center"
      : align === "start"
        ? "justify-start"
        : "justify-end"

  return {
    id: options?.id ?? "actions",
    header: options?.header ?? "",
    enableSorting: false,
    cell: ({ row }) => render(row.original),
    meta: {
      className: cn("relative z-10 flex items-center", justify),
      headerClassName: align === "center" ? "text-center" : undefined,
    },
  }
}
