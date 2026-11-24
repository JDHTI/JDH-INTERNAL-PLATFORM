"use client";

import { useState } from "react";
import { CloudOff, FileX2, RefreshCw } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useSettlementBreakdown } from "../hooks/use-support-settlements";
import { BREAKDOWN_LABELS, formatCount, formatPesos } from "../lib/format";
import type { BreakdownBy, Period, SupplierRow } from "../types/support-settlements.types";
import { MarginShift } from "./settlement-figures";
import { supplierOptions } from "./supplier-options";

const num = "whitespace-nowrap px-2 py-1.5 text-right tabular-nums";

/** Where the suppliers' money goes back: by regional, business unit, salesperson or customer. */
export default function BreakdownView({ period, suppliers }: { period: Period; suppliers: SupplierRow[] }) {
  const [by, setBy] = useState<BreakdownBy>("regional");
  const [supplier, setSupplier] = useState("");
  const query = useSettlementBreakdown(period, by, supplier || null);
  const rows = query.data ?? [];
  const dimension = BREAKDOWN_LABELS[by];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Dropdown
          className="w-full sm:w-56"
          value={by}
          onValueChange={(next) => setBy(next as BreakdownBy)}
          options={(Object.keys(BREAKDOWN_LABELS) as BreakdownBy[]).map((value) => ({ value, label: `Por ${BREAKDOWN_LABELS[value].toLowerCase()}` }))}
          aria-label="Desglosar por"
        />
        <Dropdown
          className="w-full sm:w-72"
          value={supplier}
          onValueChange={setSupplier}
          options={[{ value: "", label: "Todos los proveedores" }, ...supplierOptions(suppliers)]}
          aria-label="Proveedor"
          searchable
          searchPlaceholder="Buscar proveedor"
          emptyMessage="Ningún proveedor coincide."
        />
      </div>

      {query.isPending ? (
        <div className="h-60 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando el desglose" />
      ) : query.isError && !query.data ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudo cargar el desglose"
          action={
            <Button variant="outline" onClick={() => query.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(query.error)}
        </StatePanel>
      ) : rows.length === 0 ? (
        <StatePanel icon={FileX2} title="Nada que desglosar">
          Ninguna venta apoyada del mes con este filtro.
        </StatePanel>
      ) : (
        <div className={cn("overflow-x-auto rounded-lg border border-border bg-surface", query.isPlaceholderData && "opacity-60")}>
          <table className="w-full min-w-[44rem] text-left text-[13px]">
            <caption className="sr-only">Apoyo a reconocer por {dimension.toLowerCase()}</caption>
            <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              <tr>
                <th scope="col" className="px-2 py-1.5">{dimension}</th>
                <th scope="col" className="px-2 py-1.5 text-right">Líneas</th>
                <th scope="col" className="px-2 py-1.5 text-right">Venta neta</th>
                <th scope="col" className="px-2 py-1.5 text-right">Costo</th>
                <th scope="col" className="px-2 py-1.5 text-right">Reintegro</th>
                <th scope="col" className="px-2 py-1.5 text-right">Margen → recompuesto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, index) => (
                <tr key={row.key ?? `sin-${index}`} className="hover:bg-primary-subtle">
                  <td className="max-w-80 px-2 py-1.5">
                    <span className="block truncate font-medium" title={row.name ?? undefined}>{row.name ?? row.key ?? `Sin ${dimension.toLowerCase()}`}</span>
                    {by === "customer" && row.key && <span className="block font-mono text-xs text-text-secondary">{row.key}</span>}
                  </td>
                  <td className={num}>{formatCount(row.lines)}</td>
                  <td className={num}>{formatPesos(row.net)}</td>
                  <td className={num}>{formatPesos(row.cost)}</td>
                  <td className={cn(num, "font-semibold")}>{formatPesos(row.amount)}</td>
                  <td className={num}>
                    <MarginShift margin={row.margin} recomposed={row.recomposed_margin} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
