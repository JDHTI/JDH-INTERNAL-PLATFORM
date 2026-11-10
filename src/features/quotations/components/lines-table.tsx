"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  HandCoins,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import { Badge, type BadgeTone } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Menu, MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "@/shared/components/ui/menu";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { choiceLabel } from "@/features/supports/lib/format";

import { type ColumnKey, useColumnWidths } from "../hooks/use-column-widths";
import type { LineEditor } from "../hooks/use-line-editor";
import { formatDay, formatMargin, formatMoney, formatShortDay, formatVariation } from "../lib/format";
import {
  type Sort,
  type SortKey,
  type Standing,
  isLocal,
  lastPriceStanding,
  newPriceStanding,
  priceWithVat,
  supplierOf,
} from "../lib/line-status";
import { offerAmounts } from "../lib/offer";
import type { QuotationLine } from "../types/quotations.types";
import { ComplianceBadge } from "./quotation-badges";

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
  /** Swaps a local line for the SIESA reference BI registered for it. */
  onPromote: (line: QuotationLine) => void;
  /** The local line being swapped, to show its spinner. */
  promoting: string | null;
}

export const OPTIMAL_PRICE_HELP = "Da exactamente el margen objetivo del producto, con su apoyo, en pesos enteros.";
export const MIN_PRICE_HELP = "El más bajo que cumple la regla: deja el margen 1 punto bajo el objetivo. Por debajo, el validador lo ve como alerta.";
export const BELOW_TARGET_HELP = "Margen actual bajo el objetivo: revisar y actualizar.";
export const INACTIVE_HELP = "Inactiva en SIESA: reemplázala. No sale en el Excel ni en el plano.";
export const LOCAL_HELP = "Producto creado solo para cotizar: no existe en SIESA, no tiene costo ni regla y no sale en el Excel ni en el plano.";

const removable = (line: QuotationLine) => line.origin !== "historico" || !line.is_active;

/*
 * One view, no sideways scroll: each column is a block of two or three short
 * lines (what the product is; its last sale; the prices that bound the new
 * one; the new one and its margin; the price with VAT) instead of a column per
 * number. Widths are fixed so the product block takes what is left.
 */
const th = "h-12 px-2.5 py-1.5 align-middle leading-tight";
const td = "px-2.5 py-2 align-top";
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
 * 11rem for its name (68rem, 75rem with quantities); below that, cards.
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

  return (
    <div className={cn("hidden rounded-lg border border-border bg-surface", withQuantities ? "@min-[77rem]:block" : "@min-[70rem]:block")}>
      <table ref={tableRef} className="w-full table-fixed text-left text-sm">
        <caption className="sr-only">Referencias de la cotización</caption>
        <colgroup>
          {selection && <col style={{ width: 40 }} />}
          <col />
          {/* Widths are the person's own (dividers), so they come from state, not from classes. */}
          {columns.map((key) => (
            <col key={key} style={{ width: widths[key] }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10 bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          <tr>
            {selection && (
              <th scope="col" className={cn(th, "rounded-tl-lg pr-0")}>
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
            <th scope="col" className={cn(th, !selection && "rounded-tl-lg")}>Producto</th>
            {/* The headers say what each figure is, in full; they wrap to two lines rather than abbreviate. */}
            <SortHeader
              label="Último precio sin IVA"
              name="Último precio sin IVA"
              keys={[["last_price", "Precio"], ["current_margin", "Margen"]]}
              divider={divider(at("last"), "Último precio sin IVA")}
              {...sortProps}
            />
            <SortHeader
              label="Precios sugeridos"
              name="Precios sugeridos"
              keys={[["min_price", "Precio sugerido margen mínimo"], ["optimal", "Precio sugerido margen óptimo"]]}
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
            <SortHeader label="Precio con IVA" name="Precio con IVA" keys={[["final_price", "Precio con IVA"]]} divider={divider(at("final"), "Precio con IVA")} {...sortProps} />
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
            return (
              <tr key={line.sku} className={cn("transition-colors duration-300", highlighted ? "bg-info-surface" : "hover:bg-primary-subtle")}>
                {selection && (
                  <td className={cn(td, "pr-0")}>
                    <RowCheckbox line={line} selection={selection} />
                  </td>
                )}
                <td className={td}><Product line={line} {...props} /></td>
                <td className={cn(td, divided, "text-right")}><LastSale line={line} /></td>
                <td className={cn(td, divided)}><Bounds line={line} /></td>
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
                <td className={cn(td, divided, "text-right")}><Variation line={line} /></td>
              </tr>
            );
          })}
          {(props.pending ?? []).map((sku) => (
            <tr key={`pending-${sku}`} aria-busy="true">
              {selection && <td className={td} />}
              <td className={td}>
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
  return (
    <ul className={cn("grid grid-cols-1 gap-2 @2xl:grid-cols-2", withQuantities ? "@min-[77rem]:hidden" : "@min-[70rem]:hidden")}>
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
            <Pair label="Último precio sin IVA"><LastSale line={line} alignStart /></Pair>
            <Pair label="Precios sugeridos"><Bounds line={line} /></Pair>
            <Pair label="Apoyo"><SupportBadge line={line} onOpen={props.onOpenDetail} /></Pair>
            <Pair label="IVA · imp. consumo">
              <span className="block text-[13px] tabular-nums">
                <Vat line={line} /> · <ConsumptionTax line={line} />
              </span>
            </Pair>
            <Pair label="Precio con IVA"><FinalPrice line={line} alignStart /></Pair>
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
              <Variation line={line} />
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
function Product({ line, onOpenDetail, onRemove, removing, canRemove, editable, onPromote, promoting }: { line: QuotationLine } & LinesProps) {
  const isRemoving = removing === line.sku;
  const request = line.requested_product;
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
        {local && request?.status === "creado" && request.siesa_sku && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            <span className="text-text-secondary">Ya existe en SIESA: {request.siesa_sku}</span>
            {editable && (
              <button
                type="button"
                onClick={() => onPromote(line)}
                disabled={!canRemove || promoting === line.sku}
                className="inline-flex items-center gap-1 rounded-sm font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 max-xl:min-h-11"
              >
                {promoting === line.sku && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                Usar la referencia {request.siesa_sku}
              </button>
            )}
          </div>
        )}
        {local && request?.status === "descartado" && (
          <p className="text-[13px] text-text-secondary">BI descartó crearlo en SIESA.</p>
        )}
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
function MarginMark({ value, standing }: { value: string | null; standing: Standing | null }) {
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

/** The last sale: price, the margin it left (with support) and when it was invoiced. */
function LastSale({ line, alignStart = false }: { line: QuotationLine; alignStart?: boolean }) {
  if (toNumber(line.last_price) === null) {
    return <span className="text-[13px] text-text-secondary">{isLocal(line) ? "—" : "Sin compras en la ventana"}</span>;
  }
  const origin = [line.last_document ? `Documento ${line.last_document}` : null, line.last_sale_unit ? `vendido en ${line.last_sale_unit}` : null]
    .filter(Boolean)
    .join(", ");
  return (
    <div className={cn("space-y-0.5 tabular-nums", alignStart ? "text-left" : "text-right")}>
      <span className="block font-semibold" title={origin || undefined}>{formatMoney(line.last_price)}</span>
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
 * The suggested prices that bound the new one, before VAT: the price at the
 * minimum margin and at the optimal margin. Nobody sees the cost behind them.
 */
function Bounds({ line }: { line: QuotationLine }) {
  if (isLocal(line)) return <span className="text-[13px] text-text-secondary">Sin costo ni regla</span>;
  const row = "flex items-baseline justify-between gap-2";
  return (
    <dl className="space-y-0.5 text-[13px] tabular-nums">
      <div className={row} title={`Precio sugerido margen mínimo. ${MIN_PRICE_HELP}`}>
        <dt className="whitespace-nowrap text-xs text-text-secondary">margen mínimo</dt>
        <dd className="font-semibold">{toNumber(line.min_price) === null ? dash : formatMoney(line.min_price)}</dd>
      </div>
      <div className={row} title={`Precio sugerido margen óptimo. ${OPTIMAL_PRICE_HELP}`}>
        <dt className="whitespace-nowrap text-xs text-text-secondary">margen óptimo</dt>
        <dd className="font-semibold">{toNumber(line.optimal_price) === null ? dash : formatMoney(line.optimal_price)}</dd>
      </div>
    </dl>
  );
}

/**
 * The editable cell, in whole pesos before VAT, and under it the margin the
 * new price leaves. It saves on its own after a pause in typing; Enter saves at
 * once. An unreadable number never leaves the cell: the border turns red and
 * the save status above the table names it. Read-only when the quotation is
 * locked, and for an inactive reference, which is never exported.
 */
function NewPrice({ line, editor, editable, wide = false }: { line: QuotationLine; editor: LineEditor; editable: boolean; wide?: boolean }) {
  const error = editor.errorFor(line.sku);
  const errorId = `price-error-${line.sku}-${wide ? "card" : "row"}`;
  const disabled = !editable || !line.is_active;
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
            editor.saveNow();
          }
        }}
        disabled={disabled}
        placeholder={disabled ? "" : "Sin cambio"}
        title={error ?? (!line.is_active ? INACTIVE_HELP : undefined)}
        aria-label={`Precio nuevo de ${line.description ?? line.sku}, sin IVA`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "bg-surface text-right tabular-nums",
          wide ? "h-11 w-40" : "h-8 w-full",
          editor.isDirty(line.sku) && !error && "border-text-primary"
        )}
      />
      {error && <span id={errorId} className="sr-only">{error}</span>}
      {line.new_price !== null && !isLocal(line) && (
        <span className="block">
          <NewMargin line={line} />
        </span>
      )}
    </div>
  );
}

/**
 * The margin the new price leaves, with where it stands; or why the rule
 * cannot judge it (no cost, no target). Right under the price that makes it.
 */
function NewMargin({ line }: { line: QuotationLine }) {
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
          wide ? "h-11 w-28" : "h-8 w-full",
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
  const label = line.support
    ? line.support.kind ? choiceLabel("kind", line.support.kind) : "Apoyo"
    : candidates === 1 ? "1 sin aplicar" : `${candidates} sin aplicar`;
  return (
    <button
      type="button"
      onClick={() => onOpen(line)}
      aria-label={`Apoyo de ${line.description ?? line.sku}: ${label}. Ver detalle`}
      title={line.support ? `${formatMoney(line.support.amount)} por unidad` : "Apoyos que cubren la referencia sin aplicarse"}
      className="block max-w-full rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Badge tone={line.support ? "info" : "neutral"} className="max-w-full cursor-pointer py-0">
        <HandCoins aria-hidden="true" />
        <span className="truncate">{label}</span>
      </Badge>
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
  return <span title={line.value_tax_name ?? undefined}>{formatMoney(amount)}</span>;
}

/**
 * What the customer pays: VAT on the new price plus the consumption tax. The
 * price before VAT is the one typed beside it, so it is not repeated here.
 */
function FinalPrice({ line, alignStart = false }: { line: QuotationLine; alignStart?: boolean }) {
  const withVat = priceWithVat(line);
  if (withVat === null) return dash;
  return <span className={cn("block font-semibold tabular-nums", alignStart ? "text-left" : "text-right")}>{formatMoney(withVat)}</span>;
}

/**
 * The new price against the last one. The sign says it; the arrow repeats it
 * in color. The number stays in the text color: red text on a hovered row
 * misses AA in the dark theme, an icon only needs 3:1.
 */
function Variation({ line }: { line: QuotationLine }) {
  const value = toNumber(line.variation_pct);
  if (value === null || line.new_price === null) return dash;
  const Icon = value > 0.00005 ? TrendingUp : value < -0.00005 ? TrendingDown : null;
  return (
    <span className="inline-flex items-center justify-end gap-1 font-medium tabular-nums">
      {Icon && <Icon className={cn("size-3.5 shrink-0", value > 0 ? "text-success" : "text-danger")} aria-hidden="true" />}
      {formatVariation(value)}
    </span>
  );
}
