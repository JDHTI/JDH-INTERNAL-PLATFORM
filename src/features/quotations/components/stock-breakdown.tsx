"use client";

import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { useQuery } from "@tanstack/react-query";
import { Info, Warehouse } from "lucide-react";

import { errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { formatDateTime } from "../lib/format";
import { getStockBreakdown } from "../services/quotations.service";
import type { StockBreakdown as Breakdown, StockBreakdownItem } from "../types/quotations.types";

const units = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const amount = (value: string | null) => {
  const number = toNumber(value);
  return number === null ? "—" : units.format(number);
};

/**
 * The stock of one reference by center and warehouse. The quotation's version is in the key:
 * changing its centers recalculates the stock, and the new version asks again.
 */
export function useStockBreakdown(quotationId: string, version: number, sku: string, enabled: boolean) {
  return useQuery({
    queryKey: ["quotations", quotationId, "stock-breakdown", version, sku],
    queryFn: () => getStockBreakdown(quotationId, [sku]),
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** Which warehouses the totals add up, and the morning snapshot they come from. */
export function StockSource({ data, className }: { data: Breakdown; className?: string }) {
  return (
    <p className={cn("text-xs text-text-secondary", className)}>
      {/* The API's label already says «Nacional: …» when it is. */}
      {data.national && !/^nacional/i.test(data.label) ? "Nacional: " : ""}
      {data.label}
      {data.stock_at ? ` · foto de SIESA del ${formatDateTime(data.stock_at)}` : ""}
    </p>
  );
}

/** Center by center, each with its warehouses; the total of the reference on top. */
function BreakdownTable({ item }: { item: StockBreakdownItem }) {
  return (
    <table className="w-full text-left text-[13px] tabular-nums">
      <caption className="sr-only">Existencia y disponible por centro de operación y bodega</caption>
      <thead className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
        <tr className="border-b border-border">
          <th scope="col" className="py-1 pr-2">C.O. y bodega</th>
          <th scope="col" className="py-1 pl-2 text-right">Existencia</th>
          <th scope="col" className="py-1 pl-2 text-right">Disponible</th>
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-border font-semibold">
          <th scope="row" className="py-1 pr-2">Total</th>
          <td className="py-1 pl-2 text-right">{amount(item.on_hand)}</td>
          <td className="py-1 pl-2 text-right">{amount(item.available)}</td>
        </tr>
        {item.centers.map((center) => (
          <CenterRows key={center.code} center={center} />
        ))}
      </tbody>
    </table>
  );
}

function CenterRows({ center }: { center: StockBreakdownItem["centers"][number] }) {
  return (
    <>
      <tr className="border-t border-border">
        <th scope="row" className="py-1 pr-2 font-medium">C.O. {center.code}</th>
        <td className="py-1 pl-2 text-right font-medium">{amount(center.on_hand)}</td>
        <td className="py-1 pl-2 text-right font-medium">{amount(center.available)}</td>
      </tr>
      {center.warehouses.map((warehouse) => (
        <tr key={warehouse.warehouse}>
          <th scope="row" className="py-0.5 pl-3 pr-2 font-normal text-text-secondary">
            <span className="font-mono">{warehouse.warehouse}</span>
            {warehouse.name && <span> · {warehouse.name}</span>}
          </th>
          <td className="py-0.5 pl-2 text-right">{amount(warehouse.on_hand)}</td>
          <td className="py-0.5 pl-2 text-right">{amount(warehouse.available)}</td>
        </tr>
      ))}
    </>
  );
}

/** Loading, failure, no stock, or the table, for the popover and the card alike. */
function BreakdownBody({ query, sku }: { query: ReturnType<typeof useStockBreakdown>; sku: string }) {
  if (query.isPending) return <div className="h-24 animate-pulse rounded-md bg-canvas-subtle" aria-busy="true" aria-label="Cargando el desglose" />;
  if (query.isError) return <p role="alert" className="text-[13px] text-danger">No se pudo leer el desglose: {errorMessage(query.error)}</p>;
  const item = query.data.items.find((candidate) => candidate.sku === sku);
  if (!item || item.centers.length === 0) {
    return <p className="text-[13px] text-text-secondary">Sin existencia en estas bodegas.</p>;
  }
  return <BreakdownTable item={item} />;
}

/** The «i» beside a line's stock: asks for the breakdown only when it opens. */
export function StockBreakdownPopover({ quotationId, version, sku }: { quotationId: string; version: number; sku: string }) {
  const [open, setOpen] = useState(false);
  const query = useStockBreakdown(quotationId, version, sku, open);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {/* An «i» beside the figures: hover shows the breakdown, and a click or tap opens it too. */}
      <Popover.Trigger
        openOnHover
        delay={150}
        title="Desglose por C.O. y bodega"
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center self-center rounded-sm text-text-secondary hover:text-text-primary",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:size-11"
        )}
      >
        <Info className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Desglose de la existencia de {sku} por C.O. y bodega</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Popover.Popup className="w-[26rem] max-w-[calc(100vw-2rem)] space-y-2 rounded-lg border border-border bg-surface-raised p-3 pr-1 text-sm text-text-primary shadow-modal outline-none">
            <Popover.Title className="pr-2 text-sm font-semibold">Existencias de {sku}</Popover.Title>
            {query.data && <StockSource data={query.data} className="pr-2" />}
            {/* A thin, quiet scrollbar on the popup's right edge, clear of the figures. */}
            <div className="max-h-80 overflow-y-auto overscroll-contain pr-2 [scrollbar-color:var(--border-control)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin]">
              <BreakdownBody query={query} sku={sku} />
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * The card in a reference's detail: every center the quotation draws from, with its
 * warehouses. Where Nacional or several centers sum the stock, this is where it splits.
 */
export function StockBreakdownCard({ quotationId, version, sku }: { quotationId: string; version: number; sku: string }) {
  const query = useStockBreakdown(quotationId, version, sku, true);
  return (
    <section aria-labelledby={`stock-${sku}`} className="space-y-2 rounded-lg border border-border p-3">
      <div className="space-y-0.5">
        <h3 id={`stock-${sku}`} className="flex items-center gap-1.5 text-sm font-semibold">
          <Warehouse className="size-4 text-text-secondary" aria-hidden="true" /> Existencias por C.O.
        </h3>
        {query.data && <StockSource data={query.data} />}
      </div>
      <BreakdownBody query={query} sku={sku} />
    </section>
  );
}
