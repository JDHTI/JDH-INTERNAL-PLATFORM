"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CloudOff, Eraser, Lock, RefreshCw, Search } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { MultiSelect } from "@/shared/components/ui/multi-select";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { useBudgetBoard, useBudgetPeriods, useBudgetPermissions } from "../hooks/use-commercial-budget";
import {
  defaultPeriod,
  formatChange,
  formatCount,
  formatMoment,
  formatPercent,
  formatPesos,
  formatPoints,
  formatSignedCount,
  periodLabel,
} from "../lib/format";
import type { BudgetBoard, BudgetFilters, BudgetPeriod, BudgetPermissions, Period } from "../types/commercial-budget.types";
import BudgetActions from "./budget-actions";
import BudgetTable from "./budget-table";

const NO_FILTERS: BudgetFilters = { regional: [], business_unit: [], team: [], salesperson: [], q: "" };

/**
 * «Presupuesto comercial»: GET /commercial-budget/permissions first, so a role without the key
 * reads why instead of a screen of 403s; then the months.
 */
export default function BudgetScreen() {
  const permissions = useBudgetPermissions();

  if (permissions.isPending) {
    return <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando tus permisos" />;
  }
  if (permissions.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudieron consultar tus permisos del presupuesto"
        action={
          <Button variant="outline" onClick={() => permissions.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        }
      >
        {errorMessage(permissions.error)}
      </StatePanel>
    );
  }
  if (!permissions.data.can_read || permissions.data.scope === "none") {
    return (
      <StatePanel icon={Lock} title="No tienes vendedores para consultar">
        {permissions.data.can_read
          ? "Tu usuario no está asociado a un vendedor, un equipo ni una dirección comercial. Pídele a TI que lo asocie."
          : "Pide al líder de tu área o a TI que le den a tu rol el permiso «Presupuesto comercial»."}
      </StatePanel>
    );
  }
  return <BudgetMonths permissions={permissions.data} />;
}

function BudgetMonths({ permissions }: { permissions: BudgetPermissions }) {
  const periods = useBudgetPeriods(true);
  const [chosen, setChosen] = useState<Period | null>(null);
  // The filters stay when the month changes: the same team, another month.
  const [filters, setFilters] = useState<BudgetFilters>(NO_FILTERS);

  if (periods.isPending) {
    return <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando los meses" />;
  }
  if (periods.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudieron cargar los meses"
        action={
          <Button variant="outline" onClick={() => periods.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        }
      >
        {errorMessage(periods.error)}
      </StatePanel>
    );
  }

  const list = periods.data;
  const period = chosen && list.some((item) => item.period === chosen) ? chosen : defaultPeriod(list);
  const month = list.find((item) => item.period === period) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Dropdown
          className="w-full sm:w-72"
          value={period ?? ""}
          onValueChange={setChosen}
          options={list.map((item) => ({
            value: item.period,
            label: `${periodLabel(item.period)} · ${item.is_current ? "En curso" : item.status_label}`,
          }))}
          placeholder="No hay meses"
          disabled={list.length === 0}
          aria-label="Mes del presupuesto"
        />
        {month && <BudgetActions month={month} filters={filters} permissions={permissions} />}
      </div>
      {month && <MonthView month={month} filters={filters} onFilters={setFilters} permissions={permissions} />}
    </div>
  );
}

function MonthView({
  month,
  filters,
  onFilters,
  permissions,
}: {
  month: BudgetPeriod;
  filters: BudgetFilters;
  onFilters: (next: BudgetFilters) => void;
  permissions: BudgetPermissions;
}) {
  const board = useBudgetBoard(month.period, filters);
  const closed = month.status === "cerrado";

  return (
    <div className="space-y-4">
      {closed && (
        <p role="note" className="flex items-start gap-2 rounded-md bg-canvas-subtle px-3 py-2 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-text-secondary" aria-hidden="true" />
          <span>
            Mes cerrado{month.closed_by ? ` por ${month.closed_by}` : ""}
            {month.closed_at ? ` el ${formatMoment(month.closed_at)}` : ""}: la asignación de clientes y equipos quedó congelada.
          </span>
        </p>
      )}
      {month.is_current && !closed && (
        <p className="rounded-md bg-info-surface px-3 py-2 text-sm text-info">
          Mes en curso: las cifras se recalculan con el vendedor que cada cliente tiene hoy, también las de los meses con que se compara.
        </p>
      )}

      {board.isPending ? (
        <div className="h-96 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando el presupuesto del mes" />
      ) : board.isError ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se pudo cargar el presupuesto del mes"
          action={
            <Button variant="outline" onClick={() => board.refetch()}>
              <RefreshCw aria-hidden="true" /> Reintentar
            </Button>
          }
        >
          {errorMessage(board.error)}
        </StatePanel>
      ) : (
        <>
          <MissingMonths board={board.data} canSync={permissions.can_manage} />
          <Kpis board={board.data} />
          <Filters board={board.data} filters={filters} onChange={onFilters} />
          <div className={cn("transition-opacity duration-150", board.isPlaceholderData && "opacity-60")} aria-busy={board.isPlaceholderData}>
            {/* While another month or filter loads, the previous answer stays dimmed and read-only. */}
            <BudgetTable board={board.data} editable={permissions.can_manage && !closed && !board.isPlaceholderData} />
          </div>
          {board.data.sales_loaded_at && (
            <p className="text-xs text-text-secondary">Ventas copiadas del DWH el {formatMoment(board.data.sales_loaded_at)}.</p>
          )}
        </>
      )}
    </div>
  );
}

/** The sales of some month of the window are not copied yet: its figures read zero. */
function MissingMonths({ board, canSync }: { board: BudgetBoard; canSync: boolean }) {
  if (board.missing_months.length === 0) return null;
  const months = board.missing_months.map(periodLabel).join(", ");
  return (
    <p role="alert" className="flex items-start gap-2 rounded-md bg-warning-surface px-3 py-2 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <span>
        Aún no se han copiado del DWH las ventas de {months}: sus cifras salen en cero.
        {canSync ? " Usa «Sincronizar ventas» para traerlas ahora." : " Se copian en la tarea diaria, después del reporte de ventas."}
      </span>
    </p>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "success" | "danger" }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
      <p className="truncate text-[13px] text-text-secondary">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", tone === "success" && "text-success", tone === "danger" && "text-danger")}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-text-secondary" title={hint}>{hint}</p>}
    </div>
  );
}

const toneOf = (value: number | null, good: (number: number) => boolean) => (value === null ? undefined : good(value) ? "success" : "danger");

/** One block of figures, from the filtered totals. */
function Kpis({ board }: { board: BudgetBoard }) {
  const { totals } = board;
  const compliance = toNumber(totals.derived.compliance);
  const marginGap = toNumber(totals.derived.margin_gap);
  const customersGap = toNumber(totals.derived.customers_gap);
  return (
    <section aria-label="Cifras del mes" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Kpi label="Venta del mes" value={formatPesos(totals.current.net)} hint={`Ppto ${formatPesos(totals.budget_sales)}`} />
      <Kpi label="Cumplimiento" value={formatPercent(totals.derived.compliance)} tone={toneOf(compliance, (value) => value >= 1)} hint="Venta / presupuesto de venta" />
      <Kpi
        label="Margen vs ppto"
        value={formatPoints(totals.derived.margin_gap)}
        tone={toneOf(marginGap, (value) => value >= 0)}
        hint={`${formatPercent(totals.current.margin)} · ppto ${formatPercent(totals.budget_margin)}`}
      />
      <Kpi
        label="Clientes vs ppto"
        value={formatSignedCount(totals.derived.customers_gap)}
        tone={toneOf(customersGap, (value) => value >= 0)}
        hint={`${formatCount(totals.current.customers)} · ppto ${formatCount(totals.budget_customers)}`}
      />
      <Kpi label="Ppto recaudo" value={formatPesos(totals.budget_collection)} />
      <Kpi label="% var. venta LY" value={formatChange(totals.derived.variation)} hint={`Ppto contra ${formatPesos(totals.last_year.net)}`} />
    </section>
  );
}

/** Regional, unit, team and rep, several values each, and a search by name or code. */
function Filters({ board, filters, onChange }: { board: BudgetBoard; filters: BudgetFilters; onChange: (next: BudgetFilters) => void }) {
  const [text, setText] = useState(filters.q);
  // The search waits for a pause in the typing: one read per word, not per letter.
  useEffect(() => {
    if (text === filters.q) return;
    const timer = window.setTimeout(() => onChange({ ...filters, q: text }), 350);
    return () => window.clearTimeout(timer);
  }, [text, filters, onChange]);

  const { options } = board;
  const reps = options.salespeople.map((rep) => ({ code: rep.code, label: `${rep.name ?? rep.code} · ${rep.code}` }));
  const labelOf = new Map(reps.map((rep) => [rep.code, rep.label]));
  const codeOf = new Map(reps.map((rep) => [rep.label, rep.code]));
  const active =
    filters.regional.length + filters.business_unit.length + filters.team.length + filters.salesperson.length > 0 || filters.q.trim() !== "";

  return (
    <div role="group" aria-label="Filtros" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.3fr)_auto]">
      <MultiSelect
        label="Regionales"
        allLabel="Todas las regionales"
        options={options.regionals}
        value={filters.regional}
        onValueChange={(regional) => onChange({ ...filters, regional })}
      />
      <MultiSelect
        label="Unidades"
        allLabel="Todas las unidades"
        options={options.business_units}
        value={filters.business_unit}
        onValueChange={(business_unit) => onChange({ ...filters, business_unit })}
      />
      <MultiSelect
        label="Equipos"
        allLabel="Todos los equipos"
        options={options.teams}
        value={filters.team}
        onValueChange={(team) => onChange({ ...filters, team })}
      />
      <MultiSelect
        label="Vendedores"
        allLabel="Todos los vendedores"
        options={reps.map((rep) => rep.label)}
        value={filters.salesperson.map((code) => labelOf.get(code) ?? code)}
        onValueChange={(labels) => onChange({ ...filters, salesperson: labels.map((label) => codeOf.get(label) ?? label) })}
      />
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
        <Input
          type="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Buscar vendedor o código"
          aria-label="Buscar vendedor por nombre o código"
          className="pl-8 max-md:h-11"
        />
      </div>
      <Button
        variant="ghost"
        onClick={() => {
          setText("");
          onChange(NO_FILTERS);
        }}
        disabled={!active}
        className="max-md:h-11"
      >
        <Eraser aria-hidden="true" /> Limpiar filtros
      </Button>
    </div>
  );
}
