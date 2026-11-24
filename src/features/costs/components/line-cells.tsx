import { formatCop, formatDay, formatNumber, formatPct } from "@/features/supports/lib/format";
import { toNumber, type Decimal } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { formatCo, formatSignedCop, formatSignedPct } from "../lib/format";
import type { EntryLine } from "../types/costs.types";

/*
 * The cells of an entry line, compacted the way the quoter and the supports
 * master are: a main line and quieter ones under it, so one row says entry,
 * product, prices and difference without sideways scrolling.
 */

const dash = (
  <span className="text-text-secondary" aria-label="sin dato">
    —
  </span>
);
export const secondary = "block truncate text-xs text-text-secondary";

/**
 * A field the eye looks for in every row (supplier, warehouse, purchase
 * unit): framed so it stands out from the running text without a new color.
 * Text on the neutral surface, AA in both themes (DESIGN.md §3.5).
 */
export const tag =
  "inline-flex max-w-full items-center rounded-sm border border-border bg-canvas-subtle px-1.5 text-xs leading-5 text-text-primary";

/** Date first (what the list is ordered by), then where it came in and its document. */
export function EntryCell({ line }: { line: EntryLine }) {
  const refs = [line.purchase_order && `OC ${line.purchase_order}`, line.invoice_ref && `Factura ${line.invoice_ref}`].filter(Boolean).join(" · ");
  return (
    <div className="min-w-0 space-y-1">
      <span className="block font-semibold tabular-nums">{formatDay(line.entry_date)}</span>
      <span className="flex flex-wrap items-center gap-1">
        <span className={cn(tag, "tabular-nums")} title={line.regional_name ? `C.O. ${formatCo(line.co)}, ${line.regional_name}` : undefined}>
          C.O. {formatCo(line.co)}
        </span>
        {line.warehouse && (
          <span className={tag} title="Bodega">
            <span className="truncate">{line.warehouse}</span>
          </span>
        )}
      </span>
      <span className={cn(secondary, "font-mono")} title={refs || undefined}>
        {line.document ?? "Sin documento"}
      </span>
    </div>
  );
}

/** Reference and its description, with the supplier and the purchase quantity framed under them. */
export function ProductCell({ line }: { line: EntryLine }) {
  const supplier = line.supplier_name ?? line.supplier_code;
  const quantity = toNumber(line.quantity) === null ? null : formatNumber(line.quantity);
  return (
    <div className="min-w-0 space-y-1">
      <span className="block font-mono text-[13px] font-semibold">{line.sku}</span>
      {line.description && (
        <span className="block truncate text-[13px]" title={line.description}>
          {line.description}
        </span>
      )}
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        {supplier ? (
          <span className={cn(tag, "min-w-0")} title={[supplier, line.supplier_nit && `NIT ${line.supplier_nit}`].filter(Boolean).join(" · ")}>
            <span className="truncate">{supplier}</span>
          </span>
        ) : (
          <span className="text-xs text-text-secondary">Sin proveedor</span>
        )}
        {(quantity || line.unit) && (
          <span className={cn(tag, "tabular-nums")} title="Cantidad y unidad de compra">
            {quantity}
            {line.unit && <span className="ml-1 font-semibold">{line.unit}</span>}
          </span>
        )}
      </span>
    </div>
  );
}

/** Label and figure on one line; the figure the row is about goes in bold. */
export function Figures({ rows }: { rows: { label: string; value: string | null; strong?: boolean; title?: string }[] }) {
  return (
    <dl className="space-y-0.5 text-[13px] tabular-nums">
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} className="flex items-baseline justify-between gap-2" title={row.title}>
          <dt className="whitespace-nowrap text-xs text-text-secondary">{row.label}</dt>
          <dd className={cn("whitespace-nowrap", row.strong && "font-semibold")}>{row.value ?? dash}</dd>
        </div>
      ))}
    </dl>
  );
}

const cop = (value: Decimal | null) => (toNumber(value) === null ? null : formatCop(value));

/** The three purchase prices of the reference, one under the other; this entry's leads in bold. */
export function PurchaseCell({ line }: { line: EntryLine }) {
  return (
    <Figures
      rows={[
        { label: "Actual", value: cop(line.unit_price), strong: true, title: "Precio unitario de esta entrada" },
        { label: "Anterior", value: cop(line.previous_price), title: "Precio de la entrada de compra previa de la misma referencia y unidad" },
        { label: "Antepenúltimo", value: cop(line.antepenultimate_price), title: "Precio de la entrada previa a la anterior" },
      ]}
    />
  );
}

/** «Vigente desde el 2 feb 2026», for the quotation's tooltip. */
const since = (line: EntryLine) => (line.quotation_since ? `Cotización vigente desde el ${formatDay(line.quotation_since)}` : undefined);

/**
 * What the entry should have cost (the quotation less its Tasa 1), the figure
 * the difference is measured against. Under a rule, the quotation's list price
 * and its Tasa 1, each with its own label. A quotation without Tasa 1 says so,
 * so an empty space never reads as missing data.
 */
export function QuotationCell({ line }: { line: EntryLine }) {
  if (line.status === "sin_cotizacion" || toNumber(line.quotation) === null) {
    return <span className="text-[13px] text-text-secondary">Sin cotización</span>;
  }
  const tasa = toNumber(line.discount_pct);
  return (
    <div className="space-y-1">
      <Figures rows={[{ label: "Neta", value: cop(line.quotation), strong: true, title: since(line) ?? "Cotización menos su Tasa 1" }]} />
      <div className="border-t border-border pt-1">
        {tasa ? (
          <Figures
            rows={[
              { label: "Lista", value: cop(line.quotation_list_price), title: "Precio de la cotización antes de la Tasa 1" },
              { label: "Tasa 1", value: formatPct(line.discount_pct), title: "Descuento por escala de la cotización" },
            ]}
          />
        ) : (
          <span className="block text-xs text-text-secondary" title="La cotización no tiene descuento por escala: la neta es su precio de lista">
            Sin Tasa 1
          </span>
        )}
      </div>
    </div>
  );
}

/** The difference per unit in pesos and in %, and what it adds up to for the quantity. */
export function DifferenceCell({ line }: { line: EntryLine }) {
  if (toNumber(line.difference) === null) return <span className="text-[13px] text-text-secondary">Sin cotización para comparar</span>;
  return (
    <Figures
      rows={[
        { label: "Unidad", value: formatSignedCop(line.difference), strong: true },
        { label: "%", value: formatSignedPct(line.difference_pct) },
        { label: "Total", value: toNumber(line.amount) === null ? null : formatSignedCop(line.amount), title: "Cantidad × diferencia" },
      ]}
    />
  );
}
