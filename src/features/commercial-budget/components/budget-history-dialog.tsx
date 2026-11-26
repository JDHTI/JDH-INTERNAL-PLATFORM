"use client";

import { CloudOff, History, RefreshCw } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { errorMessage } from "@/shared/lib/api-client";

import { useBudgetChanges } from "../hooks/use-commercial-budget";
import { formatCount, formatMoment, formatPercent, formatPesos, periodLabel } from "../lib/format";
import type { BudgetChange, BudgetField, Period, RepRow } from "../types/commercial-budget.types";

const LABELS: Record<BudgetField, string> = {
  budget_sales: "Venta",
  budget_margin: "Margen",
  budget_customers: "Clientes",
  budget_collection: "Recaudo",
};

function formatValue(field: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "vacío";
  if (field === "budget_margin") return formatPercent(String(value));
  if (field === "budget_customers") return formatCount(Number(value));
  return formatPesos(String(value));
}

/** Every change of one rep's budget in the month: each field before and after, who, when, how. */
export default function BudgetHistoryDialog({ period, rep, onClose }: { period: Period; rep: RepRow | null; onClose: () => void }) {
  const name = rep ? (rep.name ?? rep.salesperson_code) : "";
  return (
    <Dialog
      open={rep !== null}
      onOpenChange={(next) => !next && onClose()}
      title={`Historial de ${name}`}
      description={`Cambios del presupuesto de ${periodLabel(period)}, del más reciente al más antiguo.`}
    >
      {rep && <Changes period={period} code={rep.salesperson_code} />}
    </Dialog>
  );
}

function Changes({ period, code }: { period: Period; code: string }) {
  const changes = useBudgetChanges(period, code, true);

  if (changes.isPending) {
    return <div className="h-32 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando el historial" />;
  }
  if (changes.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudo cargar el historial"
        action={
          <Button variant="outline" onClick={() => changes.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        }
      >
        {errorMessage(changes.error)}
      </StatePanel>
    );
  }
  if (changes.data.length === 0) {
    return (
      <StatePanel icon={History} title="Sin cambios en el mes">
        El presupuesto de este vendedor no se ha diligenciado.
      </StatePanel>
    );
  }
  return (
    <ol className="space-y-3">
      {changes.data.map((change, index) => (
        <ChangeItem key={`${change.at}-${index}`} change={change} />
      ))}
    </ol>
  );
}

function ChangeItem({ change }: { change: BudgetChange }) {
  const fields = Object.keys(change.after);
  return (
    <li className="space-y-1.5 rounded-lg border border-border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium">{change.actor}</span>
        <span className="text-xs text-text-secondary">{formatMoment(change.at)}</span>
        <Badge tone={change.source === "archivo" ? "info" : "neutral"} className="px-1.5 py-0 text-xs">
          {change.source === "archivo" ? "Archivo" : "Manual"}
        </Badge>
      </div>
      <ul className="space-y-0.5 tabular-nums">
        {fields.map((field) => (
          <li key={field}>
            <span className="text-text-secondary">{LABELS[field as BudgetField] ?? field}: </span>
            {formatValue(field, change.before[field])} → {formatValue(field, change.after[field])}
          </li>
        ))}
      </ul>
      {change.note && <p className="text-[13px] text-text-secondary">Nota: {change.note}</p>}
    </li>
  );
}
