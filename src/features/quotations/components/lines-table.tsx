"use client";

import { HandCoins, Info, Loader2, X } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { choiceLabel } from "@/features/supports/lib/format";

import type { LineEditor } from "../hooks/use-line-editor";
import { MARGIN_BASIS_LABELS, formatDay, formatMargin, formatMoney, formatVariation } from "../lib/format";
import type { QuotationLine } from "../types/quotations.types";
import { COMPLIANCE_ROW, ComplianceBadge } from "./quotation-badges";

interface LinesProps {
  lines: QuotationLine[];
  editor: LineEditor;
  onOpenDetail: (line: QuotationLine) => void;
  onRemove: (line: QuotationLine) => void;
  /** The added reference being removed, to show its spinner. */
  removing: string | null;
  /** False while prices are unsaved or another write is running: removing needs the current version. */
  canRemove: boolean;
}

/*
 * Every row is one line of text at 40px (DESIGN.md §7.3): nothing wraps.
 * Long text is truncated with its full value in a tooltip, and the detail
 * (last sale, support, candidates, problems) lives in the row's panel.
 */
const th = "h-9 px-3 whitespace-nowrap";
const td = "h-10 px-3 whitespace-nowrap";
const num = "text-right tabular-nums";

/*
 * The reference stays pinned left and the four decision columns pinned right,
 * so the editable cell and its outcome stay on screen while the context in
 * the middle scrolls. Each pinned column has a fixed width; a right offset is
 * the sum of the widths after it (6rem, 6+13 = 19rem, 19+8 = 27rem). The new
 * margin column fits "-8,36 %" beside "Bajo el mínimo"; measured, not guessed.
 */
const PIN = {
  sku: "sticky left-0 w-52 min-w-52 max-w-52",
  price: "sticky right-[27rem] w-40 min-w-40 border-l border-border",
  min: "sticky right-[19rem] w-32 min-w-32",
  margin: "sticky right-24 w-52 min-w-52",
  variation: "sticky right-0 w-24 min-w-24",
};

/**
 * A pinned cell paints over the columns scrolling under it, so it needs an
 * opaque background: the surface, with the row's tint (or hover) laid on top
 * as an image so it matches the rest of the row.
 */
function pinnedBackground(line: QuotationLine): string {
  if (line.compliance === "bajo_minimo") return "bg-surface bg-[linear-gradient(var(--danger-surface),var(--danger-surface))]";
  if (line.compliance === "sin_objetivo" || line.compliance === "sin_costo")
    return "bg-surface bg-[linear-gradient(var(--warning-surface),var(--warning-surface))]";
  return "bg-surface group-hover:bg-[linear-gradient(var(--primary-subtle),var(--primary-subtle))]";
}

const added = (line: QuotationLine) => line.origin === "agregado";

/**
 * The references of the quotation with what decides each new price. "Precio
 * nuevo" is the only editable column; the row tint and the badge beside the
 * new margin say whether that price passes the rule. Wide screens get the
 * table, the rest the cards.
 */
export function LinesTable(props: LinesProps) {
  const { lines, editor } = props;
  const head = "bg-canvas-subtle";
  return (
    <div className="hidden max-h-[70vh] overflow-auto rounded-lg border border-border bg-surface 2xl:block">
      <table className="w-full min-w-max text-left text-sm">
        <caption className="sr-only">Referencias de la cotización</caption>
        <thead className="sticky top-0 z-20 bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          <tr>
            <th scope="col" className={cn(th, PIN.sku, head, "z-10")}>Referencia</th>
            <th scope="col" className={th}>Descripción</th>
            <th scope="col" className={th}>UM</th>
            <th scope="col" className={cn(th, "text-right")}>Último precio</th>
            <th scope="col" className={cn(th, "text-right")}>Imp. licores</th>
            <th scope="col" className={cn(th, "text-right")}>Costo</th>
            <th scope="col" className={th}>Apoyo</th>
            <th scope="col" className={cn(th, "text-right")}>Margen actual</th>
            <th scope="col" className={cn(th, "text-right")}>Margen objetivo</th>
            <th scope="col" className={th}>Proveedor</th>
            <th scope="col" className={cn(th, PIN.price, head, "z-10 text-right")}>Precio nuevo</th>
            <th scope="col" className={cn(th, PIN.min, head, "z-10 text-right")}>Precio mínimo</th>
            <th scope="col" className={cn(th, PIN.margin, head, "z-10 text-right")}>Margen nuevo</th>
            <th scope="col" className={cn(th, PIN.variation, head, "z-10 text-right")}>Variación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((line) => {
            const pinned = pinnedBackground(line);
            const tint = line.compliance ? COMPLIANCE_ROW[line.compliance] : undefined;
            return (
              <tr key={line.sku} className={cn("group", tint ?? "hover:bg-primary-subtle")}>
                <td className={cn(td, PIN.sku, pinned)}>
                  <Reference line={line} {...props} />
                </td>
                <td className={cn(td, "max-w-64")}>
                  <span className="block truncate" title={line.description ?? undefined}>{line.description ?? "—"}</span>
                </td>
                <td className={cn(td, "font-mono text-[13px]")}>{line.unit ?? "—"}</td>
                <td className={cn(td, num)}><LastPrice line={line} /></td>
                <td className={cn(td, num)}><LiquorTax line={line} /></td>
                <td className={cn(td, num)}>{formatMoney(line.cost)}</td>
                <td className={cn(td, "max-w-44")}><SupportBadge line={line} onOpen={props.onOpenDetail} /></td>
                <td className={cn(td, num)}>{added(line) ? "—" : formatMargin(line.current_margin_with_support_pct)}</td>
                <td className={cn(td, num)}><TargetMargin line={line} /></td>
                <td className={cn(td, "max-w-44")}>
                  <span className="block truncate" title={line.supplier_name ?? undefined}>{line.supplier_name ?? line.supplier_code ?? "—"}</span>
                </td>
                <td className={cn(td, PIN.price, pinned, "text-right")}><PriceInput line={line} editor={editor} /></td>
                <td className={cn(td, PIN.min, pinned, num)}><MinPrice line={line} /></td>
                <td className={cn(td, PIN.margin, pinned, num)}><NewMargin line={line} /></td>
                <td className={cn(td, PIN.variation, pinned, num)}>{formatVariation(line.variation_pct)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Below 2xl the pinned columns leave too little room for the ones that scroll
 * between them (measured at 1280px: about 140px), so each reference becomes a
 * card with what decides the price and the field to write it (DESIGN.md §10).
 */
export function LinesList(props: LinesProps) {
  const { lines, editor } = props;
  return (
    <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:hidden">
      {lines.map((line) => (
        <li key={line.sku} className={cn("space-y-3 rounded-lg border border-border p-3", pinnedBackground(line))}>
          <div className="min-w-0 space-y-0.5">
            <Reference line={line} {...props} />
            <p className="truncate text-sm" title={line.description ?? undefined}>{line.description ?? "—"}</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Pair label="Último precio"><LastPrice line={line} /></Pair>
            <Pair label="Costo">{formatMoney(line.cost)}</Pair>
            <Pair label="Margen actual">{added(line) ? "—" : formatMargin(line.current_margin_with_support_pct)}</Pair>
            <Pair label="Margen objetivo"><TargetMargin line={line} /></Pair>
            <Pair label="Precio mínimo"><MinPrice line={line} /></Pair>
            <Pair label="Apoyo"><SupportBadge line={line} onOpen={props.onOpenDetail} /></Pair>
            {toNumber(line.value_tax_amount) !== null && (
              <Pair label="Imp. licores"><LiquorTax line={line} /></Pair>
            )}
          </dl>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <span className="block text-xs text-text-secondary">Precio nuevo</span>
              <PriceInput line={line} editor={editor} wide />
            </div>
            <div className="space-y-1 text-right text-sm tabular-nums">
              <NewMargin line={line} />
              <span className="block text-xs text-text-secondary">Variación {formatVariation(line.variation_pct)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Pair({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="truncate tabular-nums">{children}</dd>
    </div>
  );
}

/**
 * The reference opens the row's detail. An added one says so and can be taken
 * out again; one from the sales history cannot (emptying its price is enough).
 */
function Reference({ line, onOpenDetail, onRemove, removing, canRemove }: { line: QuotationLine } & LinesProps) {
  const isRemoving = removing === line.sku;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
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
      {added(line) && (
        <>
          <Badge tone="info" className="px-1.5 py-0 text-xs">{line.origin_label || "Agregado"}</Badge>
          <button
            type="button"
            onClick={() => onRemove(line)}
            disabled={!canRemove || isRemoving}
            aria-label={`Quitar ${line.sku} de la cotización`}
            title="Quitar de la cotización"
            className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 max-xl:size-11"
          >
            {isRemoving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}
          </button>
        </>
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

/**
 * The floor that still passes the rule, rounded up to the peso: the advisor
 * types it as a base, and rounding down would land a fraction under the rule.
 * The exact value stays in the tooltip.
 */
function MinPrice({ line }: { line: QuotationLine }) {
  const exact = toNumber(line.min_price);
  if (exact === null) return <span className="text-text-secondary">—</span>;
  return <span title={`Exacto: ${formatMoney(exact)}`}>{formatMoney(Math.ceil(exact))}</span>;
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
 * The editable cell. It saves on its own after a pause in typing; Enter saves
 * at once. An unreadable number never leaves the cell: the border turns red,
 * the reason is the tooltip and the field's description, and the save status
 * above the table counts it. Nothing is added under the field, so the row
 * keeps its height.
 */
function PriceInput({ line, editor, wide = false }: { line: QuotationLine; editor: LineEditor; wide?: boolean }) {
  const error = editor.errorFor(line.sku);
  const errorId = `price-error-${line.sku}-${wide ? "card" : "row"}`;
  return (
    <>
      <Input
        inputMode="decimal"
        autoComplete="off"
        value={editor.textFor(line.sku)}
        onChange={(event) => editor.edit(line.sku, event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            editor.saveNow();
          }
        }}
        placeholder="Sin cambio"
        title={error}
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
