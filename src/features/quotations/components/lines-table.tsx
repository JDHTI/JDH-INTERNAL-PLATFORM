"use client";

import { AlertTriangle, Ban, HandCoins, Info, Loader2, TrendingDown, X } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { choiceLabel } from "@/features/supports/lib/format";

import type { LineEditor } from "../hooks/use-line-editor";
import { MARGIN_BASIS_LABELS, formatDay, formatMargin, formatMoney, formatVariation } from "../lib/format";
import type { QuotationLine } from "../types/quotations.types";
import { COMPLIANCE_ROW, ComplianceBadge } from "./quotation-badges";

/** Row selection for the bulk actions; absent when the quotation cannot be edited. */
export interface LineSelection {
  selected: Set<string>;
  /** Every reference the active filter and search show, across pages. */
  scope: string[];
  toggle: (sku: string) => void;
  /** Ticks every reference of `scope`, or unticks them when all already are. */
  toggleAll: () => void;
}

interface LinesProps {
  lines: QuotationLine[];
  editor: LineEditor;
  /** False while it waits for validation or for whoever only validates: everything is read-only. */
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
  /** False until some reference has a new price: "Margen nuevo" and "Variación" would only show dashes. */
  showOutcome: boolean;
}

export const OPTIMAL_PRICE_HELP = "Precio que da exactamente el margen objetivo: (costo − apoyo) / (1 − objetivo), en pesos enteros.";
export const MIN_PRICE_HELP = "Precio más bajo que cumple la regla: deja el margen 1 punto bajo el objetivo. Por debajo no se puede confirmar.";
export const BELOW_TARGET_HELP = "Margen actual bajo el objetivo: revisar y actualizar.";
export const INACTIVE_HELP = "Inactiva en SIESA: reemplázala. No sale en el Excel ni en el plano.";
const DISCARDED_QUOTE_HELP = "Cotización fuera de rango (revisar en SIESA).";

/*
 * Every row is one line of text at 40px (DESIGN.md §7.3): nothing wraps.
 * Long text is truncated with its full value in a tooltip, and the detail
 * (last sale, cost, support, candidates, problems) lives in the row's panel.
 */
const th = "h-9 px-3 whitespace-nowrap";
const td = "h-10 px-3 whitespace-nowrap";
const num = "text-right tabular-nums";

/*
 * Only the reference and its description stay pinned left, so every row keeps
 * saying what it is while the rest scrolls sideways. The description starts
 * where the reference ends (14rem) and closes the pinned block with a border.
 */
const PIN = {
  sku: "sticky left-0 w-56 min-w-56 max-w-56",
  description: "sticky left-56 w-64 min-w-64 max-w-64 border-r border-border",
};

/** Columns between the pinned block and the outcome, for the pending rows' span. */
const MIDDLE_COLUMNS = 11;

/*
 * "Bajo el objetivo" tints the row only while it is unanswered: once the
 * advisor writes a new price, the tint (if any) is the new price's compliance.
 * The icon beside the current margin stays either way.
 */
const belowTargetOpen = (line: QuotationLine) => line.below_target && line.new_price === null && line.is_active;

/**
 * A pinned cell paints over the columns scrolling under it, so it needs an
 * opaque background: the surface, with the row's tint (or hover) laid on top
 * as an image so it matches the rest of the row.
 */
function pinnedBackground(line: QuotationLine, highlighted = false): string {
  // The flash after a paste wins over the other tints for its 2.5 seconds.
  if (highlighted) return "bg-surface bg-[linear-gradient(var(--info-surface),var(--info-surface))]";
  if (line.compliance === "bajo_minimo") return "bg-surface bg-[linear-gradient(var(--danger-surface),var(--danger-surface))]";
  if (line.compliance === "sin_objetivo" || line.compliance === "sin_costo" || belowTargetOpen(line))
    return "bg-surface bg-[linear-gradient(var(--warning-surface),var(--warning-surface))]";
  return "bg-surface group-hover:bg-[linear-gradient(var(--primary-subtle),var(--primary-subtle))]";
}

function rowTint(line: QuotationLine, highlighted: boolean): string | undefined {
  if (highlighted) return "bg-info-surface";
  if (line.compliance && COMPLIANCE_ROW[line.compliance]) return COMPLIANCE_ROW[line.compliance];
  if (belowTargetOpen(line)) return "bg-warning-surface";
  return undefined;
}

const added = (line: QuotationLine) => line.origin === "agregado";
const removable = (line: QuotationLine) => added(line) || !line.is_active;

/** A column header whose meaning is not obvious: the explanation is its tooltip and is read aloud too. */
function HelpHeader({ label, help }: { label: string; help: string }) {
  return (
    <span tabIndex={0} title={help} className="inline-flex items-center gap-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      {label}
      <Info className="size-3 shrink-0" aria-hidden="true" />
      <span className="sr-only">. {help}</span>
    </span>
  );
}

/**
 * The references of the quotation with what decides each new price. "Precio
 * nuevo" is the only editable column; the row tint and the badge beside the
 * new margin say whether that price passes the rule. Wide screens get the
 * table, the rest the cards.
 */
export function LinesTable(props: LinesProps) {
  const { lines, editor, editable, selection, showOutcome } = props;
  const head = "bg-canvas-subtle";
  const scope = selection?.scope ?? [];
  const allTicked = selection !== undefined && scope.length > 0 && scope.every((sku) => selection.selected.has(sku));
  const someTicked = selection !== undefined && scope.some((sku) => selection.selected.has(sku));
  return (
    // Sideways only: the page scrolls the rows, so the table never slides under the filters above it.
    <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface 2xl:block">
      <table className="w-full min-w-max text-left text-sm">
        <caption className="sr-only">Referencias de la cotización</caption>
        <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          <tr>
            <th scope="col" className={cn(th, PIN.sku, head, "z-10")}>
              <span className="flex items-center gap-2">
                {selection && (
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
                )}
                Referencia
              </span>
            </th>
            <th scope="col" className={cn(th, PIN.description, head, "z-10")}>Descripción</th>
            <th scope="col" className={th}>UM</th>
            <th scope="col" className={cn(th, "text-right")}>Último precio</th>
            <th scope="col" className={cn(th, "text-right")}>Imp. licores</th>
            <th scope="col" className={cn(th, "text-right")}>Costo</th>
            <th scope="col" className={th}>Apoyo</th>
            <th scope="col" className={cn(th, "text-right")}>Margen actual</th>
            <th scope="col" className={cn(th, "text-right")}>Margen objetivo</th>
            <th scope="col" className={th}>Proveedor</th>
            <th scope="col" className={cn(th, "text-right")}>
              {/* Short labels keep the columns narrow; the tooltip says they are prices. */}
              <HelpHeader label="Óptimo" help={`Precio óptimo. ${OPTIMAL_PRICE_HELP}`} />
            </th>
            <th scope="col" className={cn(th, "text-right")}>
              <HelpHeader label="Mínimo" help={`Precio mínimo. ${MIN_PRICE_HELP}`} />
            </th>
            <th scope="col" className={cn(th, "text-right")}>Precio nuevo</th>
            {showOutcome && (
              <>
                <th scope="col" className={cn(th, "text-right")}>Margen nuevo</th>
                <th scope="col" className={cn(th, "text-right")}>Variación</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((line) => {
            const highlighted = props.highlight?.has(line.sku) ?? false;
            const pinned = pinnedBackground(line, highlighted);
            const tint = rowTint(line, highlighted);
            return (
              <tr key={line.sku} className={cn("group transition-colors duration-300", tint ?? "hover:bg-primary-subtle")}>
                <td className={cn(td, PIN.sku, pinned)}>
                  <Reference line={line} {...props} />
                </td>
                <td className={cn(td, PIN.description, pinned)}>
                  <span className={cn("block truncate", !line.is_active && "text-text-secondary")} title={line.description ?? undefined}>
                    {line.description ?? "—"}
                  </span>
                </td>
                <td className={cn(td, "font-mono text-[13px]")}>{line.unit ?? "—"}</td>
                <td className={cn(td, num)}><LastPrice line={line} /></td>
                <td className={cn(td, num)}><LiquorTax line={line} /></td>
                <td className={cn(td, num)}><Cost line={line} /></td>
                <td className={cn(td, "max-w-44")}><SupportBadge line={line} onOpen={props.onOpenDetail} /></td>
                <td className={cn(td, num)}><CurrentMargin line={line} /></td>
                <td className={cn(td, num)}><TargetMargin line={line} /></td>
                <td className={cn(td, "max-w-44")}>
                  <span className="block truncate" title={line.supplier_name ?? undefined}>{line.supplier_name ?? line.supplier_code ?? "—"}</span>
                </td>
                <td className={cn(td, num)}><Money value={line.optimal_price} /></td>
                <td className={cn(td, num)}><Money value={line.min_price} /></td>
                <td className={cn(td, "text-right")}>
                  <PriceInput line={line} editor={editor} editable={editable} />
                </td>
                {showOutcome && (
                  <>
                    <td className={cn(td, "w-52 min-w-52", num)}><NewMargin line={line} /></td>
                    <td className={cn(td, num)}>{formatVariation(line.variation_pct)}</td>
                  </>
                )}
              </tr>
            );
          })}
          {(props.pending ?? []).map((sku) => (
            <tr key={`pending-${sku}`} aria-busy="true">
              <td className={cn(td, PIN.sku, "bg-surface")}>
                <span className="font-mono text-[13px]">{sku}</span>
              </td>
              <td className={cn(td, PIN.description, "bg-surface")}>
                <PendingLabel />
              </td>
              <td className={td} colSpan={MIDDLE_COLUMNS + (showOutcome ? 2 : 0)} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Below 2xl the pinned columns leave too little room for the ones that scroll
 * between them, so each reference becomes a card with what decides the price
 * and the field to write it (DESIGN.md §10).
 */
export function LinesList(props: LinesProps) {
  const { lines, editor, editable } = props;
  return (
    <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:hidden">
      {lines.map((line) => (
        <li
          key={line.sku}
          className={cn(
            "space-y-3 rounded-lg border border-border p-3 transition-colors duration-300",
            pinnedBackground(line, props.highlight?.has(line.sku) ?? false)
          )}
        >
          <div className="min-w-0 space-y-0.5">
            <Reference line={line} {...props} />
            <p className={cn("truncate text-sm", !line.is_active && "text-text-secondary")} title={line.description ?? undefined}>
              {line.description ?? "—"}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Pair label="Último precio"><LastPrice line={line} /></Pair>
            <Pair label="Costo"><Cost line={line} /></Pair>
            <Pair label="Margen actual"><CurrentMargin line={line} /></Pair>
            <Pair label="Margen objetivo"><TargetMargin line={line} /></Pair>
            <Pair label="Precio óptimo" help={OPTIMAL_PRICE_HELP}><Money value={line.optimal_price} /></Pair>
            <Pair label="Precio mínimo" help={MIN_PRICE_HELP}><Money value={line.min_price} /></Pair>
            <Pair label="Apoyo"><SupportBadge line={line} onOpen={props.onOpenDetail} /></Pair>
            {toNumber(line.value_tax_amount) !== null && (
              <Pair label="Imp. licores"><LiquorTax line={line} /></Pair>
            )}
          </dl>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <span className="block text-xs text-text-secondary">Precio nuevo</span>
              <PriceInput line={line} editor={editor} editable={editable} wide />
            </div>
            {line.new_price !== null && (
              <div className="space-y-1 text-right text-sm tabular-nums">
                <NewMargin line={line} />
                <span className="block text-xs text-text-secondary">Variación {formatVariation(line.variation_pct)}</span>
              </div>
            )}
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

/** A pasted reference the API has not answered for yet: no numbers until it does. */
function PendingLabel() {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary">
      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Agregando…
    </span>
  );
}

function Pair({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-text-secondary">{help ? <HelpHeader label={label} help={help} /> : label}</dt>
      <dd className="truncate tabular-nums">{children}</dd>
    </div>
  );
}

function Money({ value }: { value: string | null }) {
  return toNumber(value) === null ? <span className="text-text-secondary">—</span> : <>{formatMoney(value)}</>;
}

/**
 * The reference opens the row's detail. Its checkbox puts it in the selection
 * for a standard margin. An added or an inactive one says so and can be taken
 * out; an active one from the sales history cannot (emptying its price is enough).
 */
function Reference({ line, onOpenDetail, onRemove, removing, canRemove, editable, selection }: { line: QuotationLine } & LinesProps) {
  const isRemoving = removing === line.sku;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {selection && (
        <input
          type="checkbox"
          checked={selection.selected.has(line.sku)}
          onChange={() => selection.toggle(line.sku)}
          aria-label={`Seleccionar ${line.sku}`}
          className="size-4 shrink-0 accent-[var(--primary)] max-xl:size-5"
        />
      )}
      <button
        type="button"
        onClick={() => onOpenDetail(line)}
        aria-label={`Detalle de ${line.sku}`}
        title="Ver el detalle de la referencia"
        className="inline-flex min-w-0 items-center gap-1 rounded-sm font-mono text-[13px] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-xl:min-h-11"
      >
        <span className="truncate">{line.sku}</span>
        <Info className="size-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
      </button>
      {!line.is_active ? (
        <Badge tone="danger" className="px-1.5 py-0 text-xs" title={INACTIVE_HELP}>
          <Ban aria-hidden="true" /> Inactiva<span className="sr-only">: {INACTIVE_HELP}</span>
        </Badge>
      ) : (
        added(line) && <Badge tone="info" className="px-1.5 py-0 text-xs">{line.origin_label || "Agregado"}</Badge>
      )}
      {editable && removable(line) && (
        <button
          type="button"
          onClick={() => onRemove(line)}
          disabled={!canRemove || isRemoving}
          aria-label={`Quitar ${line.sku} de la cotización`}
          title={line.is_active ? "Quitar de la cotización" : "Quitar la referencia inactiva"}
          className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 max-xl:size-11"
        >
          {isRemoving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
        </button>
      )}
    </span>
  );
}

/** The sale behind the price as a tooltip keyboard users reach too. An added reference has none. */
function LastPrice({ line }: { line: QuotationLine }) {
  if (toNumber(line.last_price) === null) return <span className="text-text-secondary">—</span>;
  const origin = [
    line.last_sale_date ? `Vendido el ${formatDay(line.last_sale_date)}` : null,
    line.last_document ? `documento ${line.last_document}` : null,
    line.last_sale_unit ? `en ${line.last_sale_unit}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <span
      tabIndex={origin ? 0 : undefined}
      title={origin || undefined}
      className="rounded-sm underline decoration-dotted decoration-text-secondary underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {formatMoney(line.last_price)}
      {origin && <span className="sr-only">. {origin}</span>}
    </span>
  );
}

/** Only the liquor consumption tax; VAT is never shown, and other products leave the cell empty. */
function LiquorTax({ line }: { line: QuotationLine }) {
  const amount = toNumber(line.value_tax_amount);
  if (amount === null || amount === 0) return <span className="text-text-secondary">—</span>;
  return <span title={line.value_tax_name ?? undefined}>{formatMoney(amount)}</span>;
}

/**
 * The cost and, in its tooltip, where it came from: the higher of the
 * supplier's quote and the inventory. A quote thrown out as out of range is
 * flagged with an icon so it gets fixed in SIESA.
 */
export function costExplanation(line: QuotationLine): string {
  return [
    line.cost_source_label ? `Origen: ${line.cost_source_label}` : null,
    toNumber(line.quote_cost) !== null ? `Cotización del proveedor: ${formatMoney(line.quote_cost)}` : null,
    toNumber(line.inventory_cost) !== null ? `Inventario: ${formatMoney(line.inventory_cost)}` : null,
    toNumber(line.discarded_quote_cost) !== null
      ? `${DISCARDED_QUOTE_HELP} Cotización descartada: ${formatMoney(line.discarded_quote_cost)}`
      : null,
  ]
    .filter(Boolean)
    .join(". ");
}

function Cost({ line }: { line: QuotationLine }) {
  if (toNumber(line.cost) === null) return <span className="text-text-secondary">—</span>;
  const explanation = costExplanation(line);
  const discarded = toNumber(line.discarded_quote_cost) !== null;
  return (
    <span
      tabIndex={explanation ? 0 : undefined}
      title={explanation || undefined}
      className="inline-flex items-center justify-end gap-1 rounded-sm underline decoration-dotted decoration-text-secondary underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {discarded && <AlertTriangle className="size-3.5 shrink-0 text-warning" aria-hidden="true" />}
      {formatMoney(line.cost)}
      {explanation && <span className="sr-only">. {explanation}</span>}
    </span>
  );
}

/** The last price's margin with support, and the alert when it is under the target's minimum. */
function CurrentMargin({ line }: { line: QuotationLine }) {
  if (added(line)) return <span className="text-text-secondary">—</span>;
  return (
    <span className="inline-flex items-center justify-end gap-1">
      {line.below_target && (
        <span title={BELOW_TARGET_HELP} className="inline-flex text-warning">
          <TrendingDown className="size-3.5" aria-hidden="true" />
          <span className="sr-only">{BELOW_TARGET_HELP}</span>
        </span>
      )}
      {formatMargin(line.current_margin_with_support_pct)}
    </span>
  );
}

function TargetMargin({ line }: { line: QuotationLine }) {
  const basis = line.margin_basis ? line.margin_basis_label || MARGIN_BASIS_LABELS[line.margin_basis] : undefined;
  return <span title={basis}>{formatMargin(line.target_margin_pct)}</span>;
}

function SupportBadge({ line, onOpen }: { line: QuotationLine; onOpen: (line: QuotationLine) => void }) {
  const candidates = line.support_candidates.length;
  if (!line.support && candidates === 0) return <span className="text-text-secondary">—</span>;
  const label = line.support
    ? line.support.kind ? choiceLabel("kind", line.support.kind) : "Apoyo"
    : candidates === 1 ? "1 sin aplicar" : `${candidates} sin aplicar`;
  return (
    <button
      type="button"
      onClick={() => onOpen(line)}
      aria-label={`Apoyo de ${line.sku}: ${label}. Ver detalle`}
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

/** The margin the new price leaves with the support, and whether it passes the rule, on one line. */
function NewMargin({ line }: { line: QuotationLine }) {
  if (line.new_price === null) return <span className="text-text-secondary">—</span>;
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span title={line.support ? `Sin apoyo: ${formatMargin(line.new_margin_pct)}` : undefined}>
        {formatMargin(line.new_margin_with_support_pct ?? line.new_margin_pct)}
      </span>
      {line.compliance && <ComplianceBadge compliance={line.compliance} label={line.compliance_label} />}
    </span>
  );
}

/**
 * The editable cell, in whole pesos. It saves on its own after a pause in
 * typing; Enter saves at once. An unreadable number never leaves the cell: the
 * border turns red, the reason is the tooltip and the field's description, and
 * the save status above the table names it. Read-only when the quotation is
 * locked, and for an inactive reference, which is never exported.
 */
function PriceInput({ line, editor, editable, wide = false }: { line: QuotationLine; editor: LineEditor; editable: boolean; wide?: boolean }) {
  const error = editor.errorFor(line.sku);
  const errorId = `price-error-${line.sku}-${wide ? "card" : "row"}`;
  const disabled = !editable || !line.is_active;
  return (
    <>
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
        aria-label={`Precio nuevo de ${line.sku}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "bg-surface text-right tabular-nums",
          wide ? "h-11 w-40" : "h-8 w-32",
          editor.isDirty(line.sku) && !error && "border-text-primary"
        )}
      />
      {error && <span id={errorId} className="sr-only">{error}</span>}
    </>
  );
}
