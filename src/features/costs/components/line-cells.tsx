import { formatCop, formatDay, formatNumber, formatPct } from "@/features/supports/lib/format";
import { toNumber, type Decimal } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { formatCo, formatSignedCop, formatSignedPct } from "../lib/format";
import type { EntryLine } from "../types/costs.types";
import { td, th } from "./sort-header";

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

/** The three purchase prices of the reference, under the «Precio de compra» group. */
export const PURCHASE_PRICES = [
  { key: "unit_price", label: "Actual", help: "Precio unitario de esta entrada" },
  { key: "previous_price", label: "Anterior", help: "Precio de la entrada de compra previa de la misma referencia y unidad" },
  { key: "antepenultimate_price", label: "Antepenúltimo", help: "Precio de la entrada previa a la anterior" },
] as const;

/** One purchase price: this entry's leads in bold. */
export function PurchasePriceCell({ line, field }: { line: EntryLine; field: (typeof PURCHASE_PRICES)[number]["key"] }) {
  const value = cop(line[field]);
  return (
    <span className={cn("block whitespace-nowrap text-right text-[13px] tabular-nums", field === "unit_price" && "font-semibold")}>
      {value ?? dash}
    </span>
  );
}

/** The three columns of the «Precio de compra» group, narrow and equal. */
export function PurchaseCols() {
  return (
    <>
      <col style={{ width: "8%" }} />
      <col style={{ width: "8%" }} />
      <col style={{ width: "10%" }} />
    </>
  );
}

/** The group's header, over its three columns; the other headers span both rows. */
export function PurchaseGroupHeader() {
  return (
    <th scope="colgroup" colSpan={3} className={cn(th, "h-7 border-b border-border pb-0 text-center")}>
      Precio de compra
    </th>
  );
}

export function PurchaseSubHeaders() {
  return (
    <tr>
      {PURCHASE_PRICES.map((price) => (
        <th key={price.key} scope="col" title={price.help} className={cn(th, "h-8 text-right")}>
          {price.label}
        </th>
      ))}
    </tr>
  );
}

export function PurchaseCells({ line }: { line: EntryLine }) {
  return (
    <>
      {PURCHASE_PRICES.map((price) => (
        <td key={price.key} className={td}>
          <PurchasePriceCell line={line} field={price.key} />
        </td>
      ))}
    </>
  );
}

/** The same three prices as labelled figures, for a card. */
export function PurchaseFigures({ line }: { line: EntryLine }) {
  return (
    <div className="space-y-1">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">Precio de compra</span>
      <Figures
        rows={PURCHASE_PRICES.map((price) => ({
          label: price.label,
          value: cop(line[price.key]),
          strong: price.key === "unit_price",
          title: price.help,
        }))}
      />
    </div>
  );
}

/** The quotation as labelled figures, for a card. */
export function QuotationFigures({ line }: { line: EntryLine }) {
  if (line.status === "sin_cotizacion" || toNumber(line.quotation) === null) {
    return <span className="block text-[13px] text-text-secondary">Sin cotización</span>;
  }
  return (
    <div title={quotationHelp(line)}>
      <Figures
        rows={[
          { label: "Cotización", value: cop(line.quotation), strong: true },
          ...(toNumber(line.discount_pct) ? [{ label: "Tasa 1", value: formatPct(line.discount_pct) }] : []),
        ]}
      />
    </div>
  );
}

/** «Lista $ 8.246 · Tasa 1 20 % · vigente desde el 2 feb 2026». */
export function quotationHelp(line: EntryLine): string | undefined {
  const parts = [
    toNumber(line.quotation_list_price) !== null ? `Lista ${formatCop(line.quotation_list_price)}` : null,
    toNumber(line.discount_pct) !== null ? `Tasa 1 ${formatPct(line.discount_pct)}` : null,
    line.quotation_since ? `vigente desde el ${formatDay(line.quotation_since)}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/**
 * What the entry should have cost: the quotation less its Tasa 1, the figure
 * the difference is measured against. Its list price and Tasa 1 go under it,
 * quieter, with the date it came into force in the tooltip.
 */
export function QuotationCell({ line }: { line: EntryLine }) {
  if (line.status === "sin_cotizacion" || toNumber(line.quotation) === null) {
    return <span className="text-[13px] text-text-secondary">Sin cotización</span>;
  }
  const tasa = toNumber(line.discount_pct);
  return (
    <div className="text-right tabular-nums" title={quotationHelp(line)}>
      <span className="block whitespace-nowrap text-[13px] font-semibold">{formatCop(line.quotation)}</span>
      {tasa !== null && tasa !== 0 && (
        <>
          <span className={secondary}>Lista {formatCop(line.quotation_list_price)}</span>
          <span className={secondary}>Tasa 1 {formatPct(line.discount_pct)}</span>
        </>
      )}
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
