"use client";

import { INCREASE_STATUS } from "@/features/commercial-masters/components/increase-format";
import { formatCop, formatDay, formatPct } from "@/features/supports/lib/format";
import { Badge } from "@/shared/components/ui/badge";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { formatSignedCop, formatSignedPct } from "../lib/format";
import { REGIONALS, type RequestLine } from "../types/increase-requests.types";

import { regionalLabel } from "./discount-fields";

/** «Regular 5 %; Antioquia 7 %, Bogotá…»: only the regionals that differ from the regular one. */
export function discountsText(line: Pick<RequestLine, "regular_discount_pct" | "regional_discounts">): string {
  const regular = toNumber(line.regular_discount_pct);
  const regionals = REGIONALS.filter((regional) => toNumber(line.regional_discounts[regional]) !== null).map(
    (regional) => `${regionalLabel(regional)} ${formatPct(line.regional_discounts[regional]!)}`
  );
  const parts = [regular !== null ? `Regular ${formatPct(regular)}` : null, regionals.length > 0 ? regionals.join(", ") : null].filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : "—";
}

/**
 * The lines of a request the way the area reads the MAESTRA: old and new
 * cost with and without the healthy-food tax, the change and its status, the
 * increase date, the discounts and the observation. `actions` adds the review
 * column; a line left out stays listed, muted, and says so.
 */
export default function IncreaseLinesTable({
  lines,
  caption,
  showRow = false,
  actions,
}: {
  lines: RequestLine[];
  caption: string;
  /** The sheet row, for a workbook. */
  showRow?: boolean;
  actions?: (line: RequestLine) => React.ReactNode;
}) {
  return (
    <div className="relative overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-max text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          <tr>
            {showRow && <th scope="col" className="px-3 py-2 text-right">Fila</th>}
            <th scope="col" className="px-3 py-2">Referencia</th>
            <th scope="col" className="px-3 py-2 text-right">Costo anterior</th>
            <th scope="col" className="px-3 py-2 text-right">Costo nuevo</th>
            <th scope="col" className="px-3 py-2 text-right">Variación</th>
            <th scope="col" className="px-3 py-2">Incremento</th>
            <th scope="col" className="px-3 py-2 text-right">Fecha</th>
            <th scope="col" className="px-3 py-2">Descuentos</th>
            <th scope="col" className="px-3 py-2">Observación</th>
            {actions && (
              <th scope="col" className="border-l border-border bg-canvas-subtle px-3 py-2 md:sticky md:right-0">
                Revisión
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((line) => {
            const look = line.change ? INCREASE_STATUS[line.change] : null;
            return (
              <tr key={line.id} className={cn("group h-10 align-top hover:bg-primary-subtle", !line.accepted && "text-text-secondary")}>
                {showRow && <td className="px-3 py-2 text-right tabular-nums">{line.row_number ?? "—"}</td>}
                <td className="max-w-80 px-3 py-2">
                  <span className="block truncate" title={line.description ?? undefined}>
                    <span className="font-mono text-[13px]">{line.sku}</span>
                    {line.description && <span className="text-text-secondary"> · {line.description}</span>}
                  </span>
                  {(line.supplier_sku || line.ean) && (
                    <span className="block truncate text-xs text-text-secondary">
                      {[line.supplier_sku && `SKU proveedor ${line.supplier_sku}`, line.ean && `EAN ${line.ean}`].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {formatCop(line.old_cost)}
                  <span className="block text-xs text-text-secondary">con imp. {formatCop(line.old_cost_with_tax)}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                  {formatCop(line.new_cost)}
                  <span className="block text-xs font-normal text-text-secondary">con imp. {formatCop(line.new_cost_with_tax)}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {formatSignedCop(line.variation_amount)}
                  <span className="block text-xs text-text-secondary">{formatSignedPct(line.variation_pct)}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="flex flex-col items-start gap-1">
                    {look ? <Badge tone={look.tone}>{line.change_label ?? look.label}</Badge> : "—"}
                    {!line.accepted && <span className="text-xs">Por fuera</span>}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatDay(line.increased_on)}</td>
                <td className="max-w-72 px-3 py-2">
                  <span className="block truncate" title={discountsText(line)}>
                    {discountsText(line)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2">{line.observation ?? "—"}</td>
                {actions && (
                  <td className="border-l border-border bg-surface px-2 py-1 group-hover:shadow-[inset_0_0_0_100vmax_var(--primary-subtle)] md:sticky md:right-0">
                    {actions(line)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
