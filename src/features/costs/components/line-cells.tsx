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

/** Date first (what the list is ordered by), then where it came in and its document. */
export function EntryCell({ line }: { line: EntryLine }) {
  const refs = [line.purchase_order && `OC ${line.purchase_order}`, line.invoice_ref && `Factura ${line.invoice_ref}`].filter(Boolean).join(" · ");
  return (
    <div className="min-w-0 space-y-0.5">
      <span className="block font-semibold tabular-nums">{formatDay(line.entry_date)}</span>
      <span className={cn(secondary, "tabular-nums")} title={line.regional_name ?? undefined}>
        C.O. {formatCo(line.co)}
        {line.warehouse && ` · ${line.warehouse}`}
      </span>
      <span className={cn(secondary, "font-mono")} title={refs || undefined}>
        {line.document ?? "Sin documento"}
      </span>
    </div>
  );
}

/** Reference, its description, and the supplier with the quantity as the quiet line. */
export function ProductCell({ line }: { line: EntryLine }) {
  const quantity = toNumber(line.quantity) === null ? null : `${formatNumber(line.quantity)}${line.unit ? ` ${line.unit}` : ""}`;
  const meta = [line.supplier_name ?? line.supplier_code, quantity].filter(Boolean).join(" · ");
  return (
    <div className="min-w-0 space-y-0.5">
      <span className="block font-mono text-[13px] font-semibold">{line.sku}</span>
      {line.description && (
        <span className="block truncate text-[13px]" title={line.description}>
          {line.description}
        </span>
      )}
      <span className={secondary} title={line.supplier_nit ? `NIT ${line.supplier_nit}` : undefined}>
        {meta || "Sin proveedor"}
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
const pct = (value: Decimal | null) => (toNumber(value) === null ? null : formatPct(value));

/** What was paid against what was quoted, in the same base: before discounts and taxes. */
export function PricesCell({ line }: { line: EntryLine }) {
  return (
    <Figures
      rows={[
        { label: "Precio", value: cop(line.unit_price), strong: true, title: "Precio unitario de la entrada" },
        {
          label: "Cotización",
          value: line.status === "sin_cotizacion" ? "Sin cotización" : cop(line.quotation),
          title: line.quotation_since ? `Cotización vigente desde el ${formatDay(line.quotation_since)}` : undefined,
        },
        { label: "Tasa", value: pct(line.discount_pct), title: "Tasa 1: descuento por escala de la cotización. Se muestra, no se resta." },
      ]}
    />
  );
}

/** The two purchases before this one, of the same reference and unit. */
export function PreviousCell({ line }: { line: EntryLine }) {
  return (
    <Figures
      rows={[
        { label: "Anterior", value: cop(line.previous_price) },
        { label: "Hace 2", value: cop(line.previous_price_2) },
      ]}
    />
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
