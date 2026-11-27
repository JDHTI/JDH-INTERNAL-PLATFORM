"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Clock, FileSearch } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { calcMethodLabel, formatCop, formatDay, formatNumber, humanize } from "@/features/supports/lib/format";

import { MARGIN_BASIS_LABELS, differs, formatMarginPct, lineOrderMargin, reviewAlerts } from "../lib/format";
import type { OrderLine } from "../types/order-validator.types";
import { InventoryCost } from "./inventory-cost";
import { LineAlertBadges, LiquorTaxBadge, NoEffectBadge, OutcomeBadge } from "./status-badges";

/**
 * The lines of one order as a dense table, in the order the API sends them.
 * Row height and padding are the minimum that stays readable: the point is to
 * see many orders on one screen. A line's checked supports open in a row under it.
 */
export default function OrderLinesTable({
  lines,
  alertedRows,
  onOpenSupport,
}: {
  lines: OrderLine[];
  /** File rows an order alert points at; their lines are marked. */
  alertedRows: Set<number>;
  onOpenSupport: (supportId: string) => void;
}) {
  const [withChecks, setWithChecks] = useState<Set<string>>(new Set());
  const toggleChecks = (id: string) =>
    setWithChecks((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <table className="w-full text-left text-[13px]">
      <caption className="sr-only">Líneas del pedido</caption>
      <thead className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
        <tr>
          <th scope="col" className="py-1 pl-4 pr-2">SKU</th>
          <th scope="col" className="px-2 py-1">Descripción</th>
          <th scope="col" className="px-2 py-1 text-right">Cant.</th>
          <th scope="col" className="px-2 py-1 text-right">Precio</th>
          <th scope="col" className="px-2 py-1 text-right" title="Descuento a pie de factura">Desc. prom.</th>
          <th scope="col" className="px-2 py-1 text-right" title="Costo promedio de la referencia en la bodega de la línea, del inventario de SIESA del día en que se validó">
            Costo prom.
          </th>
          <th scope="col" className="px-2 py-1 text-right" title="Existencias en la bodega de la línea">Existencias</th>
          <th scope="col" className="px-2 py-1 text-right">Margen en pedido</th>
          <th scope="col" className="px-2 py-1 text-right">Objetivo</th>
          <th scope="col" className="px-2 py-1">Motivo</th>
          <th scope="col" className="py-1 pl-2 pr-4"><span className="sr-only">Apoyos</span></th>
        </tr>
      </thead>
      {lines.map((line) => {
        const open = withChecks.has(line.id);
        const flagged = alertedRows.has(line.row_number) || reviewAlerts(line).length > 0;
        return (
          <tbody key={line.id} className="border-t border-border">
            <LineRow
              line={line}
              flagged={flagged}
              open={open}
              onToggleChecks={() => toggleChecks(line.id)}
              onOpenSupport={onOpenSupport}
            />
            {open && (
              <tr>
                <td colSpan={11} className="px-4 pb-2">
                  <ul className="divide-y divide-border rounded-md border border-border bg-surface">
                    {line.checks.map((check, index) => (
                      <li key={`${check.support_id}-${index}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5">
                        <OutcomeBadge outcome={check.outcome} />
                        {check.needs_review && <Badge tone="warning">Por revisar</Badge>}
                        <NoEffectBadge check={check} />
                        <span className="font-medium">{check.program ?? humanize(check.kind)}</span>
                        <span className="text-text-secondary">{calcMethodLabel(check.calc_method)}</span>
                        <span className="tabular-nums text-text-secondary">
                          {formatDay(check.valid_from)} a {check.valid_to ? formatDay(check.valid_to) : "indefinido"} · {formatMarginPct(check.effective_margin_pct)} de{" "}
                          {formatMarginPct(check.required_margin_pct)}
                        </span>
                        <Button variant="ghost" size="sm" className="ml-auto h-6" onClick={() => onOpenSupport(check.support_id)}>
                          <FileSearch aria-hidden="true" /> Ver apoyo
                        </Button>
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            )}
          </tbody>
        );
      })}
    </table>
  );
}

function LineRow({
  line,
  flagged,
  open,
  onToggleChecks,
  onOpenSupport,
}: {
  line: OrderLine;
  /** An alert points at this line: it gets an edge in the alert's color, beside its alert badge. */
  flagged: boolean;
  open: boolean;
  onToggleChecks: () => void;
  onOpenSupport: (supportId: string) => void;
}) {
  // The margin the line brings to the order; the file's is shown under it when the support moved it.
  const margin = lineOrderMargin(line);
  const fileMargin = toNumber(line.margin_pct);
  const target = toNumber(line.required_margin_pct);
  const ready = line.status === "listo_para_liberar";
  const Icon = ready ? CheckCircle2 : Clock;
  const supportMoved = differs(fileMargin, margin);
  const alerts = line.alerts ?? [];
  const full = alerts.includes("margen_100") || line.reason === "margen_100";

  return (
    <tr
      className={cn(
        "h-8 align-middle",
        flagged && (full ? "shadow-[inset_3px_0_0_var(--danger)]" : "shadow-[inset_3px_0_0_var(--warning)]")
      )}
    >
      <td className="whitespace-nowrap py-1 pl-4 pr-2 font-mono">
        {line.sku ?? "—"}
        {flagged && <span className="sr-only"> (línea con alerta, fila {line.row_number})</span>}
      </td>
      <td className="max-w-72 truncate px-2 py-1" title={line.description ?? undefined}>
        {line.description ?? "Sin descripción"}
        {line.liquor_tax && <LiquorTaxBadge className="ml-2 py-0 text-xs" amount={line.liquor_tax_amount} />}
      </td>
      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">{formatNumber(line.quantity)}</td>
      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">{formatCop(line.unit_price)}</td>
      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">
        {toNumber(line.discount_pct ?? null) === null ? <span className="text-text-secondary">—</span> : formatMarginPct(line.discount_pct)}
      </td>
      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">
        <InventoryCost line={line} />
      </td>
      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">
        {toNumber(line.inventory_stock ?? null) === null ? <span className="text-text-secondary">—</span> : formatNumber(line.inventory_stock ?? null)}
      </td>
      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">
        {margin === null ? "—" : formatMarginPct(margin)}
        {supportMoved && <span className="block text-xs text-text-secondary">Archivo {formatMarginPct(fileMargin)}</span>}
      </td>
      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">
        {target === null ? (
          "—"
        ) : (
          <>
            {formatMarginPct(target)}
            {line.margin_basis && <span className="text-text-secondary"> ({MARGIN_BASIS_LABELS[line.margin_basis]})</span>}
          </>
        )}
      </td>
      <td className="px-2 py-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className={cn("inline-flex items-center gap-1", ready ? "text-success" : "text-warning")}>
            <Icon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="sr-only">{line.status_label}: </span>
            {line.reason_label}
          </span>
          <LineAlertBadges codes={alerts} pointsBelow={line.points_below_target} />
        </span>
      </td>
      <td className="whitespace-nowrap py-1 pl-2 pr-4 text-right">
        {line.support_id && (
          <Button variant="ghost" size="icon-sm" className="size-6" onClick={() => onOpenSupport(line.support_id!)} aria-label={`Ver el apoyo que decidió la línea ${line.row_number}`} title="Ver apoyo que decidió">
            <FileSearch aria-hidden="true" />
          </Button>
        )}
        {line.checks.length > 0 && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="size-6"
            onClick={onToggleChecks}
            aria-expanded={open}
            aria-label={`${line.checks.length === 1 ? "1 apoyo revisado" : `${line.checks.length} apoyos revisados`} en la línea ${line.row_number}`}
            title={line.checks.length === 1 ? "1 apoyo revisado" : `${line.checks.length} apoyos revisados`}
          >
            <ChevronDown className={cn("transition-transform duration-150", open && "rotate-180")} aria-hidden="true" />
          </Button>
        )}
      </td>
    </tr>
  );
}
