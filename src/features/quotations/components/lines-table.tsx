"use client";

import { useMemo } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDashed,
  Clock3,
  CloudUpload,
  HandCoins,
  Loader2,
  MessageSquareText,
  Receipt,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  Warehouse,
  X,
} from "lucide-react";

import { Badge, type BadgeTone, badgeVariants } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Menu, MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "@/shared/components/ui/menu";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { type ColumnKey, useColumnWidths } from "../hooks/use-column-widths";
import type { LineEditor } from "../hooks/use-line-editor";
import { formatDay, formatMargin, formatMoney, formatShortDay, formatVariation, parsePriceInput } from "../lib/format";
import {
  type Sort,
  type SortKey,
  type Standing,
  isLocal,
  lastPriceStanding,
  newPriceStanding,
  previewLine,
  priceWithVat,
  suggestedMargin,
  supplierOf,
} from "../lib/line-status";
import { REVIEW_HELP, REVIEW_LABELS, type ReviewView, reviewOf } from "../lib/list-review";
import { offerAmounts } from "../lib/offer";
import { APPLIED_LOOK, appliedKinds } from "../lib/support-kinds";
import type { QuotationLine, ReviewStatus, StockTotal } from "../types/quotations.types";
import { ComplianceBadge } from "./quotation-badges";
import { StockBreakdownPopover } from "./stock-breakdown";

/** Row selection for the bulk actions; absent when the quotation cannot be edited. */
export interface LineSelection {
  selected: Set<string>;
  /** Every reference the active filters show, across pages. */
  scope: string[];
  toggle: (sku: string) => void;
  /** Ticks every reference of `scope`, or unticks them when all already are. */
  toggleAll: () => void;
}

interface LinesProps {
  lines: QuotationLine[];
  editor: LineEditor;
  /** False while it waits for validation: everything is read-only. */
  editable: boolean;
  onOpenDetail: (line: QuotationLine) => void;
  onRemove: (line: QuotationLine) => void;
  /** The reference being removed, to show its spinner. */
  removing: string | null;
  /** False while prices are unsaved or another write is running: removing needs the current version. */
  canRemove: boolean;
  selection?: LineSelection;
  /** References a paste is adding, painted at the end until the API answers. */
  pending?: string[];
  /** Revalidated by the last paste: tinted for a moment so they can be found. */
  highlight?: Set<string>;
  sort: Sort | null;
  onSort: (sort: Sort | null) => void;
  /** The quotation quotes with quantities: a quantity per line and its total. */
  withQuantities: boolean;
  /** Quantities never touch prices, so they stay editable in every status for whoever manages it. */
  quantitiesEditable: boolean;
  /** BI (who validates) sees the highest cost under the suggested prices, with its breakdown. */
  showCost: boolean;
  /** What each line is compared against: "Último precio", or "Precio actual" (the list's) on a list update. */
  basePriceLabel?: string;
  /** A list update: the last sale goes in a tooltip beside the list price. */
  showLastSale?: boolean;
  /** A list update: each item's review chip, its stock and its observation under the product. */
  listMeta?: ListMeta;
  /** The quotation each line's stock breakdown is asked for (`GET /{id}/stock-breakdown`). */
  stockOf?: { quotationId: string; version: number };
}

export interface ListMeta {
  /** Stock per reference in the list's warehouses; undefined while it loads or when it failed. */
  stock?: Record<string, StockTotal>;
  stockState: "loading" | "ready" | "error";
  /** The review is changed on the row's chip. */
  review?: ReviewControl;
}

export const OPTIMAL_PRICE_HELP = "Da exactamente el margen objetivo del producto, con su apoyo, en pesos enteros.";
export const MIN_PRICE_HELP = "El más bajo que cumple la regla: deja el margen 1 punto bajo el objetivo. Por debajo, el validador lo ve como alerta.";
export const BELOW_TARGET_HELP = "Margen actual bajo el objetivo: revisar y actualizar.";
export const INACTIVE_HELP = "Inactiva en SIESA: reemplázala. No sale en el Excel ni en el plano.";
export const LOCAL_HELP = "Producto creado solo para cotizar: no existe en SIESA, no tiene costo ni regla y no sale en el Excel ni en el plano.";

/** Added, local or inactive references come out; the ones from the sales or the list keep their row. */
const removable = (line: QuotationLine) => (line.origin !== "historico" && line.origin !== "lista") || !line.is_active;

/*
 * One view, no sideways scroll: each column is a block of two or three short
 * lines (what the product is; its last sale; the prices that bound the new
 * one; the new one and its margin; the price with VAT) instead of a column per
 * number. Widths are fixed so the product block takes what is left.
 */
const th = "h-12 px-2.5 py-1.5 align-middle leading-tight";
const td = "px-2.5 py-2 align-top";
const CHECK_WIDTH = 40;
/** The row tints as a layer over the pinned cells' opaque surface. */
const TINT_INFO = "bg-[image:linear-gradient(var(--info-surface),var(--info-surface))]";
const TINT_HOVER = "group-hover:bg-[image:linear-gradient(var(--primary-subtle),var(--primary-subtle))]";
/** An explicit line between columns, from "Último" on; the header's divider can be moved. */
const divided = "relative border-l border-border";

/**
 * The divider between two columns, on the left edge of a header cell: the
 * WAI-ARIA window-splitter pattern. Drag it, or focus it and use the arrow
 * keys (Shift for bigger steps); Enter or a double click puts every column
 * back to its default width. The visible line darkens on hover and focus.
 */
function ColumnDivider({
  label,
  width,
  min,
  ...handlers
}: {
  label: string;
  width: number;
  min: number;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  onDoubleClick: () => void;
}) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={min}
      tabIndex={0}
      title="Arrastra para ajustar el ancho. Doble clic restablece las columnas."
      className={cn(
        "absolute -left-2 top-0 z-10 h-full w-4 cursor-col-resize touch-none rounded-sm",
        "before:absolute before:inset-y-1.5 before:left-1/2 before:w-0.5 before:-translate-x-1/2 before:rounded-full before:bg-transparent",
        "hover:before:bg-text-secondary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring focus-visible:before:bg-text-primary"
      )}
      {...handlers}
    />
  );
}

/**
 * The references and what decides each new price. "Precio nuevo" is the only
 * editable cell; the mark beside each margin (color, icon and words) says
 * where it stands against the rule. It is a table once its container (not the
 * window: the sidebar may be open or collapsed) leaves the product block about
 * 11rem for its name (70rem); below that, cards. With quantities it never turns
 * into cards: it scrolls sideways under 77rem, the product pinned.
 */
export function LinesTable(props: LinesProps) {
  const { lines, selection, sort, onSort, withQuantities } = props;
  const scope = selection?.scope ?? [];
  const allTicked = selection !== undefined && scope.length > 0 && scope.every((sku) => selection.selected.has(sku));
  const someTicked = selection !== undefined && scope.some((sku) => selection.selected.has(sku));
  const columns = useMemo<ColumnKey[]>(
    () => ["last", "bounds", "price", "support", "vat", "consumption", "final", ...(withQuantities ? (["qty"] as const) : []), "variation"],
    [withQuantities]
  );
  const { widths, min, tableRef, startDrag, onDrag, endDrag, onKey, reset } = useColumnWidths(columns, selection ? 40 : 0);
  const sortProps = { sort, onSort };
  /** The divider on the left edge of the column at `index` in `columns`; boundary 0 sits after the product. */
  const divider = (index: number, name: string) => (
    <ColumnDivider
      label={`Ancho de ${name}`}
      width={widths[columns[index]]}
      min={min[columns[index]]}
      onPointerDown={(event) => startDrag(index, event)}
      onPointerMove={onDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={(event) => onKey(index, event)}
      onDoubleClick={reset}
    />
  );
  const at = (key: ColumnKey) => columns.indexOf(key);
  const baseHeader = `${props.basePriceLabel ?? "Último precio"} sin IVA`;
  // With quantities it is always a table: narrower than it needs, it scrolls sideways with the
  // checkbox and the product pinned on the left.
  const scrolls = withQuantities;
  const pinned = (offset: number) => (scrolls ? { className: "sticky z-[1]", style: { left: offset } } : { className: "", style: undefined });
  const pinCheck = pinned(0);
  const pinProduct = pinned(selection ? CHECK_WIDTH : 0);

  return (
    <div className={cn("rounded-lg border border-border bg-surface", scrolls ? "overflow-x-auto" : "hidden @min-[70rem]:block")}>
      <table ref={tableRef} className={cn("w-full table-fixed text-left text-sm", scrolls && "min-w-[77rem]")}>
        <caption className="sr-only">Referencias de la cotización</caption>
        <colgroup>
          {selection && <col style={{ width: CHECK_WIDTH }} />}
          <col />
          {/* Widths are the person's own (dividers), so they come from state, not from classes. */}
          {columns.map((key) => (
            <col key={key} style={{ width: widths[key] }} />
          ))}
        </colgroup>
        <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          <tr>
            {selection && (
              <th scope="col" className={cn(th, "rounded-tl-lg bg-canvas-subtle pr-0", pinCheck.className)} style={pinCheck.style}>
                <input
                  type="checkbox"
                  checked={allTicked}
                  ref={(element) => {
                    if (element) element.indeterminate = someTicked && !allTicked;
                  }}
                  onChange={selection.toggleAll}
                  aria-label={`Seleccionar las ${scope.length} referencias del filtro, en todas las páginas`}
                  title="Selecciona todas las referencias del filtro, no solo las de esta página"
                  className="size-4 accent-[var(--primary)]"
                />
              </th>
            )}
            <th
              scope="col"
              className={cn(th, !selection && "rounded-tl-lg", pinProduct.className, scrolls && "border-r border-border bg-canvas-subtle")}
              style={pinProduct.style}
            >
              Producto
            </th>
            {/* The headers say what each figure is, in full; they wrap to two lines rather than abbreviate. */}
            <SortHeader
              label={baseHeader}
              name={baseHeader}
              keys={[["last_price", "Precio"], ["current_margin", "Margen"]]}
              divider={divider(at("last"), baseHeader)}
              {...sortProps}
            />
            <SortHeader
              label="Precios sugeridos"
              name="Precios sugeridos"
              keys={[
                ["optimal", "Óptimo"],
                ["min_price", "Mínimo"],
                ...(props.showCost ? ([["cost", "Costo más alto"]] as [SortKey, string][]) : []),
              ]}
              divider={divider(at("bounds"), "Precios sugeridos")}
              {...sortProps}
            />
            <SortHeader
              label="Precio nuevo sin IVA"
              name="Precio nuevo sin IVA"
              keys={[["new_price", "Precio"], ["new_margin", "Margen nuevo"]]}
              divider={divider(at("price"), "Precio nuevo sin IVA")}
              {...sortProps}
            />
            <th scope="col" className={cn(th, divided)}>
              {divider(at("support"), "Apoyo")}
              Apoyo
            </th>
            <SortHeader label="IVA" name="IVA" keys={[["vat", "IVA"]]} divider={divider(at("vat"), "IVA")} {...sortProps} />
            <SortHeader
              label="Imp. consumo"
              name="Impuesto al consumo"
              keys={[["consumption_tax", "Impuesto al consumo"]]}
              divider={divider(at("consumption"), "Impuesto al consumo")}
              {...sortProps}
            />
            {/* What the customer pays per unit: VAT plus the consumption tax where it applies. */}
            <SortHeader label="Precio neto" name="Precio neto" keys={[["final_price", "Precio neto"]]} divider={divider(at("final"), "Precio neto")} {...sortProps} />
            {withQuantities && (
              <SortHeader
                label="Cant."
                name="Cantidad y total"
                keys={[["quantity", "Cantidad"], ["line_total", "Total"]]}
                divider={divider(at("qty"), "Cantidad")}
                {...sortProps}
              />
            )}
            <SortHeader
              label="Var."
              name="Variación"
              keys={[["variation", "Variación"]]}
              divider={divider(at("variation"), "Variación")}
              className="rounded-tr-lg"
              {...sortProps}
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((line) => {
            const highlighted = props.highlight?.has(line.sku) ?? false;
            // A pinned cell is opaque, so the row's tint is laid over the surface instead of seen through.
            const pinnedFill = scrolls && cn("bg-surface transition-[background-image] duration-300", highlighted ? TINT_INFO : TINT_HOVER);
            return (
              <tr key={line.sku} className={cn("group transition-colors duration-300", highlighted ? "bg-info-surface" : "hover:bg-primary-subtle")}>
                {selection && (
                  <td className={cn(td, "pr-0", pinCheck.className, pinnedFill)} style={pinCheck.style}>
                    <RowCheckbox line={line} selection={selection} />
                  </td>
                )}
                <td className={cn(td, pinProduct.className, pinnedFill, scrolls && "border-r border-border")} style={pinProduct.style}>
                  <Product line={line} {...props} />
                </td>
                <td className={cn(td, divided, "text-right")}>
                  <LastSale line={line} forList={props.showLastSale} />
                </td>
                <td className={cn(td, divided)}><Bounds line={line} showCost={props.showCost} /></td>
                <td className={cn(td, divided)}>
                  <NewPrice line={line} editor={props.editor} editable={props.editable} />
                </td>
                <td className={cn(td, divided)}><SupportBadge line={line} onOpen={props.onOpenDetail} /></td>
                <td className={cn(td, divided, "whitespace-nowrap text-right tabular-nums")}><Vat line={line} /></td>
                <td className={cn(td, divided, "text-right tabular-nums")}><ConsumptionTax line={line} /></td>
                <td className={cn(td, divided, "text-right")}><FinalPrice line={line} /></td>
                {withQuantities && (
                  <td className={cn(td, divided)}>
                    <QuantityCell line={line} editor={props.editor} editable={props.quantitiesEditable} />
                  </td>
                )}
                <td className={cn(td, divided, "text-right")}><Variation line={line} editor={props.editor} /></td>
              </tr>
            );
          })}
          {(props.pending ?? []).map((sku) => (
            <tr key={`pending-${sku}`} aria-busy="true">
              {selection && <td className={cn(td, pinCheck.className, scrolls && "bg-surface")} style={pinCheck.style} />}
              <td className={cn(td, pinProduct.className, scrolls && "border-r border-border bg-surface")} style={pinProduct.style}>
                <span className="block font-mono text-[13px]">{sku}</span>
                <PendingLabel />
              </td>
              <td className={cn(td, divided)} colSpan={columns.length} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * In a narrower container the blocks leave the product too little room, so
 * each reference becomes a card with the same blocks and the field to write
 * the price (DESIGN.md §10).
 */
export function LinesList(props: LinesProps) {
  const { lines, editor, editable, selection, withQuantities } = props;
  // Quoting with quantities is always the table: the quantities are compared down a column.
  if (withQuantities) return null;
  return (
    <ul className="grid grid-cols-1 gap-2 @2xl:grid-cols-2 @min-[70rem]:hidden">
      {lines.map((line) => (
        <li
          key={line.sku}
          className={cn(
            "min-w-0 space-y-3 rounded-lg border border-border p-3 transition-colors duration-300",
            props.highlight?.has(line.sku) ? "bg-info-surface" : "bg-surface"
          )}
        >
          <div className="flex items-start gap-2">
            {selection && <RowCheckbox line={line} selection={selection} large />}
            <div className="min-w-0 flex-1">
              <Product line={line} {...props} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Pair label={`${props.basePriceLabel ?? "Último precio"} sin IVA`}>
              <LastSale line={line} alignStart forList={props.showLastSale} />
            </Pair>
            <Pair label="Precios sugeridos"><Bounds line={line} showCost={props.showCost} /></Pair>
            <Pair label="Apoyo"><SupportBadge line={line} onOpen={props.onOpenDetail} /></Pair>
            <Pair label="IVA · imp. consumo">
              <span className="block text-[13px] tabular-nums">
                <Vat line={line} /> · <ConsumptionTax line={line} />
              </span>
            </Pair>
            <Pair label="Precio neto"><FinalPrice line={line} alignStart /></Pair>
          </dl>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <span className="block text-xs text-text-secondary">Precio nuevo sin IVA</span>
              <NewPrice line={line} editor={editor} editable={editable} wide />
            </div>
            {withQuantities && (
              <div className="space-y-1">
                <span className="block text-xs text-text-secondary">Cantidad{line.unit ? ` (${line.unit})` : ""}</span>
                <QuantityCell line={line} editor={editor} editable={props.quantitiesEditable} wide />
              </div>
            )}
            <div className="text-right text-sm">
              <span className="block text-xs text-text-secondary">Variación</span>
              <Variation line={line} editor={editor} />
            </div>
          </div>
        </li>
      ))}
      {(props.pending ?? []).map((sku) => (
        <li key={`pending-${sku}`} aria-busy="true" className="space-y-1 rounded-lg border border-dashed border-border-control bg-surface p-3">
          <p className="font-mono text-[13px]">{sku}</p>
          <PendingLabel />
        </li>
      ))}
    </ul>
  );
}

/**
 * A column header that sorts. The menu says it in words ("mayor a menor"), and
 * a column with two figures (a price and its margin) offers both. One column at
 * a time (DESIGN.md §7.3); `aria-sort` tells assistive tech which.
 */
function SortHeader({
  label,
  name,
  keys,
  sort,
  onSort,
  className,
  divider,
}: {
  /** What the header shows, short. */
  label: string;
  /** The column's full name, for the menu's accessible label and tooltip. */
  name: string;
  keys: [SortKey, string][];
  sort: Sort | null;
  onSort: (sort: Sort | null) => void;
  className?: string;
  /** The movable divider on the column's left edge. */
  divider?: React.ReactNode;
}) {
  const active = sort && keys.some(([key]) => key === sort.key) ? sort : null;
  const Icon = !active ? ArrowUpDown : active.direction === "desc" ? ArrowDown : ArrowUp;
  const activeLabel = active ? keys.find(([key]) => key === active.key)?.[1] : null;
  const words = active ? `${keys.length > 1 ? `${activeLabel}, ` : ""}${active.direction === "desc" ? "mayor a menor" : "menor a mayor"}` : null;
  return (
    <th
      scope="col"
      aria-sort={active ? (active.direction === "asc" ? "ascending" : "descending") : undefined}
      className={cn(th, divider && divided, "text-right", className)}
    >
      {divider}
      <Menu
        align="end"
        trigger={
          <>
            <span className="text-right">{label}</span>
            <Icon className={cn("size-3 shrink-0", active ? "text-text-primary" : "text-text-secondary")} aria-hidden="true" />
          </>
        }
        triggerLabel={`Ordenar por ${name}${words ? `. Ahora: ${words}` : ""}`}
        triggerTitle={words ? `${name}, ordenado: ${words}` : `Ordenar por ${name}`}
        triggerClassName={cn(
          // The full header can take two lines; the arrow stays beside its last word.
          "ml-auto inline-flex min-h-8 max-w-full items-center gap-1 rounded-sm text-right font-semibold uppercase tracking-[0.06em] hover:text-text-primary",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          active && "text-text-primary"
        )}
      >
        <MenuRadioGroup
          value={active ? `${active.key}:${active.direction}` : ""}
          label={`Orden por ${name}`}
          onValueChange={(next) => {
            const [key, direction] = next.split(":") as [SortKey, Sort["direction"]];
            onSort({ key, direction });
          }}
        >
          {keys.map(([key, name], index) => (
            <div key={key}>
              {keys.length > 1 && (
                <>
                  {index > 0 && <MenuSeparator />}
                  <MenuLabel>{name}</MenuLabel>
                </>
              )}
              <MenuRadioItem value={`${key}:desc`}>Mayor a menor</MenuRadioItem>
              <MenuRadioItem value={`${key}:asc`}>Menor a mayor</MenuRadioItem>
            </div>
          ))}
        </MenuRadioGroup>
        {active && (
          <>
            <MenuSeparator />
            <MenuItem onClick={() => onSort(null)}>Quitar el orden</MenuItem>
          </>
        )}
      </Menu>
    </th>
  );
}

function RowCheckbox({ line, selection, large = false }: { line: QuotationLine; selection: LineSelection; large?: boolean }) {
  return (
    <input
      type="checkbox"
      checked={selection.selected.has(line.sku)}
      onChange={() => selection.toggle(line.sku)}
      aria-label={`Seleccionar ${line.description ?? line.sku}`}
      className={cn("mt-0.5 shrink-0 accent-[var(--primary)]", large ? "size-5" : "size-4")}
    />
  );
}

/** A pasted reference the API has not answered for yet: no numbers until it does. */
function PendingLabel() {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Agregando…
    </span>
  );
}

function Pair({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

const dash = <span className="text-text-secondary">—</span>;

/**
 * What the product is: description (opens the detail), then reference,
 * supplier and unit. An added, local or inactive one says so, and can be taken
 * out; an active one from the sales history cannot (emptying its price is enough).
 */
function Product({ line, onOpenDetail, onRemove, removing, canRemove, editable, listMeta, stockOf }: { line: QuotationLine } & LinesProps) {
  const isRemoving = removing === line.sku;
  const local = isLocal(line);
  const meta = [local ? "Sin SKU en SIESA" : `SKU ${line.sku}`, supplierOf(line), line.unit].filter(Boolean).join(" · ");
  return (
    <div className="flex min-w-0 items-start gap-1">
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenDetail(line)}
            title={line.description ? `${line.description}. Ver el detalle` : "Ver el detalle"}
            className={cn(
              // `relative` keeps the sr-only suffix inside the truncated box; otherwise it sits where the full text would end.
              "relative min-w-0 truncate rounded-sm text-left font-medium underline-offset-2 hover:underline",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-xl:min-h-11",
              !line.is_active && "text-text-secondary"
            )}
          >
            {line.description ?? line.sku}
            <span className="sr-only">. Ver el detalle</span>
          </button>
          {!line.is_active ? (
            <Badge tone="danger" className="shrink-0 px-1.5 py-0 text-xs" title={INACTIVE_HELP}>
              <Ban aria-hidden="true" /> Inactiva<span className="sr-only">: {INACTIVE_HELP}</span>
            </Badge>
          ) : local ? (
            <Badge tone="warning" className="shrink-0 px-1.5 py-0 text-xs" title={LOCAL_HELP}>
              {line.origin_label || "Solo cotización"}<span className="sr-only">: {LOCAL_HELP}</span>
            </Badge>
          ) : (
            line.origin === "agregado" && <Badge tone="info" className="shrink-0 px-1.5 py-0 text-xs">{line.origin_label || "Agregado"}</Badge>
          )}
        </div>
        <p
          className="truncate text-[13px] text-text-secondary"
          title={[meta, line.category ? `Categoría: ${line.category}` : null].filter(Boolean).join(" · ")}
        >
          {meta}
        </p>
        <Stock line={line} stockOf={stockOf} />
        {listMeta && <ListItemMeta line={line} meta={listMeta} onOpenDetail={onOpenDetail} />}
      </div>
      {editable && removable(line) && (
        <button
          type="button"
          onClick={() => onRemove(line)}
          disabled={!canRemove || isRemoving}
          aria-label={`Quitar ${line.description ?? line.sku} de la cotización`}
          title="Quitar de la cotización"
          className="flex size-7 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 max-xl:size-11"
        >
          {isRemoving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}

const units = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/**
 * Units on hand and available, summed over the saleable warehouses of the
 * chosen centers (Nacional: the main ones), for both BI and Comercial, with
 * an «i» that shows them by center and warehouse. Nothing when the API does
 * not know them; "sin disponible" in words, so quoting what cannot be shipped
 * stands out without color.
 */
export function Stock({ line, stockOf }: { line: QuotationLine; stockOf?: LinesProps["stockOf"] }) {
  const onHand = toNumber(line.stock_on_hand);
  const available = toNumber(line.stock_available);
  if (onHand === null && available === null) return null;
  const empty = available !== null && available <= 0;
  return (
    <p className="flex min-w-0 items-center gap-x-1 text-[13px] tabular-nums text-text-secondary">
      <span className="truncate" title="Existencia y disponible en las bodegas vendibles de los C.O. elegidos">
        Existencia {onHand === null ? "—" : units.format(onHand)} ·{" "}
        {empty ? <span className="font-medium text-text-primary">sin disponible</span> : `Disponible ${available === null ? "—" : units.format(available)}`}
      </span>
      {stockOf && !isLocal(line) && <StockBreakdownPopover quotationId={stockOf.quotationId} version={stockOf.version} sku={line.sku} />}
    </p>
  );
}

const STANDING_LOOK: Record<Standing, { tone: BadgeTone; icon: typeof ThumbsUp; words: string }> = {
  objetivo: { tone: "success", icon: ThumbsUp, words: "cumple el objetivo" },
  rango: { tone: "warning", icon: AlertTriangle, words: "en rango, bajo el objetivo" },
  minimo: { tone: "danger", icon: ThumbsDown, words: "bajo el mínimo" },
};

/**
 * A margin with where it stands: tone, an icon that differs by standing, and
 * the words for screen readers. A badge, not colored text: its opaque
 * background keeps AA on a hovered or flashing row in both themes (§3.5).
 */
export function MarginMark({ value, standing }: { value: string | null; standing: Standing | null }) {
  if (toNumber(value) === null) return dash;
  if (!standing) return <span className="font-medium tabular-nums">{formatMargin(value)}</span>;
  const look = STANDING_LOOK[standing];
  const Icon = look.icon;
  return (
    <Badge tone={look.tone} className="px-1.5 py-0 tabular-nums" title={`Margen con apoyo: ${look.words}`}>
      {formatMargin(value)}
      <Icon aria-hidden="true" />
      <span className="sr-only">, {look.words}</span>
    </Badge>
  );
}

/**
 * The last sale: price, the margin it left (with support) and when it was
 * invoiced. On a list update, the list's price in force and its margin, with
 * the last sale under it (its cost only for whoever sees costs).
 */
function LastSale({
  line,
  alignStart = false,
  forList = false,
}: {
  line: QuotationLine;
  alignStart?: boolean;
  forList?: boolean;
}) {
  if (forList) return <ListPrice line={line} alignStart={alignStart} />;
  if (toNumber(line.last_price) === null) {
    return <span className="text-[13px] text-text-secondary">{isLocal(line) ? "—" : "Sin compras en la ventana"}</span>;
  }
  const origin = [line.last_document ? `Documento ${line.last_document}` : null, line.last_sale_unit ? `vendido en ${line.last_sale_unit}` : null]
    .filter(Boolean)
    .join(", ");
  return (
    <div className={cn("space-y-0.5 tabular-nums", alignStart ? "text-left" : "text-right")}>
      <span className="block whitespace-nowrap font-semibold" title={origin || undefined}>{formatMoney(line.last_price)}</span>
      <span className="block"><MarginMark value={line.current_margin_with_support_pct} standing={lastPriceStanding(line)} /></span>
      {line.last_sale_date && (
        <span className="block whitespace-nowrap text-xs text-text-secondary" title={`Facturado el ${formatDay(line.last_sale_date)}`}>
          facturado {formatShortDay(line.last_sale_date)}
        </span>
      )}
    </div>
  );
}

/**
 * A list update's base: the price in force on the list and its margin. Whether
 * the item sold, and at what price, stays out of sight in a small mark beside
 * the price: hover, focus or tap it to read it.
 */
function ListPrice({ line, alignStart }: { line: QuotationLine; alignStart: boolean }) {
  const hasPrice = toNumber(line.last_price) !== null;
  return (
    <div className={cn("space-y-0.5 tabular-nums", alignStart ? "text-left" : "text-right")}>
      {hasPrice ? (
        <>
          <span className={cn("flex items-center gap-1 whitespace-nowrap font-semibold", alignStart ? "justify-start" : "justify-end")}>
            {formatMoney(line.last_price)}
            <SaleMark line={line} />
          </span>
          <span className="block"><MarginMark value={line.current_margin_with_support_pct} standing={lastPriceStanding(line)} /></span>
        </>
      ) : (
        <span className={cn("flex items-center gap-1 text-[13px] text-text-secondary", alignStart ? "justify-start" : "justify-end")}>
          {line.origin === "agregado" ? "No está en la lista" : "Sin precio en la lista"}
          <SaleMark line={line} />
        </span>
      )}
    </div>
  );
}

export const NO_SALE_TEXT = "Sin venta en los últimos 12 meses";

/** "Última venta $X", or that it did not sell in the window. Two icons, so it reads without color. */
export function saleText(line: QuotationLine): string {
  const price = toNumber(line.last_sale_price ?? null);
  return price === null ? NO_SALE_TEXT : `Última venta ${formatMoney(line.last_sale_price ?? null)}`;
}

export function SaleMark({ line }: { line: QuotationLine }) {
  const sold = toNumber(line.last_sale_price ?? null) !== null;
  const text = saleText(line);
  const Icon = sold ? Receipt : CircleDashed;
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={100}
        aria-label={`${text}. ${line.description ?? line.sku}`}
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:text-text-primary",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring max-xl:size-8"
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="center" sideOffset={6} className="z-50">
          <Popover.Popup className="max-w-[calc(100vw-2rem)] whitespace-nowrap rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-[13px] font-medium text-text-primary shadow-modal outline-none">
            {text}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

const REVIEW_TONE: Record<ReviewView, BadgeTone> = {
  sin_marcar: "neutral",
  por_validar: "warning",
  validada: "success",
  cargada: "info",
};
const REVIEW_ICON: Record<ReviewView, typeof Circle> = {
  sin_marcar: Circle,
  por_validar: Clock3,
  validada: CheckCircle2,
  cargada: CloudUpload,
};

/** The item's review: tone, an icon of its own and the words, so it never rests on color alone. */
export function ReviewChip({ line }: { line: QuotationLine }) {
  const view = reviewOf(line);
  const Icon = REVIEW_ICON[view];
  const who = line.reviewed_by && view !== "sin_marcar" ? ` · ${line.reviewed_by}` : "";
  return (
    <Badge tone={REVIEW_TONE[view]} className="shrink-0 px-1.5 py-0 text-xs" title={`${REVIEW_HELP[view]}${who}`}>
      <Icon aria-hidden="true" /> {REVIEW_LABELS[view]}
    </Badge>
  );
}

/** How an item's review is changed where it shows: in its row or in its detail. */
export interface ReviewControl {
  canEdit: boolean;
  canValidate: boolean;
  /** The item whose review is being saved, for its spinner: its SKU, or `keyOf` of it. */
  pending: string | null;
  /** Where a SKU is not unique (the board has it once per list). */
  keyOf?: (line: QuotationLine) => string;
  onChange: (line: QuotationLine, status: ReviewStatus) => void;
}

/**
 * The item's review, changed right on it: the chip opens the states the person
 * may give. A loaded item, a validated one for whoever does not validate, or a
 * read-only update shows the plain chip. Marking needs a new price; the menu
 * says so instead of offering it.
 */
export function ReviewSelect({ line, control }: { line: QuotationLine; control?: ReviewControl }) {
  const view = reviewOf(line);
  if (!control || !control.canEdit || view === "cargada" || (view === "validada" && !control.canValidate)) {
    return <ReviewChip line={line} />;
  }
  const Icon = REVIEW_ICON[view];
  const priced = line.new_price !== null && line.is_active;
  const pending = control.pending !== null && control.pending === (control.keyOf ? control.keyOf(line) : line.sku);
  return (
    <Menu
      trigger={
        <>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Icon aria-hidden="true" />}
          {REVIEW_LABELS[view]}
          <ChevronDown aria-hidden="true" />
        </>
      }
      triggerLabel={`Estado de ${line.description ?? line.sku}: ${REVIEW_LABELS[view]}. Cambiar`}
      triggerTitle={REVIEW_HELP[view]}
      disabled={pending}
      triggerClassName={cn(
        badgeVariants({ tone: REVIEW_TONE[view] }),
        "shrink-0 cursor-pointer gap-1 px-1.5 py-0 text-xs hover:brightness-95 max-xl:min-h-8",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
      )}
    >
      <MenuRadioGroup
        value={view}
        label={`Estado de ${line.description ?? line.sku}`}
        onValueChange={(next) => control.onChange(line, next as ReviewStatus)}
      >
        <MenuRadioItem value="sin_marcar">Sin marcar</MenuRadioItem>
        {priced && <MenuRadioItem value="por_validar">Por validar</MenuRadioItem>}
        {priced && control.canValidate && <MenuRadioItem value="validada">Validada</MenuRadioItem>}
      </MenuRadioGroup>
      {!priced && <MenuLabel>Escribe el precio nuevo para marcarla</MenuLabel>}
    </Menu>
  );
}

const quantityFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** Under the product of a list update: the review chip, the stock in the list's warehouses and the observation. */
function ListItemMeta({ line, meta, onOpenDetail }: { line: QuotationLine; meta: ListMeta; onOpenDetail: (line: QuotationLine) => void }) {
  const stock = meta.stock?.[line.sku];
  const onHand = toNumber(stock?.on_hand ?? null);
  const available = toNumber(stock?.available ?? null);
  const stockText =
    meta.stockState === "loading"
      ? "Existencia…"
      : meta.stockState === "error"
        ? null
        : onHand === null
          ? "Sin existencia"
          : `Existencia ${quantityFormat.format(onHand)}`;
  const stockTitle =
    onHand !== null
      ? `${quantityFormat.format(onHand)} en ${stock?.warehouses ?? 0} ${stock?.warehouses === 1 ? "bodega" : "bodegas"} de los C.O. elegidos${
          available !== null ? `, ${quantityFormat.format(available)} disponibles` : ""
        }. La «i» y el detalle traen cada C.O. y bodega.`
      : "Sin existencia en las bodegas de los C.O. elegidos (foto de SIESA de esta mañana).";
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-xs text-text-secondary">
      {/* Only the main lists review item by item: a list update has no review chip. */}
      {meta.review && <ReviewSelect line={line} control={meta.review} />}
      {stockText && (
        <span className="inline-flex items-center gap-1 tabular-nums" title={stockTitle}>
          <Warehouse className="size-3.5 shrink-0" aria-hidden="true" />
          {stockText}
          {available !== null && onHand !== null && available < onHand && (
            <span className="text-text-secondary">({quantityFormat.format(available)} disp.)</span>
          )}
        </span>
      )}
      {line.note && (
        <button
          type="button"
          onClick={() => onOpenDetail(line)}
          title={`Observación: ${line.note}`}
          aria-label={`Observación de ${line.description ?? line.sku}: ${line.note}. Ver el detalle`}
          className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        >
          <MessageSquareText className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{line.note}</span>
        </button>
      )}
    </div>
  );
}

/**
 * The suggested prices that bound the new one, before VAT: óptimo, then
 * mínimo. The advisors never see the cost behind them; BI (who validates)
 * gets the highest cost right below, and its breakdown on hover or focus.
 */
function Bounds({ line, showCost }: { line: QuotationLine; showCost: boolean }) {
  if (isLocal(line)) return <span className="text-[13px] text-text-secondary">Sin costo ni regla</span>;
  const row = "flex items-baseline justify-between gap-2";
  return (
    <dl className="space-y-0.5 text-[13px] tabular-nums">
      {/* Each price with the margin it leaves, in the same chip as the new price's (decided 2026-11-23). */}
      <div className={row} title={`Óptimo. ${OPTIMAL_PRICE_HELP}`}>
        <dt className="whitespace-nowrap text-xs text-text-secondary">Óptimo</dt>
        <dd className="flex items-center justify-end gap-1.5 whitespace-nowrap font-semibold">
          {toNumber(line.optimal_price) === null ? dash : formatMoney(line.optimal_price)}
          <SuggestedMarginChip line={line} which="optimal" />
        </dd>
      </div>
      <div className={row} title={`Mínimo. ${MIN_PRICE_HELP}`}>
        <dt className="whitespace-nowrap text-xs text-text-secondary">Mínimo</dt>
        <dd className="flex items-center justify-end gap-1.5 whitespace-nowrap font-semibold">
          {toNumber(line.min_price) === null ? dash : formatMoney(line.min_price)}
          <SuggestedMarginChip line={line} which="minimum" />
        </dd>
      </div>
      {showCost && (
        // A rule above: the cost is what the two prices are built on, not a third price.
        <div className={cn(row, "mt-1 border-t border-border pt-1")}>
          <dt className="whitespace-nowrap text-xs text-text-secondary">Costo más alto</dt>
          <dd><CostBreakdown line={line} /></dd>
        </div>
      )}
    </dl>
  );
}

/** The margin a suggested price leaves, as the new price's chip; nothing when it cannot be told. */
function SuggestedMarginChip({ line, which }: { line: QuotationLine; which: "optimal" | "minimum" }) {
  const margin = suggestedMargin(line, which);
  if (!margin) return null;
  return <MarginMark value={margin.value} standing={margin.standing} />;
}

/**
 * The highest cost, and on hover (or a click, a tap, a focus) what it is made
 * of: the supplier's quote and the inventory cost the rule compares, which one
 * won, a quote left out as a capture error, and the center whose warehouses
 * gave it. Only BI renders it.
 */
export function CostBreakdown({ line }: { line: QuotationLine }) {
  if (toNumber(line.cost) === null) return <span className="text-text-secondary">Sin costo</span>;
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={150}
        aria-label={`Costo más alto ${formatMoney(line.cost)}. Ver el desglose`}
        className={cn(
          "whitespace-nowrap rounded-sm font-semibold underline decoration-dotted underline-offset-4",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-xl:min-h-11"
        )}
      >
        {formatMoney(line.cost)}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
          <Popover.Popup className="w-56 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-surface-raised px-2.5 py-2 text-[13px] text-text-primary shadow-modal outline-none">
            <Popover.Title className="sr-only">Desglose del costo</Popover.Title>
            <CostParts line={line} />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * The values the rule compared, one per row, the one it took in bold (and
 * named for screen readers). Empty sources are left out; nothing else is said.
 */
function CostParts({ line }: { line: QuotationLine }) {
  const parts = [
    { label: "Cotización", value: line.quote_cost, used: line.cost_source === "cotizacion" },
    { label: "Inventario", value: line.inventory_cost, used: line.cost_source === "inventario" },
    { label: "Alza pendiente", value: line.increase_cost, used: line.cost_source === "alza" },
    { label: "Descartada", value: line.discarded_quote_cost, used: false },
  ].filter((part) => toNumber(part.value) !== null);
  return (
    <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 tabular-nums">
      {parts.map((part) => (
        <div key={part.label} className="contents">
          <dt className={part.used ? "font-medium" : "text-text-secondary"}>
            {part.label}
            {part.used && <span className="sr-only">, el que se toma</span>}
          </dt>
          <dd className={cn("text-right", part.used ? "font-semibold" : "text-text-secondary")}>{formatMoney(part.value)}</dd>
        </div>
      ))}
      {line.cost_center && (
        <div className="contents">
          <dt className="text-text-secondary">C.O.</dt>
          <dd className="text-right">{line.cost_center}</dd>
        </div>
      )}
    </dl>
  );
}

/**
 * The editable cell, in whole pesos before VAT, and under it the margin the
 * new price leaves. Nothing is saved while typing: the margin is previewed as
 * each digit goes in, Enter saves the price (one by one) and the API's margin
 * replaces the preview; Escape puts the saved one back. An unreadable number never leaves the cell: the border
 * turns red and the save status above the table names it. Read-only when the
 * quotation is locked, and for an inactive reference, which is never exported.
 */
/**
 * The line with the price typed and not confirmed yet, previewed with the API's arithmetic
 * (margin and variation), so both follow each digit instead of waiting for Enter. The line
 * itself when nothing readable is waiting.
 */
function typedLine(line: QuotationLine, editor: LineEditor): QuotationLine {
  if (isLocal(line) || !editor.unconfirmed.includes(line.sku) || editor.errorFor(line.sku)) return line;
  const typed = parsePriceInput(editor.textFor(line.sku));
  return "value" in typed && typed.value !== null ? previewLine(line, Number(typed.value)) : line;
}

function NewPrice({ line, editor, editable, wide = false }: { line: QuotationLine; editor: LineEditor; editable: boolean; wide?: boolean }) {
  const error = editor.errorFor(line.sku);
  const errorId = `price-error-${line.sku}-${wide ? "card" : "row"}`;
  const disabled = !editable || !line.is_active;
  const waiting = editor.unconfirmed.includes(line.sku);
  const shown = typedLine(line, editor);
  return (
    <div className={cn("space-y-1", !wide && "text-right")}>
      <Input
        inputMode="numeric"
        autoComplete="off"
        value={editor.textFor(line.sku)}
        onChange={(event) => editor.edit(line.sku, event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void editor.commit(line.sku);
          } else if (event.key === "Escape" && editor.isDirty(line.sku)) {
            event.preventDefault();
            editor.revert(line.sku);
          }
        }}
        disabled={disabled}
        placeholder={disabled ? "" : "Sin cambio"}
        title={error ?? (!line.is_active ? INACTIVE_HELP : "Escribe el precio: el margen se ve mientras escribes y Enter lo guarda")}
        aria-label={`Precio nuevo de ${line.description ?? line.sku}, sin IVA. Enter confirma, Escape deshace`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "bg-surface text-right tabular-nums",
          // The floor keeps a seven-digit price readable when the column is narrowed.
          wide ? "h-11 w-40" : "h-8 w-full min-w-24",
          waiting && !error && "border-warning",
          editor.isDirty(line.sku) && !waiting && !error && "border-text-primary"
        )}
      />
      {error && <span id={errorId} className="sr-only">{error}</span>}
      {shown.new_price !== null && !isLocal(line) && (
        <span className={cn("block", shown !== line && "opacity-80")} title={shown !== line ? "Margen con el precio escrito; se guarda con Enter" : undefined}>
          <NewMargin line={shown} />
        </span>
      )}
    </div>
  );
}

/**
 * The margin the new price leaves, with where it stands; or why the rule
 * cannot judge it (no cost, no target). Right under the price that makes it.
 */
export function NewMargin({ line }: { line: QuotationLine }) {
  if (line.new_price === null || isLocal(line)) return dash;
  if (line.compliance === "sin_costo" || line.compliance === "sin_objetivo") {
    return <ComplianceBadge compliance={line.compliance} label={line.compliance_label} className="whitespace-normal text-right" />;
  }
  return <MarginMark value={line.new_margin_with_support_pct ?? line.new_margin_pct} standing={newPriceStanding(line)} />;
}

/**
 * The quantity the customer would take, in inventory units, and what it adds
 * up to with VAT. Saved with the prices, in the same queue. A line outside the
 * offer has nothing to quote a quantity for.
 */
function QuantityCell({ line, editor, editable, wide = false }: { line: QuotationLine; editor: LineEditor; editable: boolean; wide?: boolean }) {
  const error = editor.errorFor(line.sku, "quantity");
  const errorId = `quantity-error-${line.sku}-${wide ? "card" : "row"}`;
  const disabled = !editable || !line.is_active;
  const amounts = offerAmounts(line);
  return (
    <div className={cn("space-y-1", !wide && "text-right")}>
      <Input
        inputMode="decimal"
        autoComplete="off"
        value={editor.textFor(line.sku, "quantity")}
        onChange={(event) => editor.edit(line.sku, event.target.value, "quantity")}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            editor.saveNow();
          }
        }}
        disabled={disabled}
        placeholder={disabled ? "" : "Cant."}
        title={error ?? (line.unit ? `En ${line.unit}` : undefined)}
        aria-label={`Cantidad de ${line.description ?? line.sku}${line.unit ? `, en ${line.unit}` : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "bg-surface text-right tabular-nums",
          wide ? "h-11 w-28" : "h-8 w-full min-w-20",
          editor.isDirty(line.sku, "quantity") && !error && "border-text-primary"
        )}
      />
      {error && <span id={errorId} className="sr-only">{error}</span>}
      {amounts?.total != null && line.in_offer && (
        <span className="block text-xs tabular-nums text-text-secondary" title="Total de la línea con IVA">
          {formatMoney(amounts.total)}
        </span>
      )}
      {line.quantity !== null && !line.in_offer && <span className="block text-xs text-text-secondary">Fuera de la oferta</span>}
    </div>
  );
}

function SupportBadge({ line, onOpen }: { line: QuotationLine; onOpen: (line: QuotationLine) => void }) {
  const candidates = line.support_candidates.length;
  if (!line.support && candidates === 0) return dash;
  // A list update lists every support of its customers: the badge says how many more there are.
  const others = line.support && candidates > 0 && line.support_options ? candidates : 0;
  // One chip per thing the support brings, each in its color: money (tactical or temporary) and the authorized margin.
  const kinds = appliedKinds(line.support);
  const label = line.support
    ? kinds.map((kind) => APPLIED_LOOK[kind].label).join(" y ")
    : candidates === 1 ? "1 sin aplicar" : `${candidates} sin aplicar`;
  return (
    <button
      type="button"
      onClick={() => onOpen(line)}
      aria-label={`Apoyo de ${line.description ?? line.sku}: ${label}${others ? ` y ${others} más` : ""}. Ver detalle`}
      title={line.support ? `${formatMoney(line.support.amount)} por unidad` : "Apoyos que cubren la referencia sin aplicarse"}
      className="flex max-w-full flex-wrap gap-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {line.support ? (
        kinds.map((kind, index) => (
          <Badge key={kind} tone={APPLIED_LOOK[kind].tone} className="max-w-full cursor-pointer py-0">
            {index === 0 && <HandCoins aria-hidden="true" />}
            <span className="truncate">{APPLIED_LOOK[kind].label}</span>
            {index === kinds.length - 1 && others > 0 && <span className="shrink-0 tabular-nums">+{others}</span>}
          </Badge>
        ))
      ) : (
        <Badge tone="neutral" className="max-w-full cursor-pointer py-0">
          <HandCoins aria-hidden="true" />
          <span className="truncate">{label}</span>
        </Badge>
      )}
    </button>
  );
}

const vatFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

function Vat({ line }: { line: QuotationLine }) {
  const vat = toNumber(line.vat_pct);
  return vat === null ? dash : <>{vatFormat.format(vat)} %</>;
}

/** The consumption tax per unit (liquor), in its own column; a dash for every other product. */
function ConsumptionTax({ line }: { line: QuotationLine }) {
  const amount = toNumber(line.value_tax_amount);
  if (amount === null || amount === 0) return dash;
  return <span className="whitespace-nowrap" title={line.value_tax_name ?? undefined}>{formatMoney(amount)}</span>;
}

/**
 * What the customer pays: VAT on the new price plus the consumption tax. The
 * price before VAT is the one typed beside it, so it is not repeated here.
 */
function FinalPrice({ line, alignStart = false }: { line: QuotationLine; alignStart?: boolean }) {
  const withVat = priceWithVat(line);
  if (withVat === null) return dash;
  // Unchanged and still offered: it goes at the last price, so it reads quieter than a new one.
  const fromLast = line.new_price === null;
  return (
    <span
      className={cn("block whitespace-nowrap tabular-nums", fromLast ? "text-text-secondary" : "font-semibold", alignStart ? "text-left" : "text-right")}
      title={fromLast ? "Sin precio nuevo: se ofrece al último precio" : undefined}
    >
      {formatMoney(withVat)}
    </span>
  );
}

/**
 * The new price against the last one. The sign says it; the arrow repeats it
 * in color. The number stays in the text color: red text on a hovered row
 * misses AA in the dark theme, an icon only needs 3:1.
 */
function Variation({ line: saved, editor }: { line: QuotationLine; editor: LineEditor }) {
  // A price typed and not confirmed shows its variation too, dimmed like its margin.
  const line = typedLine(saved, editor);
  const preview = line !== saved;
  const value = toNumber(line.variation_pct);
  if (value === null || line.new_price === null) return dash;
  const Icon = value > 0.00005 ? TrendingUp : value < -0.00005 ? TrendingDown : null;
  return (
    <span
      className={cn("inline-flex items-center justify-end gap-1 font-medium tabular-nums", preview && "opacity-80")}
      title={preview ? "Variación con el precio escrito; se guarda con Enter" : undefined}
    >
      {Icon && <Icon className={cn("size-3.5 shrink-0", value > 0 ? "text-success" : "text-danger")} aria-hidden="true" />}
      {formatVariation(value)}
    </span>
  );
}
