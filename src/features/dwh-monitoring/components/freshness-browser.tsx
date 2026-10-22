"use client";

import { useId, useState } from "react";
import { CheckCircle2, SearchX } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { cn } from "@/shared/lib/utils";

import { useFreshness, useFreshnessTables } from "../hooks/use-dwh-monitoring";
import { formatDuration, formatNumber, formatPct, formatWhen, freshnessStatus } from "../lib/format";
import type { EstadoFrescura, FrescuraDominio, FrescuraResumen, FrescuraTabla, Programacion } from "../types/dwh-monitoring.types";
import { LoadError, NoLoadYet, PageHeader, TableSkeleton } from "./parts";
import SyncStatus from "./sync-status";

/** The list opens on what needs attention; the rest is one choice away. */
const STATE_FILTERS: { value: string; label: string; estados: EstadoFrescura[] }[] = [
  { value: "pendientes", label: "Atrasadas y nunca extraídas", estados: ["Atrasada", "Nunca extraída"] },
  { value: "Atrasada", label: "Atrasadas", estados: ["Atrasada"] },
  { value: "Nunca extraída", label: "Nunca extraídas", estados: ["Nunca extraída"] },
  { value: "Fresca", label: "Frescas", estados: ["Fresca"] },
  { value: "Deshabilitada", label: "Deshabilitadas", estados: ["Deshabilitada"] },
  { value: "todas", label: "Todas", estados: [] },
];

const PROGRAMMING: { value: string; label: string }[] = [
  { value: "", label: "Toda programación" },
  { value: "Secuencia", label: "En una secuencia" },
  { value: "Sin programación", label: "Sin programación" },
];

const thead = "bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary";

/**
 * How current the warehouse is: the KPI, the breakdown by domain, and the
 * tables that are late. A table's last good extraction is its last
 * modification, and its age is weighed against the staleness it allows.
 */
export default function FreshnessBrowser() {
  const freshness = useFreshness();
  const [domain, setDomain] = useState("");
  const data = freshness.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Frescura"
        description="Qué tan al día está cada tabla del DWH: cuándo se extrajo bien por última vez y si ya pasó el atraso que admite."
        aside={<SyncStatus />}
      />

      {freshness.isPending ? (
        <TableSkeleton label="Cargando la frescura" />
      ) : freshness.isError && !data ? (
        <LoadError error={freshness.error} onRetry={() => freshness.refetch()} what="la frescura" />
      ) : data && !data.resumen && data.dominios.length === 0 ? (
        <NoLoadYet enabled />
      ) : data ? (
        <>
          {data.resumen && <Summary summary={data.resumen} />}
          <Domains rows={data.dominios} selected={domain} onSelect={setDomain} />
          <LateTables domains={data.dominios} domain={domain} onDomainChange={setDomain} />
        </>
      ) : null}
    </div>
  );
}

function Summary({ summary }: { summary: FrescuraResumen }) {
  return (
    <dl className="grid divide-y divide-border rounded-lg border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div className="flex flex-col gap-1 px-4 py-3">
        <dt className="text-[13px] text-text-secondary">Tablas programadas frescas</dt>
        <dd className="text-xl font-semibold tabular-nums">{formatPct(summary.pct_fresca_programadas)}</dd>
        <dd className="text-[13px] tabular-nums text-text-secondary">
          {formatNumber(summary.frescas_programadas)} de {formatNumber(summary.tablas_programadas)}
        </dd>
      </div>
      <div className="flex flex-col gap-1 px-4 py-3">
        <dt className="text-[13px] text-text-secondary">Todas las habilitadas</dt>
        <dd className="text-xl font-semibold tabular-nums">{formatPct(summary.pct_fresca_total)}</dd>
        <dd className="text-[13px] tabular-nums text-text-secondary">
          {formatNumber(summary.frescas_total)} de {formatNumber(summary.tablas_habilitadas)} ·{" "}
          {formatNumber(summary.tablas_deshabilitadas)} deshabilitadas
        </dd>
      </div>
      <div className="flex flex-col gap-1 px-4 py-3">
        <dt className="text-[13px] text-text-secondary">Atrasadas · nunca extraídas</dt>
        <dd className="text-xl font-semibold tabular-nums">
          {formatNumber(summary.atrasadas)} · {formatNumber(summary.nunca_extraidas)}
        </dd>
        <dd className="text-[13px] tabular-nums text-text-secondary">
          Calculado {formatWhen(summary.calculado_en)} · última extracción {formatWhen(summary.ultima_extraccion_ok)}
        </dd>
      </div>
    </dl>
  );
}

/** A domain's name filters the list below to it; the table stays a table, not a grid of cards. */
function Domains({ rows, selected, onSelect }: { rows: FrescuraDominio[]; selected: string; onSelect: (domain: string) => void }) {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => (a.pct_fresca ?? 101) - (b.pct_fresca ?? 101) || a.dominio.localeCompare(b.dominio));
  return (
    <section aria-labelledby="dwh-domains" className="space-y-3">
      <div className="space-y-0.5">
        <h2 id="dwh-domains" className="text-xl font-semibold tracking-tight">
          Por dominio
        </h2>
        <p className="text-[13px] text-text-secondary">Los menos frescos primero. Elige un dominio para ver solo sus tablas abajo.</p>
      </div>
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Frescura por dominio</caption>
          <thead className={thead}>
            <tr>
              <th scope="col" className="px-3 py-2">Dominio</th>
              <th scope="col" className="px-3 py-2 text-right">% fresca</th>
              <th scope="col" className="px-3 py-2 text-right">Frescas</th>
              <th scope="col" className="px-3 py-2 text-right">Atrasadas</th>
              <th scope="col" className="px-3 py-2 text-right">Nunca extraídas</th>
              <th scope="col" className="hidden px-3 py-2 text-right xl:table-cell">Programadas</th>
              <th scope="col" className="px-3 py-2 text-right">Última extracción buena</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((row) => (
              <tr
                key={row.dominio}
                className={cn("hover:bg-primary-subtle", selected === row.dominio && "bg-primary-subtle shadow-[inset_2px_0_0_var(--primary)]")}
              >
                <td className="px-3 py-1.5">
                  <DomainButton domain={row.dominio} selected={selected === row.dominio} onSelect={onSelect} />
                </td>
                <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatPct(row.pct_fresca)}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
                  {formatNumber(row.frescas)}
                  <span className="text-text-secondary"> de {formatNumber(row.tablas)}</span>
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(row.atrasadas)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(row.nunca_extraidas)}</td>
                <td className="hidden px-3 py-1.5 text-right tabular-nums xl:table-cell">{formatNumber(row.programadas)}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{formatWhen(row.ultima_extraccion_ok)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
        {sorted.map((row) => (
          <li
            key={row.dominio}
            className={cn("flex items-center justify-between gap-3 px-3 py-1", selected === row.dominio && "bg-primary-subtle")}
          >
            <DomainButton domain={row.dominio} selected={selected === row.dominio} onSelect={onSelect} />
            <span className="text-right text-sm tabular-nums">
              <span className="font-semibold">{formatPct(row.pct_fresca)}</span>
              <span className="block text-[13px] text-text-secondary">
                {formatNumber(row.atrasadas)} atrasadas · {formatNumber(row.nunca_extraidas)} nunca
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DomainButton({ domain, selected, onSelect }: { domain: string; selected: boolean; onSelect: (domain: string) => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(selected ? "" : domain)}
      className="min-h-8 rounded-sm text-left font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
    >
      {domain}
    </button>
  );
}

function LateTables({
  domains,
  domain,
  onDomainChange,
}: {
  domains: FrescuraDominio[];
  domain: string;
  onDomainChange: (domain: string) => void;
}) {
  const id = useId();
  const [state, setState] = useState("pendientes");
  const [programming, setProgramming] = useState("");
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim());
  const estados = STATE_FILTERS.find((option) => option.value === state)?.estados ?? [];
  const tables = useFreshnessTables({
    estado: estados,
    dominio: domain || undefined,
    programacion: (programming || undefined) as Programacion | undefined,
    q: q || undefined,
  });
  const rows = tables.data?.items ?? [];
  const filtered = state !== "pendientes" || domain !== "" || programming !== "" || q !== "";
  const clear = () => {
    setState("pendientes");
    setProgramming("");
    setSearch("");
    onDomainChange("");
  };

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-3">
      <div className="space-y-0.5">
        <h2 id={`${id}-title`} className="text-xl font-semibold tracking-tight">
          Tablas
        </h2>
        <p className="text-[13px] text-text-secondary">
          La edad cuenta desde la última extracción buena; el límite es el atraso máximo que admite cada tabla.
        </p>
      </div>

      <form
        role="search"
        aria-label="Filtros de tablas"
        onSubmit={(event) => event.preventDefault()}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <div className="space-y-1.5">
          <label htmlFor={`${id}-state`} className="block text-[13px] font-medium">
            Estado
          </label>
          <Dropdown
            id={`${id}-state`}
            aria-label="Estado de frescura"
            value={state}
            onValueChange={setState}
            options={STATE_FILTERS}
            className="max-md:[&_[data-slot=dropdown-trigger]]:h-11"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${id}-domain`} className="block text-[13px] font-medium">
            Dominio
          </label>
          <Dropdown
            id={`${id}-domain`}
            aria-label="Dominio"
            value={domain}
            onValueChange={onDomainChange}
            options={[{ value: "", label: "Todos los dominios" }, ...domains.map((row) => ({ value: row.dominio, label: row.dominio }))]}
            className="max-md:[&_[data-slot=dropdown-trigger]]:h-11"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${id}-programming`} className="block text-[13px] font-medium">
            Programación
          </label>
          <Dropdown
            id={`${id}-programming`}
            aria-label="Programación"
            value={programming}
            onValueChange={setProgramming}
            options={PROGRAMMING}
            className="max-md:[&_[data-slot=dropdown-trigger]]:h-11"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${id}-q`} className="block text-[13px] font-medium">
            Buscar tabla
          </label>
          <Input
            id={`${id}-q`}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="f202_proveedores"
            className="max-md:h-11"
          />
        </div>
      </form>

      {tables.isPending ? (
        <TableSkeleton label="Cargando tablas" />
      ) : tables.isError && !tables.data ? (
        <LoadError error={tables.error} onRetry={() => tables.refetch()} what="las tablas" />
      ) : rows.length === 0 ? (
        state === "pendientes" && !filtered ? (
          <StatePanel icon={CheckCircle2} title="Ninguna tabla atrasada">
            Todas las tablas programadas se extrajeron dentro del atraso que admiten.
          </StatePanel>
        ) : (
          <StatePanel
            icon={SearchX}
            title="Ninguna tabla con estos filtros"
            action={
              <Button variant="outline" onClick={clear} className="max-md:h-11">
                Limpiar filtros
              </Button>
            }
          >
            Cambia el estado, el dominio o la búsqueda.
          </StatePanel>
        )
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Frescura por tabla</caption>
              <thead className={thead}>
                <tr>
                  <th scope="col" className="px-3 py-2">Tabla</th>
                  <th scope="col" className="px-3 py-2">Estado</th>
                  <th scope="col" className="px-3 py-2 text-right">Última modificación</th>
                  <th scope="col" className="px-3 py-2 text-right">Edad · límite</th>
                  <th scope="col" className="hidden px-3 py-2 xl:table-cell">Secuencias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.pipeline_name} className="hover:bg-primary-subtle">
                    <td className="max-w-80 px-3 py-2 align-top">
                      <span className="block font-mono text-[13px]">{row.tabla ?? row.pipeline_name}</span>
                      <span className="block text-[13px] text-text-secondary">
                        {[row.dominio, row.estrategia].filter(Boolean).join(" · ")}
                      </span>
                    </td>
                    <td className="max-w-72 px-3 py-2 align-top">
                      <FreshnessBadge row={row} />
                      {row.motivo_deshabilitada && (
                        <span className="mt-1 block text-[13px] text-text-secondary">{row.motivo_deshabilitada}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right align-top tabular-nums">{formatWhen(row.ultima_extraccion_ok)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right align-top tabular-nums">
                      {formatDuration(row.edad_s)}
                      <span className="text-text-secondary"> · {formatDuration(row.max_staleness_s)}</span>
                    </td>
                    <td className="hidden max-w-60 px-3 py-2 align-top xl:table-cell">
                      {row.secuencias ? (
                        <span className="font-mono text-[13px]">{row.secuencias}</span>
                      ) : (
                        <span className="text-text-secondary">{row.programacion ?? "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
            {rows.map((row) => (
              <li key={row.pipeline_name} className="space-y-1.5 px-3 py-3">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-all font-mono text-[13px]">{row.tabla ?? row.pipeline_name}</span>
                  <FreshnessBadge row={row} />
                </span>
                <span className="block text-[13px] tabular-nums text-text-secondary">
                  Modificada {formatWhen(row.ultima_extraccion_ok)} · edad {formatDuration(row.edad_s)} de{" "}
                  {formatDuration(row.max_staleness_s)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs tabular-nums text-text-secondary">
            {formatNumber(rows.length)} {rows.length === 1 ? "tabla" : "tablas"}
          </p>
        </>
      )}
    </section>
  );
}

function FreshnessBadge({ row }: { row: FrescuraTabla }) {
  const { label, tone } = freshnessStatus(row.estado_frescura);
  return <Badge tone={tone}>{label}</Badge>;
}
