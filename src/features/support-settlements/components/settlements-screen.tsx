"use client";

import { useEffect, useId, useState } from "react";
import { Calculator, CloudOff, Download, Lock, LockOpen, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { ViewTab } from "@/shared/components/ui/view-tab";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import {
  useSettlementAction,
  useSettlementPeriods,
  useSettlementPermissions,
  useSettlementSummary,
  type SettlementAction,
} from "../hooks/use-support-settlements";
import {
  COST_BASES,
  basesStatus,
  basisShort,
  defaultPeriod,
  formatCount,
  formatMoment,
  formatPesos,
  periodLabel,
  periodState,
} from "../lib/format";
import { downloadSettlement } from "../services/support-settlements.service";
import type { CostBasis, Period, Settlement, SettlementPeriod, SettlementPermissions } from "../types/support-settlements.types";
import BreakdownView from "./breakdown-view";
import { MarginShift } from "./settlement-figures";
import SuppliersTable from "./suppliers-table";
import UnsettledView from "./unsettled-view";

type Tab = "proveedores" | "no-liquidados" | "desglose";
const TABS: { key: Tab; label: string }[] = [
  { key: "proveedores", label: "Proveedores" },
  { key: "no-liquidados", label: "No liquidados" },
  { key: "desglose", label: "Desglose" },
];

/**
 * The client side of «Liquidación de apoyos»: GET /support-settlements/permissions first, so a
 * role without the key sees why instead of a screen of 403s; then the month.
 */
export default function SettlementsScreen() {
  const permissions = useSettlementPermissions();

  if (permissions.isPending) {
    return <div className="h-72 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando tus permisos" />;
  }
  if (permissions.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudieron consultar tus permisos de la liquidación"
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
  if (!permissions.data.can_read) {
    return (
      <StatePanel icon={Lock} title="Tu rol no tiene acceso a la liquidación de apoyos">
        Pide al líder de BI o a TI que le den a tu rol el permiso «Liquidación de apoyos».
      </StatePanel>
    );
  }
  return <SettlementMonths permissions={permissions.data} />;
}

/**
 * The two cost bases as a segmented control: each is its own settlement, so everything below
 * (figures, tables, Excel, close and reopen) follows the one chosen.
 */
function BasisSwitch({ value, onChange }: { value: CostBasis; onChange: (basis: CostBasis) => void }) {
  return (
    <div role="group" aria-label="Base de costo" className="flex w-full shrink-0 gap-1 rounded-md border border-border-control p-1 sm:w-auto">
      {COST_BASES.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-7 flex-1 rounded-sm px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 max-md:h-10 sm:flex-none",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            value === option.value ? "bg-primary-subtle text-primary" : "text-text-secondary hover:text-text-primary"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SettlementMonths({ permissions }: { permissions: SettlementPermissions }) {
  const [basis, setBasis] = useState<CostBasis>("cotizacion");
  const periods = useSettlementPeriods(basis);
  const [chosen, setChosen] = useState<Period | null>(null);

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

  const list = [...periods.data].sort((a, b) => b.period.localeCompare(a.period));
  const period = chosen && list.some((item) => item.period === chosen) ? chosen : defaultPeriod(list);
  const current = list.find((item) => item.period === period) ?? null;
  // While the other basis' months load, the previous ones stand in: no figures from the wrong basis.
  const switching = periods.isPlaceholderData;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Dropdown
          className="w-full sm:w-[26rem]"
          value={period ?? ""}
          onValueChange={setChosen}
          // Each basis has its own status: one can be closed while the other is still a draft.
          options={list.map((item) => ({ value: item.period, label: `${periodLabel(item.period)} · ${basesStatus(item)}` }))}
          placeholder="No hay meses para liquidar"
          disabled={list.length === 0}
          aria-label="Mes de la liquidación"
        />
        <BasisSwitch value={basis} onChange={setBasis} />
        {current && !switching && <MonthActions month={current} basis={basis} permissions={permissions} />}
      </div>
      {switching ? (
        <div className="h-96 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando la otra base de costo" />
      ) : (
        current && <MonthView key={`${current.period}-${basis}`} month={current} basis={basis} permissions={permissions} />
      )}
    </div>
  );
}

/** Seconds since `startedAt`, ticking while it is set, for the long calculations. */
function useElapsed(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  return startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
}

const ACTION_TEXT: Record<SettlementAction, { running: string; done: string }> = {
  recalculate: { running: "Calculando el mes", done: "Mes calculado" },
  close: { running: "Cerrando el mes", done: "Mes cerrado" },
  reopen: { running: "Reabriendo el mes", done: "Mes reabierto: vuelve a borrador" },
};

/**
 * Calculate (or recalculate) a draft, close a finished month, reopen a closed one, and the
 * month's workbook. Calculating reads the month from the DWH: 1 to 3 minutes, with the time
 * shown so nobody leaves thinking it froze.
 */
function MonthActions({
  month,
  basis,
  permissions,
}: {
  month: SettlementPeriod;
  basis: CostBasis;
  permissions: SettlementPermissions;
}) {
  const action = useSettlementAction();
  const [confirm, setConfirm] = useState<"close" | "reopen" | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  // Set when the proxy cut the request (504) and the action waits for the calculation to land.
  const [detached, setDetached] = useState(false);
  const running = action.isPending ? action.variables?.action ?? null : null;
  const long = running === "recalculate" || running === "close";
  const elapsed = useElapsed(long ? startedAt : null);
  const settlement = month.settlement;
  const closed = settlement?.status === "cerrado";
  const label = periodLabel(month.period);
  // The month being calculated, which may not be the one on screen if the selector changed.
  const runningLabel = action.variables ? periodLabel(action.variables.period) : label;
  const basisName = basisShort(basis).toLowerCase();

  const run = (kind: SettlementAction) => {
    setConfirm(null);
    setDetached(false);
    setStartedAt(Date.now());
    action.mutate(
      { action: kind, period: month.period, basis, since: settlement?.calculated_at ?? null, onDetached: () => setDetached(true) },
      {
        onSuccess: () =>
          toast.success(
            kind === "recalculate"
              ? `${ACTION_TEXT[kind].done}: ${label}, las bases de costo abiertas.`
              : `${ACTION_TEXT[kind].done}: ${label}, base ${basisName}.`
          ),
        onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
      }
    );
  };

  const download = async () => {
    setDownloading(true);
    try {
      await downloadSettlement(month.period, basis, null);
    } catch (failure) {
      toast.error(errorMessage(failure));
    } finally {
      setDownloading(false);
    }
  };

  // One calculation at a time, in any month: a second one would run after it and overwrite it.
  const busy = action.isPending;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {permissions.can_manage && !closed && (
          <Button
            variant={settlement ? "outline" : "primary"}
            onClick={() => run("recalculate")}
            disabled={busy}
            title="Lee el mes del DWH una vez y recalcula las dos bases de costo que no estén cerradas"
          >
            {settlement ? <RefreshCw aria-hidden="true" /> : <Calculator aria-hidden="true" />}
            {running === "recalculate" ? "Calculando" : settlement ? "Recalcular" : "Calcular"}
          </Button>
        )}
        {permissions.can_manage && settlement && !closed && month.is_finished && (
          <Button variant="primary" onClick={() => setConfirm("close")} disabled={busy}>
            <Lock aria-hidden="true" />
            {running === "close" ? "Cerrando" : "Cerrar mes"}
          </Button>
        )}
        {permissions.can_reopen && closed && (
          <Button variant="outline" onClick={() => setConfirm("reopen")} disabled={busy}>
            <LockOpen aria-hidden="true" />
            {running === "reopen" ? "Reabriendo" : "Reabrir"}
          </Button>
        )}
        {settlement && (
          <Button variant="outline" onClick={download} disabled={downloading}>
            <Download aria-hidden="true" />
            {downloading ? "Descargando" : "Excel del mes"}
          </Button>
        )}
      </div>

      {long && (
        <p role="status" className="w-full rounded-md bg-info-surface px-3 py-2 text-sm text-info">
          {ACTION_TEXT[running].running} {runningLabel}: se leen sus ventas del DWH y puede tardar de 1 a 3 minutos.{" "}
          {running === "recalculate" && "Se recalculan las dos bases de costo que no estén cerradas. "}
          {detached
            ? "La plataforma dejó de esperar la respuesta, pero el cálculo sigue: esta página revisa cada 15 segundos si ya terminó."
            : "No cierres esta página."}{" "}
          <span className="tabular-nums">
            ({Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")})
          </span>
        </p>
      )}

      <Dialog
        open={confirm !== null}
        onOpenChange={(next) => {
          if (!next) setConfirm(null);
        }}
        title={`${confirm === "reopen" ? "Reabrir" : "Cerrar"} ${label} · ${basisShort(basis)}`}
        description={
          confirm === "reopen"
            ? `Solo la base ${basisName} vuelve a borrador: se puede recalcular y sus cifras pueden cambiar hasta que se cierre otra vez. La otra base queda como está.`
            : `Solo se cierra la base ${basisName}: se calcula una última vez con lo que tenga el DWH y queda congelada. La otra base queda como está. Solo el líder de BI o un administrador la puede reabrir.`
        }
      >
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirm(null)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => confirm && run(confirm)}>
            {confirm === "reopen" ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
            {confirm === "reopen" ? "Reabrir el mes" : "Cerrar el mes"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

function MonthView({ month, basis, permissions }: { month: SettlementPeriod; basis: CostBasis; permissions: SettlementPermissions }) {
  const summary = useSettlementSummary(month.settlement ? month.period : null, basis);
  const [tab, setTab] = useState<Tab>("proveedores");
  const panelId = useId();

  if (!month.settlement) {
    return (
      <StatePanel icon={Calculator} title={`${periodLabel(month.period)} no se ha calculado con ${basisShort(basis).toLowerCase()}`}>
        {permissions.can_manage
          ? "Usa «Calcular» para leer las ventas del mes del DWH y aplicarles los apoyos del maestro."
          : "Cuando BI lo calcule, aquí verás lo que debe reconocer cada proveedor."}
      </StatePanel>
    );
  }
  if (summary.isPending) {
    return <div className="h-96 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando la liquidación del mes" />;
  }
  if (summary.isError) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se pudo cargar la liquidación del mes"
        action={
          <Button variant="outline" onClick={() => summary.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        }
      >
        {errorMessage(summary.error)}
      </StatePanel>
    );
  }

  const { settlement, suppliers } = summary.data;
  return (
    <div className="space-y-4">
      {month.is_current && (
        <p className="rounded-md bg-info-surface px-3 py-2 text-sm text-info">
          Mes en curso: es una vista previa con las ventas leídas hasta el último cálculo. Se liquida cuando el mes termine.
        </p>
      )}
      <Figures settlement={settlement} month={month} />
      <Stamps settlement={settlement} />

      <div role="tablist" aria-label="Vistas de la liquidación" className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border [&>button]:-mb-px [&>button]:shrink-0 max-md:[&>button]:min-h-11">
        {TABS.map((item) => (
          <ViewTab key={item.key} selected={tab === item.key} onSelect={() => setTab(item.key)} controls={panelId}>
            {item.label}
          </ViewTab>
        ))}
      </div>
      <div id={panelId} role="tabpanel" aria-label={TABS.find((item) => item.key === tab)?.label}>
        {tab === "proveedores" && <SuppliersTable period={month.period} basis={basis} rows={suppliers} />}
        {tab === "no-liquidados" && <UnsettledView period={month.period} basis={basis} suppliers={suppliers} />}
        {tab === "desglose" && <BreakdownView period={month.period} basis={basis} suppliers={suppliers} />}
      </div>
    </div>
  );
}

function Figure({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-surface px-4 py-3">
      <p className="text-[13px] text-text-secondary">{label}</p>
      <div className="mt-1 text-xl font-semibold tabular-nums">{children}</div>
      {hint && <p className="mt-0.5 text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}

/** What the month comes to: owed, calculated but not claimed, the sale, the margin it recomposes. */
function Figures({ settlement, month }: { settlement: Settlement; month: SettlementPeriod }) {
  const state = periodState(month);
  // The same month on the other basis, when it was calculated: the two totals side by side.
  const other = month.settlements?.find((entry) => entry.cost_basis !== settlement.cost_basis) ?? null;
  const suppliers = `${formatCount(settlement.suppliers)} ${settlement.suppliers === 1 ? "proveedor" : "proveedores"}`;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Figure
        label="Apoyo a reconocer"
        hint={other ? `${suppliers} · con ${basisShort(other.cost_basis).toLowerCase()}: ${formatPesos(other.amount)}` : suppliers}
      >
        {formatPesos(settlement.amount)}
      </Figure>
      <Figure label="Calculado no cobrado" hint="En revisión, con escalas, mínimo no cumplido…">
        <span className={cn(Number(settlement.flagged_amount) !== 0 && "text-warning")}>{formatPesos(settlement.flagged_amount)}</span>
      </Figure>
      <Figure label="Venta de referencias apoyadas" hint={`${formatCount(settlement.supported_lines)} líneas apoyadas`}>
        {formatPesos(settlement.net)}
      </Figure>
      <Figure label="Margen → recompuesto" hint="Con el apoyo del proveedor sumado">
        <MarginShift margin={settlement.margin} recomposed={settlement.recomposed_margin} />
      </Figure>
      <Figure label="Estado" hint={settlement.cost_basis_label}>
        <Badge tone={state.tone} className="text-sm">
          {settlement.status_label}
        </Badge>
      </Figure>
    </div>
  );
}

/** Who calculated, closed and reopened the month, in Bogotá's time. */
function Stamps({ settlement }: { settlement: Settlement }) {
  const parts = [
    `Calculado el ${formatMoment(settlement.calculated_at)} por ${settlement.calculated_by}`,
    settlement.closed_at && `cerrado el ${formatMoment(settlement.closed_at)}${settlement.closed_by ? ` por ${settlement.closed_by}` : ""}`,
    settlement.reopened_at && `reabierto el ${formatMoment(settlement.reopened_at)}${settlement.reopened_by ? ` por ${settlement.reopened_by}` : ""}`,
    `${formatCount(settlement.sales_read)} ventas leídas`,
  ].filter(Boolean);
  return <p className="text-xs text-text-secondary">{parts.join(" · ")}</p>;
}
