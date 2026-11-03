"use client";

import { Globe2, HandCoins } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { choiceLabel } from "@/features/supports/lib/format";

import type { LineEditor } from "../hooks/use-line-editor";
import {
  MARGIN_BASIS_LABELS,
  formatDay,
  formatMargin,
  formatMoney,
  formatVariation,
  formatVat,
} from "../lib/format";
import type { QuotationLine } from "../types/quotations.types";
import { COMPLIANCE_ROW, ComplianceBadge } from "./quotation-badges";

interface LinesProps {
  lines: QuotationLine[];
  editor: LineEditor;
  onOpenSupport: (line: QuotationLine) => void;
}

const th = "px-3 py-2 whitespace-nowrap";
const td = "px-3 py-2 align-top";
const num = "text-right tabular-nums";

/**
 * Every reference the customer bought in the window, with what it costs today
 * and the margin it leaves. "Precio nuevo" is the only editable column; the
 * row tint and the badge beside the new margin say whether that price passes
 * the rule. Wide screens get the table, phones the cards.
 */
export function LinesTable({ lines, editor, onOpenSupport }: LinesProps) {
  return (
    <div className="hidden max-h-[70vh] overflow-auto rounded-lg border border-border bg-surface lg:block">
      <table className="w-full min-w-max text-left text-sm">
        <caption className="sr-only">Referencias de la cotización</caption>
        <thead className="sticky top-0 z-10 bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          <tr>
            <th scope="col" className={th}>Referencia</th>
            <th scope="col" className={th}>Descripción</th>
            <th scope="col" className={th}>UM</th>
            <th scope="col" className={cn(th, "text-right")}>Último precio</th>
            <th scope="col" className={cn(th, "text-right")}>Impuesto</th>
            <th scope="col" className={cn(th, "text-right")}>Costo</th>
            <th scope="col" className={th}>Apoyo</th>
            <th scope="col" className={cn(th, "text-right")}>Margen actual</th>
            <th scope="col" className={cn(th, "text-right")}>Margen objetivo</th>
            <th scope="col" className={th}>Proveedor</th>
            <th scope="col" className={cn(th, "text-right")}>Precio nuevo</th>
            <th scope="col" className={cn(th, "text-right")}>Precio mínimo</th>
            <th scope="col" className={cn(th, "text-right")}>Margen nuevo</th>
            <th scope="col" className={cn(th, "text-right")}>Variación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((line) => (
            <tr
              key={line.sku}
              className={cn(
                line.compliance && COMPLIANCE_ROW[line.compliance],
                !(line.compliance && COMPLIANCE_ROW[line.compliance]) && "hover:bg-primary-subtle"
              )}
            >
              <td className={cn(td, "font-mono text-[13px]")}>{line.sku}</td>
              <td className={cn(td, "max-w-72")}>
                <span className="block truncate" title={line.description ?? undefined}>{line.description ?? "—"}</span>
                <Problems line={line} />
              </td>
              <td className={cn(td, "text-[13px]")}>{line.unit ?? "—"}</td>
              <td className={cn(td, num)}><LastPrice line={line} /></td>
              <td className={cn(td, num)}><Taxes line={line} /></td>
              <td className={cn(td, num)}><Cost line={line} /></td>
              <td className={td}><SupportCell line={line} onOpen={onOpenSupport} /></td>
              <td className={cn(td, num)}>{formatMargin(line.current_margin_with_support_pct)}</td>
              <td className={cn(td, num)}>
                <span className="block">{formatMargin(line.target_margin_pct)}</span>
                {line.margin_basis && (
                  <span className="block text-xs text-text-secondary">
                    {line.margin_basis_label || MARGIN_BASIS_LABELS[line.margin_basis] || line.margin_basis}
                  </span>
                )}
              </td>
              <td className={cn(td, "max-w-48")}>
                <span className="block truncate" title={line.supplier_name ?? undefined}>{line.supplier_name ?? line.supplier_code ?? "—"}</span>
              </td>
              <td className={cn(td, "text-right")}><PriceInput line={line} editor={editor} /></td>
              <td className={cn(td, num)}><MinPrice line={line} /></td>
              <td className={cn(td, num)}>
                <NewMargin line={line} />
              </td>
              <td className={cn(td, num)}>{formatVariation(line.variation_pct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Phones and tablets: what decides the price, and the field to write it (DESIGN.md §10). */
export function LinesList({ lines, editor, onOpenSupport }: LinesProps) {
  return (
    <ul className="space-y-2 lg:hidden">
      {lines.map((line) => (
        <li
          key={line.sku}
          className={cn("space-y-3 rounded-lg border border-border bg-surface p-3", line.compliance && COMPLIANCE_ROW[line.compliance])}
        >
          <div className="min-w-0">
            <p className="font-mono text-[13px]">{line.sku}</p>
            <p className="text-sm">{line.description ?? "—"}</p>
            <Problems line={line} />
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Pair label="Último precio"><LastPrice line={line} /></Pair>
            <Pair label="Costo"><Cost line={line} /></Pair>
            <Pair label="Margen actual">{formatMargin(line.current_margin_with_support_pct)}</Pair>
            <Pair label="Margen objetivo">{formatMargin(line.target_margin_pct)}</Pair>
            <Pair label="Precio mínimo"><MinPrice line={line} /></Pair>
            <Pair label="Apoyo"><SupportCell line={line} onOpen={onOpenSupport} /></Pair>
          </dl>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <PriceInput line={line} editor={editor} wide />
            <div className="text-right text-sm tabular-nums">
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
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}

/** Data gaps the API found on the line, in its words. Secondary text: AA on both row tints (§3.5). */
function Problems({ line }: { line: QuotationLine }) {
  if (line.problem_labels.length === 0) return null;
  return <span className="block text-xs text-text-secondary">{line.problem_labels.join(" · ")}</span>;
}

/** The sale behind the price, as a tooltip that keyboard users reach too. */
function LastPrice({ line }: { line: QuotationLine }) {
  if (toNumber(line.last_price) === null) return <>—</>;
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

function Taxes({ line }: { line: QuotationLine }) {
  const valueTax = toNumber(line.value_tax_amount);
  return (
    <>
      <span className="block">IVA {formatVat(line.vat_pct)}</span>
      {valueTax !== null && valueTax > 0 && (
        <span className="block text-xs text-text-secondary" title={line.value_tax_name ?? undefined}>
          + {formatMoney(valueTax)} {line.value_tax_name ?? "imp. en valor"}
        </span>
      )}
    </>
  );
}

/** A global cost is the weighted average of every warehouse: the billing center had no stock. */
function Cost({ line }: { line: QuotationLine }) {
  return (
    <>
      <span className="block">{formatMoney(line.cost)}</span>
      {line.cost_is_global && (
        <span className="inline-flex items-center gap-1 text-xs text-text-secondary" title="El CO que factura no tiene existencia: es el promedio ponderado de todas las bodegas.">
          <Globe2 className="size-3" aria-hidden="true" /> Promedio global
        </span>
      )}
    </>
  );
}

function SupportCell({ line, onOpen }: { line: QuotationLine; onOpen: (line: QuotationLine) => void }) {
  const candidates = line.support_candidates.length;
  if (!line.support && candidates === 0) return <span className="text-text-secondary">—</span>;
  const label = line.support
    ? `${line.support.kind ? choiceLabel("kind", line.support.kind) : "Apoyo"} · ${formatMoney(line.support.amount)}`
    : `${candidates} sin aplicar`;
  return (
    <button
      type="button"
      onClick={() => onOpen(line)}
      aria-label={`Detalle del apoyo de ${line.sku}`}
      className="rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Badge tone={line.support ? "info" : "neutral"} className="max-w-56 cursor-pointer">
        <HandCoins aria-hidden="true" />
        <span className="truncate">{label}</span>
      </Badge>
      {line.support?.needs_review && <span className="mt-0.5 block text-xs text-text-secondary">En revisión</span>}
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
  if (exact === null) return <>—</>;
  return <span title={`Exacto: ${formatMoney(exact)}`}>{formatMoney(Math.ceil(exact))}</span>;
}

/** The margin the new price leaves with the support, and whether it passes the rule. */
function NewMargin({ line }: { line: QuotationLine }) {
  if (line.new_price === null) return <span className="text-text-secondary">—</span>;
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span title={line.support ? `Sin apoyo: ${formatMargin(line.new_margin_pct)}` : undefined}>
        {formatMargin(line.new_margin_with_support_pct ?? line.new_margin_pct)}
      </span>
      {line.compliance && <ComplianceBadge compliance={line.compliance} label={line.compliance_label} />}
    </span>
  );
}

/**
 * The editable cell. It saves on its own after a pause in typing; Enter saves
 * at once. An unreadable number never leaves the cell: it shows why below,
 * in a badge so it stays legible on a tinted row (§3.5).
 */
function PriceInput({ line, editor, wide = false }: { line: QuotationLine; editor: LineEditor; wide?: boolean }) {
  const error = editor.errorFor(line.sku);
  const errorId = `price-error-${line.sku}-${wide ? "card" : "row"}`;
  return (
    <div className={cn("flex flex-col items-end gap-1", wide && "items-start")}>
      {wide && <span className="text-xs text-text-secondary">Precio nuevo</span>}
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
        aria-label={`Precio nuevo de ${line.sku}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "bg-surface text-right tabular-nums",
          wide ? "h-11 w-40" : "h-8 w-32",
          editor.isDirty(line.sku) && !error && "border-text-primary"
        )}
      />
      {error && (
        <Badge id={errorId} tone="danger" className="max-w-48 whitespace-normal text-xs">
          {error}
        </Badge>
      )}
    </div>
  );
}
