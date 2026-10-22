"use client";

import { useId, useState } from "react";
import { ChevronDown, FileSearch, SearchX } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DateRangePicker, type IsoDateRange } from "@/shared/components/ui/date-range-picker";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { cn } from "@/shared/lib/utils";

import { useExtractions, useFreshness, useSequences } from "../hooks/use-dwh-monitoring";
import {
  bogotaDay,
  formatDuration,
  formatNumber,
  formatWhen,
  formatWindow,
  reconciliationStatus,
  triggerLabel,
  TRIGGER_LABELS,
} from "../lib/format";
import type { Disparo, EstadoRun, Extraccion } from "../types/dwh-monitoring.types";
import { LoadError, PageHeader, RunStatusBadge, TableSkeleton } from "./parts";
import SyncStatus from "./sync-status";

const PAGE_SIZE = 50;

const STATES: { value: string; label: string }[] = [
  { value: "", label: "Todos los estados" },
  { value: "failed", label: "Fallidas" },
  { value: "running", label: "En curso" },
  { value: "success", label: "Exitosas" },
  { value: "orphaned", label: "Huérfanas" },
];

const TRIGGERS: { value: string; label: string }[] = [
  { value: "", label: "Cualquier disparo" },
  ...Object.entries(TRIGGER_LABELS).map(([value, label]) => ({ value, label })),
];

interface Filters {
  range: IsoDateRange;
  secuencia: string;
  dominio: string;
  estado: string;
  disparo: string;
}

const EMPTY: Filters = { range: {}, secuencia: "", dominio: "", estado: "", disparo: "" };

const thead = "bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary";

/**
 * Every extraction the warehouse ran, newest first: what it read and loaded,
 * whether the counts reconcile, and the error when it failed. Without dates
 * the API looks at the last 7 days, and the picker says so.
 */
export default function ExtractionsBrowser() {
  const id = useId();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const q = useDebouncedValue(search.trim());
  const sequences = useSequences();
  const freshness = useFreshness();

  const extractions = useExtractions({
    desde: filters.range.from,
    hasta: filters.range.to,
    secuencia: filters.secuencia || undefined,
    dominio: filters.dominio || undefined,
    estado: filters.estado ? [filters.estado as EstadoRun] : [],
    disparo: (filters.disparo || undefined) as Disparo | undefined,
    q: q || undefined,
    page,
    size: PAGE_SIZE,
  });
  const result = extractions.data;
  const rows = result?.items ?? [];

  // Filtering starts over at the first page (DESIGN.md §7.3).
  const update = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };
  const filtered = JSON.stringify(filters) !== JSON.stringify(EMPTY) || q !== "";
  const clear = () => {
    setFilters(EMPTY);
    setSearch("");
    setPage(1);
  };
  const toggle = (runId: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });

  const sequenceOptions = [
    { value: "", label: "Todas las secuencias" },
    ...(sequences.data?.items ?? []).map((row) => ({ value: row.secuencia, label: row.secuencia })),
  ];
  const domainOptions = [
    { value: "", label: "Todos los dominios" },
    ...(freshness.data?.dominios ?? []).map((row) => ({ value: row.dominio, label: row.dominio })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extracciones"
        description="Auditoría de cada extracción del DWH: qué tabla, cuántas filas leyó y cargó, si cuadra con el origen y el error cuando falló."
        aside={<SyncStatus />}
      />

      <form
        role="search"
        aria-label="Filtros de extracciones"
        onSubmit={(event) => event.preventDefault()}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <Filter id={`${id}-range`} label="Fechas">
          <DateRangePicker
            id={`${id}-range`}
            label="Fechas"
            value={filters.range}
            max={bogotaDay()}
            placeholder="Últimos 7 días"
            onChange={(range) => update({ range })}
          />
        </Filter>
        <Filter id={`${id}-sequence`} label="Secuencia">
          <Dropdown
            id={`${id}-sequence`}
            aria-label="Secuencia"
            value={filters.secuencia}
            onValueChange={(secuencia) => update({ secuencia })}
            options={sequenceOptions}
            className="max-md:[&_[data-slot=dropdown-trigger]]:h-11"
          />
        </Filter>
        <Filter id={`${id}-domain`} label="Dominio">
          <Dropdown
            id={`${id}-domain`}
            aria-label="Dominio"
            value={filters.dominio}
            onValueChange={(dominio) => update({ dominio })}
            options={domainOptions}
            className="max-md:[&_[data-slot=dropdown-trigger]]:h-11"
          />
        </Filter>
        <Filter id={`${id}-state`} label="Estado">
          <Dropdown
            id={`${id}-state`}
            aria-label="Estado"
            value={filters.estado}
            onValueChange={(estado) => update({ estado })}
            options={STATES}
            className="max-md:[&_[data-slot=dropdown-trigger]]:h-11"
          />
        </Filter>
        <Filter id={`${id}-trigger`} label="Disparo">
          <Dropdown
            id={`${id}-trigger`}
            aria-label="Disparo"
            value={filters.disparo}
            onValueChange={(disparo) => update({ disparo })}
            options={TRIGGERS}
            className="max-md:[&_[data-slot=dropdown-trigger]]:h-11"
          />
        </Filter>
        <Filter id={`${id}-q`} label="Tabla o pipeline">
          <Input
            id={`${id}-q`}
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="f202_proveedores"
            className="max-md:h-11"
          />
        </Filter>
      </form>

      {extractions.isPending ? (
        <TableSkeleton label="Cargando extracciones" rows={8} />
      ) : extractions.isError && !result ? (
        <LoadError error={extractions.error} onRetry={() => extractions.refetch()} what="las extracciones" />
      ) : rows.length === 0 ? (
        filtered ? (
          <StatePanel
            icon={SearchX}
            title="Ninguna extracción con estos filtros"
            action={
              <Button variant="outline" onClick={clear} className="max-md:h-11">
                Limpiar filtros
              </Button>
            }
          >
            Amplía las fechas o quita algún filtro.
          </StatePanel>
        ) : (
          <StatePanel icon={FileSearch} title="Sin extracciones en los últimos 7 días">
            Aparecen cuando el DWH extraiga y la plataforma copie su auditoría. Elige fechas anteriores para ver el historial.
          </StatePanel>
        )
      ) : (
        <div className="space-y-3">
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Auditoría de extracciones</caption>
              <thead className={thead}>
                <tr>
                  <th scope="col" className="px-3 py-2">Tabla</th>
                  <th scope="col" className="px-3 py-2">Estado</th>
                  <th scope="col" className="px-3 py-2 text-right">Inicio · duración</th>
                  <th scope="col" className="px-3 py-2 text-right">Filas extraídas · cargadas</th>
                  <th scope="col" className="px-3 py-2">Conciliación</th>
                  <th scope="col" className="hidden px-3 py-2 xl:table-cell">Secuencia · disparo</th>
                </tr>
              </thead>
              {rows.map((row) => {
                const expanded = open.has(row.run_id);
                const panelId = `extraction-${row.run_id}`;
                return (
                  <tbody key={row.run_id} className="border-t border-border first:border-t-0">
                    <tr className={cn("hover:bg-primary-subtle", expanded && "bg-primary-subtle")}>
                      <td className="max-w-80 px-3 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => toggle(row.run_id)}
                          aria-expanded={expanded}
                          aria-controls={panelId}
                          className="flex min-w-0 items-start gap-1 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <ChevronDown
                            className={cn("mt-0.5 size-4 shrink-0 text-text-secondary transition-transform duration-150", !expanded && "-rotate-90")}
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-mono text-[13px]">{row.tabla ?? row.pipeline_name ?? "—"}</span>
                            <span className="block text-[13px] text-text-secondary">{row.dominio ?? "Sin dominio"}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <RunStatusBadge status={row.estado} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right align-top tabular-nums">
                        {formatWhen(row.inicio)}
                        <span className="block text-[13px] text-text-secondary">{formatDuration(row.duracion_s)}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right align-top tabular-nums">
                        {formatNumber(row.filas_extraidas)}
                        <span className="text-text-secondary"> · {formatNumber(row.filas_cargadas)}</span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Reconciliation value={row.conciliacion} />
                      </td>
                      <td className="hidden px-3 py-2 align-top xl:table-cell">
                        <span className="block font-mono text-[13px]">{row.secuencia ?? "—"}</span>
                        <span className="block text-[13px] text-text-secondary">{triggerLabel(row.disparo)}</span>
                      </td>
                    </tr>
                    {expanded && (
                      <tr id={panelId}>
                        <td colSpan={7} className="bg-canvas-subtle p-0">
                          <Details row={row} />
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
            </table>
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
            {rows.map((row) => {
              const expanded = open.has(row.run_id);
              const panelId = `extraction-m-${row.run_id}`;
              return (
                <li key={row.run_id}>
                  <button
                    type="button"
                    onClick={() => toggle(row.run_id)}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    className="flex min-h-14 w-full flex-col gap-1.5 px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex w-full items-start justify-between gap-3">
                      <span className="min-w-0 break-all font-mono text-[13px]">{row.tabla ?? row.pipeline_name ?? "—"}</span>
                      <RunStatusBadge status={row.estado} />
                    </span>
                    <span className="flex w-full items-center justify-between gap-3 text-[13px] tabular-nums text-text-secondary">
                      <span>
                        {formatWhen(row.inicio)} · {formatNumber(row.filas_cargadas)} filas
                      </span>
                      <ChevronDown className={cn("size-4 shrink-0 transition-transform duration-150", expanded && "rotate-180")} aria-hidden="true" />
                    </span>
                  </button>
                  {expanded && (
                    <div id={panelId} className="bg-canvas-subtle">
                      <Details row={row} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {formatNumber(result.total)} {result.total === 1 ? "extracción" : "extracciones"}
                {!filters.range.from && " en los últimos 7 días"}
              </span>
              <Pager page={result.page} size={result.size} total={result.total} count={rows.length} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Filter({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function Reconciliation({ value }: { value: string | null }) {
  const status = reconciliationStatus(value);
  return status ? <Badge tone={status.tone}>{status.label}</Badge> : <span className="text-text-secondary">—</span>;
}

/** Everything else the audit keeps about one extraction, for when something went wrong. */
function Details({ row }: { row: Extraccion }) {
  const facts: [string, React.ReactNode][] = [
    ["Secuencia", <span key="s" className="font-mono text-[13px]">{row.secuencia ?? "—"}</span>],
    ["Pipeline", <span key="p" className="break-all font-mono text-[13px]">{row.pipeline_name ?? "—"}</span>],
    ["Estrategia", row.estrategia ?? "—"],
    ["Fin", <span key="f" className="tabular-nums">{formatWhen(row.fin)}</span>],
    ["Filas origen · esperadas", <span key="o" className="tabular-nums">{formatNumber(row.filas_origen)} · {formatNumber(row.filas_esperadas)}</span>],
    ["Conciliación", <Reconciliation key="c" value={row.conciliacion} />],
    ["Páginas", <span key="pg" className="tabular-nums">{formatNumber(row.paginas)}</span>],
    ["Ventana", <span key="v" className="font-mono text-[13px]">{formatWindow(row.ventana_desde)} → {formatWindow(row.ventana_hasta)}</span>],
    ["Disparo", triggerLabel(row.disparo)],
    ["Cancelada por", row.cancelada_por ?? "—"],
    ["Equipo", <span key="h" className="break-all font-mono text-[13px]">{row.os_hostname ? `${row.os_hostname}${row.os_pid ? ` · pid ${row.os_pid}` : ""}` : "—"}</span>],
    ["Run", <span key="r" className="break-all font-mono text-[13px]">{row.run_id}</span>],
    ["Lote", <span key="b" className="break-all font-mono text-[13px]">{row.batch_id ?? "—"}</span>],
  ];
  return (
    <div className="space-y-3 px-4 py-3">
      {row.error && (
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-danger">Error</p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface p-3 font-mono text-[13px] text-text-primary">
            {row.error}
          </pre>
        </div>
      )}
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0 space-y-0.5">
            <dt className="text-[13px] text-text-secondary">{label}</dt>
            <dd className="text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
