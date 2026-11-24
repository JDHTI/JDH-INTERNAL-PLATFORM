"use client";

import { useState } from "react";
import { CloudOff, FileX2, RefreshCw } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { useCalcMethodLabel, useKindLabel } from "@/features/supports/hooks/use-supports";

import { useSettlementLines } from "../hooks/use-support-settlements";
import { ITEM_STATUS, formatCount, formatDay, formatPercent, formatPesos } from "../lib/format";
import type { CostBasis, ItemStatus, Period, SettlementItem, SettlementLine } from "../types/support-settlements.types";
import { MarginShift } from "./settlement-figures";

const PAGE_SIZE = 50;

/**
 * The sale lines a support covered, a page at a time: the sale, its cost and where the cost came
 * from, what the supports pay and the margin with that money back. Each support applied is listed
 * under its line with its status, how it was calculated and, for the % types, the negotiated %
 * against the one settled.
 */
export default function SettlementLines({
  period,
  basis,
  supplierCode = null,
  sku = null,
  status = null,
  label,
  showProduct = false,
}: {
  period: Period;
  basis: CostBasis;
  supplierCode?: string | null;
  sku?: string | null;
  status?: ItemStatus | null;
  /** What the lines are, for the table's caption. */
  label: string;
  /** The reference in each row: the lines are not of one reference. */
  showProduct?: boolean;
}) {
  const [page, setPage] = useState(1);
  const query = useSettlementLines(period, basis, { supplierCode, sku, status, page, size: PAGE_SIZE });
  const result = query.data;
  const rows = result?.items ?? [];

  if (query.isPending) {
    return <div className="h-40 animate-pulse rounded-md bg-canvas-subtle" aria-busy="true" aria-label={`Cargando ${label}`} />;
  }
  if (query.isError && !result) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudieron cargar las líneas de venta"
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        }
      >
        {errorMessage(query.error)}
      </StatePanel>
    );
  }
  if (rows.length === 0) {
    return (
      <StatePanel icon={FileX2} title="Ninguna línea de venta">
        {status ? "Ningún apoyo de este mes quedó en ese estado." : "Este filtro no trae líneas en el mes."}
      </StatePanel>
    );
  }

  return (
    <div className={cn("space-y-2", query.isPlaceholderData && "opacity-60")}>
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[64rem] text-left text-[13px]">
          <caption className="sr-only">{label}</caption>
          <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            <tr>
              <th scope="col" className="px-2 py-1.5">Venta</th>
              {showProduct && <th scope="col" className="px-2 py-1.5">Referencia</th>}
              <th scope="col" className="px-2 py-1.5">Cliente</th>
              <th scope="col" className="px-2 py-1.5 text-right">Cantidad</th>
              <th scope="col" className="px-2 py-1.5 text-right">Venta neta</th>
              <th scope="col" className="px-2 py-1.5 text-right">Costo</th>
              <th scope="col" className="px-2 py-1.5 text-right">Apoyo</th>
              <th scope="col" className="px-2 py-1.5 text-right">Margen → recompuesto</th>
            </tr>
          </thead>
          {rows.map((line) => (
            <LineRows key={line.id} line={line} basis={basis} showProduct={showProduct} />
          ))}
        </table>
      </div>
      {result && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs tabular-nums text-text-secondary">
            {formatCount(result.total)} {result.total === 1 ? "línea" : "líneas"}
          </p>
          <Pager page={result.page} size={result.size} total={result.total} count={rows.length} onPageChange={setPage} />
        </div>
      )}
      {query.isError && (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(query.error)}
        </p>
      )}
    </div>
  );
}

function LineRows({ line, basis, showProduct }: { line: SettlementLine; basis: CostBasis; showProduct: boolean }) {
  const columns = showProduct ? 8 : 7;
  return (
    <tbody className="border-t border-border">
      <tr className="align-top">
        <td className="px-2 py-1.5">
          <span className="block whitespace-nowrap">{formatDay(line.sale_date)}</span>
          <span className="block whitespace-nowrap font-mono text-xs text-text-secondary">{line.document ?? "Sin documento"}</span>
          {line.is_return && (
            <Badge tone="warning" className="mt-0.5 px-1.5 py-0 text-xs leading-5" title={line.reason ?? undefined}>
              Devolución
            </Badge>
          )}
        </td>
        {showProduct && (
          <td className="max-w-56 px-2 py-1.5">
            <span className="block font-mono text-xs">{line.sku}</span>
            <span className="block truncate" title={line.description ?? undefined}>{line.description ?? "—"}</span>
            <span className="block truncate text-xs text-text-secondary">{line.supplier_name ?? line.supplier_code ?? ""}</span>
          </td>
        )}
        <td className="max-w-64 px-2 py-1.5">
          <span className="block truncate font-medium" title={line.customer_name ?? undefined}>{line.customer_name ?? "Sin cliente"}</span>
          <span className="block truncate text-xs text-text-secondary">
            <span className="font-mono">{line.nit ?? ""}</span>
            {[line.salesperson, line.co_name ?? line.co, line.regional].filter(Boolean).map((part) => ` · ${part}`)}
          </span>
        </td>
        <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{formatCount(line.quantity)}</td>
        <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">{formatPesos(line.net)}</td>
        <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums">
          {formatPesos(line.cost)}
          {basis === "inventario" ? (
            // On the inventory basis every line is the invoiced cost: a fact of the basis, not a warning.
            <span className="block text-xs text-text-secondary">Inventario (factura)</span>
          ) : (
            line.cost_source === "factura" && (
              <span className="block text-xs text-warning" title="Sin cotización del proveedor vigente: se usó el costo de la factura">
                Costo de factura
              </span>
            )
          )}
        </td>
        <td className="whitespace-nowrap px-2 py-1.5 text-right font-semibold tabular-nums">{formatPesos(line.amount)}</td>
        <td className="whitespace-nowrap px-2 py-1.5 text-right">
          <MarginShift margin={line.margin} recomposed={line.recomposed_margin} />
        </td>
      </tr>
      <tr>
        <td colSpan={columns} className="px-2 pb-2 pt-0">
          <LineDetail line={line} />
        </td>
      </tr>
    </tbody>
  );
}

/** The line's marks and each support applied to it, as a tray under the row. */
function LineDetail({ line }: { line: SettlementLine }) {
  const kindLabel = useKindLabel();
  const methodLabel = useCalcMethodLabel();
  const flags = line.flags.filter((flag) => flag.code !== "costo_factura");
  return (
    <div className="space-y-1.5 rounded-md bg-canvas-subtle px-3 py-2">
      {flags.length > 0 && (
        <ul className="flex flex-wrap gap-1" aria-label="Marcas de la línea">
          {flags.map((flag) => (
            <li key={flag.code}>
              <Badge tone="info" className="px-1.5 py-0 text-xs leading-5">{flag.label}</Badge>
            </li>
          ))}
        </ul>
      )}
      <ul className="space-y-1" aria-label="Apoyos aplicados a la línea">
        {line.items.map((item) => (
          <ItemRow key={`${item.support_id}-${item.support_version}`} item={item} kind={kindLabel(item.kind)} method={methodLabel(item.calc_method)} />
        ))}
      </ul>
    </div>
  );
}

function ItemRow({ item, kind, method }: { item: SettlementItem; kind: string; method: string }) {
  const negotiated = toNumber(item.negotiated_pct);
  const settled = toNumber(item.settled_pct);
  const short = negotiated !== null && settled !== null && settled < negotiated;
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
      <Badge tone={ITEM_STATUS[item.status]?.tone ?? "neutral"} className="px-1.5 py-0 text-xs leading-5">
        {item.status_label}
      </Badge>
      <span className="font-medium">
        {kind} · {method}
      </span>
      {negotiated !== null && (
        <span className={cn("tabular-nums", short && "font-semibold text-warning")}>
          Negociado {formatPercent(negotiated)} · liquidado {settled === null ? "—" : formatPercent(settled)}
        </span>
      )}
      <span className="min-w-0 flex-1 basis-48 text-text-secondary">{item.detail}</span>
      <span className="ml-auto whitespace-nowrap tabular-nums">
        {formatPesos(item.unit_amount)} por unidad · <span className="font-semibold">{formatPesos(item.amount)}</span>
      </span>
    </li>
  );
}
