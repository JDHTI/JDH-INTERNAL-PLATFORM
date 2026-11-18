"use client";

import { useId, useState } from "react";
import { ChevronDown, FileSearch } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { calcMethodLabel, formatCop, formatDay, formatNumber, humanize } from "@/features/supports/lib/format";

import { MARGIN_BASIS_LABELS, differs, formatMarginPct, lineOrderMargin } from "../lib/format";
import type { OrderLine, SupportCheck } from "../types/order-validator.types";
import { LineAlertBadges, LiquorTaxBadge, NoEffectBadge, OutcomeBadge, StatusBadge } from "./status-badges";

/**
 * The lines of one order, each with its decision. A line is a block rather
 * than a table row because it carries a list of checks, and the same block
 * reads on a phone. `onOpenSupport` opens the
 * support's detail in the supports master's own dialog.
 */
export default function OrderLines({
  lines,
  alertedRows,
  onOpenSupport,
}: {
  lines: OrderLine[];
  /** File rows an order alert points at; their lines are marked. */
  alertedRows: Set<number>;
  onOpenSupport: (supportId: string) => void;
}) {
  return (
    <ul className="divide-y divide-border">
      {lines.map((line) => {
        const flagged = alertedRows.has(line.row_number) || (line.alerts?.length ?? 0) > 0;
        const full = line.alerts?.includes("margen_100") || line.reason === "margen_100";
        return (
          <li
            key={line.id}
            className={cn(flagged && (full ? "shadow-[inset_3px_0_0_var(--danger)]" : "shadow-[inset_3px_0_0_var(--warning)]"))}
          >
            <LineBlock line={line} onOpenSupport={onOpenSupport} />
          </li>
        );
      })}
    </ul>
  );
}

/*
 * The API's `detail` sentence ("margen del pedido 2,22 % < margen lista 18,00 %")
 * is not shown, on the line or on its checks: the reason label says what was
 * decided and the margin figures are listed plainly.
 */
function LineBlock({ line, onOpenSupport }: { line: OrderLine; onOpenSupport: (supportId: string) => void }) {
  const checksId = useId();
  const [showChecks, setShowChecks] = useState(false);
  // The margin the line brings to the order leads; the file's follows only when the support moved it,
  // and the support's own figure only when it is neither of the two (e.g. a minimum-margin exception).
  const orderMargin = lineOrderMargin(line);
  const fileMargin = toNumber(line.margin_pct);
  const effectiveMargin = toNumber(line.effective_margin_pct);
  const showEffective = differs(effectiveMargin, orderMargin) && differs(effectiveMargin, fileMargin);

  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm">
            <span className="font-mono text-[13px]">{line.sku ?? "Sin SKU"}</span>
            <span className="text-text-secondary"> · fila {line.row_number}</span>
          </p>
          <p className="text-sm font-medium">{line.description ?? "Sin descripción"}</p>
          <p className="text-xs text-text-secondary">
            {line.supplier_name ?? "Sin proveedor"}
            {line.supplier_code ? ` · ${line.supplier_code}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <StatusBadge status={line.status} label={line.status_label} />
          <span className="text-sm text-text-secondary">{line.reason_label}</span>
          <LineAlertBadges codes={line.alerts ?? []} pointsBelow={line.points_below_target} />
          {line.liquor_tax && <LiquorTaxBadge amount={line.liquor_tax_amount} />}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <Figure label="Margen en el pedido" value={formatMarginPct(orderMargin)} />
        {differs(fileMargin, orderMargin) && <Figure label="Margen del archivo" value={formatMarginPct(fileMargin)} />}
        {showEffective && <Figure label="Margen con apoyo" value={formatMarginPct(effectiveMargin)} />}
        <Figure
          label="Margen objetivo"
          value={`${formatMarginPct(line.required_margin_pct)}${line.margin_basis ? ` (${MARGIN_BASIS_LABELS[line.margin_basis]})` : ""}`}
        />
        <Figure label="Precio unitario" value={formatCop(line.unit_price)} />
        <Figure label="Cantidad" value={formatNumber(line.quantity)} />
        <Figure label="Lista · bodega" value={[line.price_list, line.warehouse].filter(Boolean).join(" · ") || "—"} plain />
      </dl>

      {line.problems.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Problemas del archivo">
          {line.problems.map((problem) => (
            <li key={problem}>
              <Badge tone="warning">{humanize(problem)}</Badge>
            </li>
          ))}
        </ul>
      )}

      {(line.support_id || line.checks.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {line.support_id && (
            <Button variant="outline" size="sm" onClick={() => onOpenSupport(line.support_id!)}>
              <FileSearch aria-hidden="true" /> Ver apoyo que decidió
            </Button>
          )}
          {line.checks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChecks((value) => !value)}
              aria-expanded={showChecks}
              aria-controls={checksId}
            >
              <ChevronDown className={cn("transition-transform duration-150", showChecks && "rotate-180")} aria-hidden="true" />
              {line.checks.length === 1 ? "1 apoyo revisado" : `${line.checks.length} apoyos revisados`}
            </Button>
          )}
        </div>
      )}

      {showChecks && (
        <ul id={checksId} className="divide-y divide-border rounded-md border border-border">
          {line.checks.map((check, index) => (
            <li key={`${check.support_id}-${index}`}>
              <CheckRow check={check} onOpenSupport={onOpenSupport} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Figure({ label, value, plain = false }: { label: string; value: string; plain?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className={cn("font-medium", !plain && "tabular-nums")}>{value}</dd>
    </div>
  );
}

function CheckRow({ check, onOpenSupport }: { check: SupportCheck; onOpenSupport: (supportId: string) => void }) {
  return (
    <div className="space-y-1.5 px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <OutcomeBadge outcome={check.outcome} />
        {check.needs_review && <Badge tone="warning">Por revisar</Badge>}
        <NoEffectBadge check={check} />
        <span className="font-medium">{check.program ?? humanize(check.kind)}</span>
        <span className="text-text-secondary">{calcMethodLabel(check.calc_method)}</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onOpenSupport(check.support_id)}>
          <FileSearch aria-hidden="true" /> Ver apoyo
        </Button>
      </div>
      <p className="text-xs tabular-nums text-text-secondary">
        Vigencia {formatDay(check.valid_from)} a {check.valid_to ? formatDay(check.valid_to) : "indefinido"} · Margen con apoyo{" "}
        {formatMarginPct(check.effective_margin_pct)} · Objetivo {formatMarginPct(check.required_margin_pct)}
      </p>
    </div>
  );
}
