"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, CloudOff } from "lucide-react";

import PageHeader from "@/shared/components/page-header";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useIndicators, usePlanCatalog } from "../hooks/use-action-plans";
import { usePlanLabels } from "../hooks/use-plan-labels";
import type { PlanFilters } from "../types/action-plans.types";

const number = new Intl.NumberFormat("es-CO");
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

interface Bar {
  key: string;
  label: string;
  value: number;
}

/**
 * The «Indicador» sheet of the Excel: how many actions there are by type,
 * status, effectiveness, origin, process, month and city, and how the activities
 * stand. Each chart is a list of bars with its number written next to it, so
 * the figure never depends on seeing the bar.
 */
export default function PlanIndicators({ area }: { area: string }) {
  const labels = usePlanLabels();
  const catalog = usePlanCatalog();
  useBreadcrumbLabel(`/${area}/planes-accion/indicadores`, "Indicadores");
  const [filters, setFilters] = useState<PlanFilters>({});
  const data = useIndicators(filters);
  const year = new Date().getFullYear();

  const heading = (
    <div className="space-y-3">
      <Link href={`/${area}/planes-accion`} className="inline-flex items-center gap-1.5 rounded-sm text-sm text-text-secondary hover:text-text-primary max-md:min-h-11">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a la matriz
      </Link>
      <PageHeader
        title="Indicadores"
        description="La hoja «Indicador» del P.04.F.02: acciones y actividades por tipo, estado, eficacia, origen, procedencia, mes y ciudad."
        aside={
          <div className="flex flex-wrap gap-2">
            <Dropdown
              aria-label="Año"
              placeholder="Todos los años"
              clearable
              clearLabel="Quitar el año"
              value={filters.year ? String(filters.year) : ""}
              onValueChange={(value) => setFilters((current) => ({ ...current, year: value ? Number(value) : undefined }))}
              options={[year, year - 1, year - 2, year - 3].map((value) => ({ value: String(value), label: String(value) }))}
              className="w-44 max-md:h-11"
            />
            <Dropdown
              aria-label="Origen"
              placeholder="Todos los orígenes"
              clearable
              clearLabel="Quitar el origen"
              value={filters.origin ?? ""}
              onValueChange={(value) => setFilters((current) => ({ ...current, origin: value || undefined }))}
              options={(catalog.data?.origins ?? []).map((option) => ({ value: option.value, label: option.label }))}
              className="w-56 max-md:h-11"
            />
          </div>
        }
      />
    </div>
  );

  if (data.isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        {heading}
        <span className="sr-only">Cargando los indicadores</span>
        <div className="h-64 animate-pulse rounded-lg bg-canvas-subtle" />
      </div>
    );
  }
  if (data.isError) {
    return (
      <div className="space-y-6">
        {heading}
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se cargaron los indicadores"
          action={
            <Button variant="outline" onClick={() => data.refetch()}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(data.error)}
        </StatePanel>
      </div>
    );
  }

  const stats = data.data;
  if (stats.actions === 0) {
    return (
      <div className="space-y-6">
        {heading}
        <StatePanel icon={BarChart3} title="Sin acciones para estos filtros">
          Cuando haya acciones registradas, aquí se cuentan.
        </StatePanel>
      </div>
    );
  }

  const bars = (counts: Record<string, number>, text: (key: string) => string, order?: string[]): Bar[] =>
    Object.entries(counts)
      .map(([key, value]) => ({ key, label: text(key), value }))
      .sort((a, b) => (order ? order.indexOf(a.key) - order.indexOf(b.key) : b.value - a.value));

  const months = Object.entries(stats.by_month)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, label: `${MONTHS[Number(key.slice(5, 7)) - 1] ?? key.slice(5)} ${key.slice(2, 4)}`, value }));

  const donePct = stats.activities > 0 ? Math.round((stats.activities_done / stats.activities) * 100) : 0;

  return (
    <div className="space-y-8">
      {heading}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Acciones" value={stats.actions} />
        <Stat label="Actividades" value={stats.activities} />
        <Stat label="Realizadas" value={stats.activities_done} note={`${donePct} % de las actividades`} />
        <Stat label="Vencidas" value={stats.overdue_activities} tone={stats.overdue_activities > 0 ? "danger" : undefined} note="Sin realizar y pasadas de fecha" />
      </dl>

      <div className="grid gap-8 lg:grid-cols-2">
        <Chart title="Por tipo de acción" bars={bars(stats.by_type, labels.action_types)} />
        <Chart title="Por estado" bars={bars(stats.by_status, labels.statuses, ["abierta", "en_proceso", "cerrada"])} />
        <Chart title="Eficacia de las acciones" bars={bars(stats.by_effectiveness, labels.effectiveness, ["si", "no", "pendiente"])} />
        <Chart title="Eficacia de las actividades" bars={bars(stats.activities_effective, labels.effectiveness, ["si", "no", "pendiente"])} />
        <Chart title="Por origen" bars={bars(stats.by_origin, labels.origins)} />
        <Chart title="Por procedencia" bars={bars(stats.by_process, (key) => key)} />
      </div>

      <Columns title="Acciones por mes" bars={months} />
      <Chart title="Por ciudad" bars={bars(stats.by_city, (key) => key)} />
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: number; note?: string; tone?: "danger" }) {
  return (
    <div className="space-y-0.5 rounded-lg border border-border p-3">
      <dt className="text-[13px] text-text-secondary">{label}</dt>
      <dd className={cn("tabular text-2xl font-semibold", tone === "danger" && "text-danger")}>{number.format(value)}</dd>
      {note && <p className="text-[13px] text-text-secondary">{note}</p>}
    </div>
  );
}

/** Horizontal bars, longest first: the label, the bar and the number, in one row each. */
function Chart({ title, bars }: { title: string; bars: Bar[] }) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const total = bars.reduce((sum, bar) => sum + bar.value, 0);
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {bars.length === 0 ? (
        <p className="text-sm text-text-secondary">Sin datos.</p>
      ) : (
        <ul className="space-y-2">
          {bars.map((bar) => (
            <li key={bar.key} className="grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-3 text-sm">
              <span className="min-w-0 truncate" title={bar.label}>
                {bar.label || "Sin dato"}
              </span>
              <span className="h-2.5 rounded-full bg-canvas-subtle" aria-hidden="true">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, (bar.value / max) * 100)}%` }} />
              </span>
              <span className="tabular w-24 text-right whitespace-nowrap">
                {number.format(bar.value)}
                <span className="text-[13px] text-text-secondary"> · {Math.round((bar.value / total) * 100)}%</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Months run left to right; the number sits over each column so it can be read without the scale. */
function Columns({ title, bars }: { title: string; bars: Bar[] }) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {bars.length === 0 ? (
        <p className="text-sm text-text-secondary">Sin datos.</p>
      ) : (
        <div className="overflow-x-auto pb-1">
          <ul className="flex min-w-max items-end gap-2" style={{ height: "10rem" }}>
            {bars.map((bar) => (
              <li key={bar.key} className="flex h-full w-11 flex-col justify-end gap-1 text-center">
                <span className="tabular text-[13px]">{number.format(bar.value)}</span>
                <span aria-hidden="true" className="block rounded-t-sm bg-primary" style={{ height: `${Math.max(4, (bar.value / max) * 100)}%` }} />
                <span className="text-[13px] whitespace-nowrap text-text-secondary">{bar.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
