"use client";

import { useState } from "react";
import { ChevronDown, CloudOff, Download, FileX2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { useSettlementReferences } from "../hooks/use-support-settlements";
import { formatCount, formatPesos } from "../lib/format";
import { downloadSettlement } from "../services/support-settlements.service";
import type { CostBasis, Period, ReferenceRow, SupplierRow } from "../types/support-settlements.types";
import { MarginShift } from "./settlement-figures";
import SettlementLines from "./settlement-lines";
import { supplierFilterCode, supplierLabel } from "./supplier-options";

const th = "px-2 py-1.5";
const num = "whitespace-nowrap px-2 py-1.5 text-right tabular-nums";

/** A supplier without a code in the masters is asked for with the API's `__none__`. */
const supplierKey = supplierFilterCode;
const supplierName = supplierLabel;

/** Opened rows of a level: a click toggles one, the rest stay as they are. */
function useOpenSet() {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return { open, toggle };
}

function ToggleCell({ open, controls, label, children }: { open: boolean; controls: string; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
      className="flex min-w-0 items-start gap-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-text-secondary transition-transform duration-150", !open && "-rotate-90")} aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </button>
  );
}

/**
 * What each supplier owes for the month, from the largest support down. A supplier opens into its
 * supported references, and a reference into its sale lines with each support applied. Every
 * supplier row downloads that supplier's workbook.
 */
export default function SuppliersTable({ period, basis, rows }: { period: Period; basis: CostBasis; rows: SupplierRow[] }) {
  const { open, toggle } = useOpenSet();
  const [downloading, setDownloading] = useState<string | null>(null);

  const download = async (row: SupplierRow) => {
    setDownloading(supplierKey(row));
    try {
      await downloadSettlement(period, basis, supplierFilterCode(row));
    } catch (failure) {
      toast.error(errorMessage(failure));
    } finally {
      setDownloading(null);
    }
  };

  if (rows.length === 0) {
    return (
      <StatePanel icon={FileX2} title="Ningún proveedor con apoyos en el mes">
        Ninguna venta del mes quedó cubierta por un apoyo del maestro.
      </StatePanel>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[60rem] text-left text-[13px]">
        <caption className="sr-only">Apoyo a reconocer por proveedor</caption>
        <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          <tr>
            <th scope="col" className={th}>Proveedor</th>
            <th scope="col" className={cn(th, "text-right")}>Referencias</th>
            <th scope="col" className={cn(th, "text-right")}>Líneas</th>
            <th scope="col" className={cn(th, "text-right")}>Venta neta</th>
            <th scope="col" className={cn(th, "text-right")}>Apoyo a reconocer</th>
            <th scope="col" className={cn(th, "text-right")}>No cobrado</th>
            <th scope="col" className={cn(th, "text-right")}>Margen → recompuesto</th>
            <th scope="col" className={th}>
              <span className="sr-only">Excel del proveedor</span>
            </th>
          </tr>
        </thead>
        {rows.map((row) => {
          const key = supplierKey(row);
          const isOpen = open.has(key);
          const panelId = `settlement-supplier-${key}`;
          const name = supplierName(row);
          return (
            <tbody key={key} className="border-t border-border">
              <tr className="cursor-pointer hover:bg-primary-subtle" onClick={() => toggle(key)}>
                <td className="max-w-80 px-2 py-1.5">
                  <ToggleCell open={isOpen} controls={panelId} label={`${isOpen ? "Ocultar" : "Ver"} las referencias de ${name}`}>
                    <span className="block truncate font-medium" title={name}>{name}</span>
                    {row.supplier_code && <span className="block font-mono text-xs text-text-secondary">{row.supplier_code}</span>}
                  </ToggleCell>
                </td>
                <td className={num}>{formatCount(row.references)}</td>
                <td className={num}>{formatCount(row.supported_lines)}</td>
                <td className={num}>{formatPesos(row.net)}</td>
                <td className={cn(num, "font-semibold")}>{formatPesos(row.amount)}</td>
                <td className={cn(num, (toNumber(row.flagged_amount) ?? 0) !== 0 && "text-warning")}>{formatPesos(row.flagged_amount)}</td>
                <td className={num}>
                  <MarginShift margin={row.margin} recomposed={row.recomposed_margin} />
                </td>
                <td className="px-2 py-1 text-right" onClick={(event) => event.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => download(row)}
                    disabled={downloading === key}
                    aria-label={`Descargar el Excel de ${name}`}
                    title="Excel del proveedor"
                  >
                    <Download aria-hidden="true" />
                  </Button>
                </td>
              </tr>
              {isOpen && (
                <tr id={panelId}>
                  <td colSpan={8} className="bg-canvas-subtle p-3">
                    <SupplierReferences period={period} basis={basis} supplierCode={key} supplierName={name} />
                  </td>
                </tr>
              )}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

/** The supplier's supported references; `net` and `cost` are every sale of each one in the month. */
function SupplierReferences({
  period,
  basis,
  supplierCode,
  supplierName: name,
}: {
  period: Period;
  basis: CostBasis;
  supplierCode: string;
  supplierName: string;
}) {
  const query = useSettlementReferences(period, basis, supplierCode);
  const { open, toggle } = useOpenSet();

  if (query.isPending) {
    return <div className="h-24 animate-pulse rounded-md bg-surface" aria-busy="true" aria-label={`Cargando las referencias de ${name}`} />;
  }
  if (query.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudieron cargar las referencias"
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
  const rows = query.data.references;
  if (rows.length === 0) {
    return <p className="text-sm text-text-secondary">Este proveedor no tiene referencias apoyadas en el mes.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface">
      <table className="w-full min-w-[56rem] text-left text-[13px]">
        <caption className="sr-only">Referencias apoyadas de {name}</caption>
        <thead className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
          <tr>
            <th scope="col" className={th}>Referencia</th>
            <th scope="col" className={cn(th, "text-right")}>Cantidad</th>
            <th scope="col" className={cn(th, "text-right")}>Líneas</th>
            <th scope="col" className={cn(th, "text-right")} title="Todas las ventas de la referencia en el mes">Venta neta</th>
            <th scope="col" className={cn(th, "text-right")}>Apoyo</th>
            <th scope="col" className={cn(th, "text-right")}>No cobrado</th>
            <th scope="col" className={cn(th, "text-right")}>Margen → recompuesto</th>
          </tr>
        </thead>
        {rows.map((row: ReferenceRow) => {
          const isOpen = open.has(row.sku);
          const panelId = `settlement-ref-${supplierCode}-${row.sku}`;
          return (
            <tbody key={row.sku} className="border-t border-border">
              <tr className="cursor-pointer hover:bg-primary-subtle" onClick={() => toggle(row.sku)}>
                <td className="max-w-96 px-2 py-1.5">
                  <ToggleCell open={isOpen} controls={panelId} label={`${isOpen ? "Ocultar" : "Ver"} las ventas de ${row.sku}`}>
                    <span className="block font-mono text-xs">{row.sku}</span>
                    <span className="block truncate" title={row.description ?? undefined}>{row.description ?? "—"}</span>
                  </ToggleCell>
                </td>
                <td className={num}>{formatCount(row.quantity)}</td>
                <td className={num}>{formatCount(row.supported_lines)}</td>
                <td className={num}>{formatPesos(row.net)}</td>
                <td className={cn(num, "font-semibold")}>{formatPesos(row.amount)}</td>
                <td className={cn(num, (toNumber(row.flagged_amount) ?? 0) !== 0 && "text-warning")}>{formatPesos(row.flagged_amount)}</td>
                <td className={num}>
                  <MarginShift margin={row.margin} recomposed={row.recomposed_margin} />
                </td>
              </tr>
              {isOpen && (
                <tr id={panelId}>
                  <td colSpan={7} className="p-2">
                    <SettlementLines
                      period={period}
                      basis={basis}
                      supplierCode={supplierCode}
                      sku={row.sku}
                      label={`Ventas apoyadas de ${row.sku}`}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
