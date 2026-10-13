"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Clock, FileSearch } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { calcMethodLabel, formatCop, formatDay, formatNumber, humanize } from "@/features/supports/lib/format";

import { MARGIN_BASIS_LABELS, formatMarginPct } from "../lib/format";
import type { OrderLine } from "../types/order-validator.types";
import { LiquorTaxBadge, OutcomeBadge } from "./status-badges";

/**
 * The lines of one order as a dense table, in the order the API sends them.
 * Row height and padding are the minimum that stays readable: the point is to
 * see many orders on one screen. A line's checked supports open in a row under it.
 */
export default function OrderLinesTable({
  lines,
  onOpenSupport,
}: {
  lines: OrderLine[];
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
          <th scope="col" className="px-2 py-1 text-right">Margen</th>
          <th scope="col" className="px-2 py-1 text-right">Objetivo</th>
          <th scope="col" className="px-2 py-1">Motivo</th>
          <th scope="col" className="py-1 pl-2 pr-4"><span className="sr-only">Apoyos</span></th>
        </tr>
      </thead>
      {lines.map((line) => {
        const open = withChecks.has(line.id);
        return (
          <tbody key={line.id} className="border-t border-border">
            <LineRow
              line={line}
              open={open}
              onToggleChecks={() => toggleChecks(line.id)}
              onOpenSupport={onOpenSupport}
            />
            {open && (
              <tr>
                <td colSpan={8} className="px-4 pb-2">
                  <ul className="divide-y divide-border rounded-md border border-border bg-surface">
                    {line.checks.map((check, index) => (
                      <li key={`${check.support_id}-${index}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5">
                        <OutcomeBadge outcome={check.outcome} />
                        {check.needs_review && <Badge tone="warning">Por revisar</Badge>}
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
  open,
  onToggleChecks,
  onOpenSupport,
}: {
  line: OrderLine;
  open: boolean;
  onToggleChecks: () => void;
  onOpenSupport: (supportId: string) => void;
}) {
  const margin = toNumber(line.effective_margin_pct) ?? toNumber(line.margin_pct);
  const target = toNumber(line.required_margin_pct);
  const ready = line.status === "listo_para_liberar";
  const Icon = ready ? CheckCircle2 : Clock;
  const orderMargin = toNumber(line.margin_pct);
  const supportMoved = orderMargin !== null && margin !== null && Math.abs(orderMargin - margin) > 0.00005;

  return (
    <tr className="h-8 align-middle">
      <td className="whitespace-nowrap py-1 pl-4 pr-2 font-mono">{line.sku ?? "—"}</td>
      <td className="max-w-72 truncate px-2 py-1" title={line.description ?? undefined}>
        {line.description ?? "Sin descripción"}
        {line.liquor_tax && <LiquorTaxBadge className="ml-2 py-0 text-xs" amount={line.liquor_tax_amount} />}
      </td>
      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">{formatNumber(line.quantity)}</td>
      <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">{formatCop(line.unit_price)}</td>
      <td
        className="whitespace-nowrap px-2 py-1 text-right tabular-nums"
        title={supportMoved ? `En el pedido: ${formatMarginPct(line.margin_pct)}. Con apoyo: ${formatMarginPct(margin)}.` : undefined}
      >
        {margin === null ? "—" : formatMarginPct(margin)}
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
        <span className={cn("inline-flex items-center gap-1", ready ? "text-success" : "text-warning")}>
          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="sr-only">{line.status_label}: </span>
          {line.reason_label}
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
