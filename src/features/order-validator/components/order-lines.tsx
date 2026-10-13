"use client";

import { useId, useState } from "react";
import { ChevronDown, FileSearch } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { calcMethodLabel, formatCop, formatDay, formatNumber, formatPct, humanize } from "@/features/supports/lib/format";

import type { OrderLine, SupportCheck } from "../types/order-validator.types";
import { OutcomeBadge, StatusBadge } from "./status-badges";

/**
 * The lines of one order, each with its decision. A line is a block rather
 * than a table row because it carries a sentence of explanation and a list of
 * checks, and the same block reads on a phone. `onOpenSupport` opens the
 * support's detail in the supports master's own dialog.
 */
export default function OrderLines({
  lines,
  onOpenSupport,
}: {
  lines: OrderLine[];
  onOpenSupport: (supportId: string) => void;
}) {
  return (
    <ul className="divide-y divide-border">
      {lines.map((line) => (
        <li key={line.id}>
          <LineBlock line={line} onOpenSupport={onOpenSupport} />
        </li>
      ))}
    </ul>
  );
}

/**
 * With no support on file the reason label already says everything the API's
 * sentence does, so that sentence is not repeated. For the other reasons it
 * carries specifics, and it waits behind a button instead of filling the line.
 */
const SELF_EXPLANATORY_REASONS = new Set(["sin_acuerdo"]);

function LineBlock({ line, onOpenSupport }: { line: OrderLine; onOpenSupport: (supportId: string) => void }) {
  const checksId = useId();
  const detailId = useId();
  const [showChecks, setShowChecks] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const hasDetail = Boolean(line.detail) && !SELF_EXPLANATORY_REASONS.has(line.reason);

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
        </div>
      </div>

      <MarginMeter line={line} />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <Figure label="Precio unitario" value={formatCop(line.unit_price)} />
        <Figure label="Cantidad" value={formatNumber(line.quantity)} />
        <Figure label="Lista · bodega" value={[line.price_list, line.warehouse].filter(Boolean).join(" · ") || "—"} plain />
      </dl>

      {hasDetail && (
        <div className="space-y-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetail((value) => !value)}
            aria-expanded={showDetail}
            aria-controls={detailId}
          >
            <ChevronDown className={cn("transition-transform duration-150", showDetail && "rotate-180")} aria-hidden="true" />
            {showDetail ? "Ocultar detalle" : "Ver detalle"}
          </Button>
          {showDetail && (
            <p id={detailId} className="max-w-prose text-sm text-text-secondary">
              {line.detail}
            </p>
          )}
        </div>
      )}

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

const points = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/**
 * The line's margin set against the one it has to reach, as a bar and a
 * sentence in place of an inequality: "2,22 % < 18,00 %" becomes "faltan 15,78
 * puntos". The bar is a summary only; the figures are in the text, and the
 * color is never the only signal.
 */
function MarginMeter({ line }: { line: OrderLine }) {
  const margin = toNumber(line.effective_margin_pct) ?? toNumber(line.margin_pct);
  const target = toNumber(line.required_margin_pct);
  if (margin === null || target === null) {
    return margin === null ? null : <p className="text-sm">Margen {formatPct(margin)}</p>;
  }

  const gap = Math.round((target - margin) * 10000) / 100;
  const meets = gap <= 0;
  const fill = target > 0 ? Math.min(Math.max(margin / target, 0), 1) : 1;
  const orderMargin = toNumber(line.margin_pct);
  const supportMoved = orderMargin !== null && Math.abs(orderMargin - margin) > 0.00005;

  return (
    <div className="max-w-md space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>
          <span className="font-semibold tabular-nums">{formatPct(margin)}</span>
          <span className="text-text-secondary">
            {supportMoved ? ` con apoyo (en el pedido ${formatPct(orderMargin)})` : " de margen"}
          </span>
        </span>
        <span className="text-text-secondary tabular-nums">Objetivo {formatPct(target)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-sm bg-border" aria-hidden="true">
        <div className={cn("h-full rounded-sm", meets ? "bg-success" : "bg-warning")} style={{ width: `${fill * 100}%` }} />
      </div>
      <p className={cn("text-xs", meets ? "text-success" : "text-warning")}>
        {gap === 0
          ? "Justo en el objetivo"
          : meets
            ? `Supera el objetivo por ${points.format(-gap)} puntos`
            : `Faltan ${points.format(gap)} puntos para el objetivo`}
      </p>
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
        <span className="font-medium">{check.program ?? humanize(check.kind)}</span>
        <span className="text-text-secondary">{calcMethodLabel(check.calc_method)}</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onOpenSupport(check.support_id)}>
          <FileSearch aria-hidden="true" /> Ver apoyo
        </Button>
      </div>
      <p className="text-xs tabular-nums text-text-secondary">
        Vigencia {formatDay(check.valid_from)} a {check.valid_to ? formatDay(check.valid_to) : "indefinido"} · Margen con apoyo{" "}
        {formatPct(check.effective_margin_pct)} · Objetivo {formatPct(check.required_margin_pct)}
      </p>
      {check.detail && <p className="max-w-prose">{check.detail}</p>}
    </div>
  );
}
