"use client";

import Link from "next/link";
import { ArrowLeft, SearchX, Table2 } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { ApiError } from "@/shared/lib/api-client";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useSequence } from "../hooks/use-dwh-monitoring";
import {
  currentEta,
  dwhPath,
  formatDuration,
  formatNumber,
  formatPct,
  formatTimeOfDay,
  formatWhen,
  runStatus,
  scheduleStatus,
} from "../lib/format";
import type { Estadistica, HorarioTipico, SecuenciaDetalle, SecuenciaTabla } from "../types/dwh-monitoring.types";
import { LoadError, MeasuredRuns, ReadyTime, RunStatusBadge, TableSkeleton } from "./parts";
import SyncStatus from "./sync-status";

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

/** One sequence: where it stands, its typical day, what feeds its ETA and every table it extracts. */
export default function SequenceDetail({ area, secuencia }: { area: string; secuencia: string }) {
  const sequence = useSequence(secuencia);
  // The crumb shows the name as the warehouse writes it, not capitalised from the URL.
  useBreadcrumbLabel(dwhPath(area, `secuencias/${encodeURIComponent(secuencia)}`), secuencia);
  const back = (
    <Link
      href={dwhPath(area, "secuencias")}
      className="inline-flex items-center gap-1.5 rounded-sm text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver a las secuencias
    </Link>
  );

  if (sequence.isPending) {
    return (
      <div className="space-y-6">
        {back}
        <TableSkeleton label="Cargando la secuencia" rows={8} />
      </div>
    );
  }
  if (sequence.isError && !sequence.data) {
    const missing = sequence.error instanceof ApiError && sequence.error.status === 404;
    return (
      <div className="space-y-6">
        {back}
        {missing ? (
          <StatePanel icon={SearchX} title={`No existe la secuencia ${secuencia}`}>
            El DWH no tiene una secuencia con ese nombre. Puede que la hayan renombrado o retirado.
          </StatePanel>
        ) : (
          <LoadError error={sequence.error} onRetry={() => sequence.refetch()} what="la secuencia" />
        )}
      </div>
    );
  }

  const data = sequence.data!;
  const schedule = scheduleStatus(data.estado_programacion);
  return (
    <div className="space-y-6">
      {back}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="break-all font-mono text-2xl font-semibold tracking-tight">{data.secuencia}</h1>
          {data.descripcion && <p className="max-w-prose text-sm text-text-secondary">{data.descripcion}</p>}
          <p className="flex flex-wrap items-center gap-1.5 pt-1">
            <Badge tone={schedule.tone}>{schedule.label}</Badge>
            {data.en_curso ? <RunStatusBadge status="running" /> : null}
          </p>
        </div>
        <SyncStatus />
      </div>

      <Facts data={data} />
      <TypicalDay rows={data.horario} />
      <Statistics stats={data.estadisticas} />
      <Tables rows={data.tablas} />
    </div>
  );
}

function Facts({ data }: { data: SecuenciaDetalle }) {
  const last = runStatus(data.ultima_estado);
  const items: { label: string; value: React.ReactNode }[] = [
    {
      label: "Programación",
      value: (
        <>
          <span className="tabular-nums">{formatTimeOfDay(data.hora_inicio)}</span>
          {data.calendario && <span className="block font-mono text-[13px] text-text-secondary">{data.calendario}</span>}
        </>
      ),
    },
    { label: "Tope de duración", value: formatDuration(data.tope_s) },
    {
      label: "Última corrida",
      value: (
        <>
          <Badge tone={last.tone}>{last.label}</Badge>
          <span className="block text-[13px] tabular-nums text-text-secondary">
            {formatWhen(data.ultima_inicio)}
            {data.ultima_duracion_s !== null && ` · ${formatDuration(data.ultima_duracion_s)}`}
          </span>
        </>
      ),
    },
    { label: "Datos listos en la última", value: <span className="tabular-nums">{formatWhen(data.ultima_datos_listos)}</span> },
    { label: "Próxima ejecución", value: <span className="tabular-nums">{formatWhen(data.proxima_ejecucion)}</span> },
    {
      label: data.en_curso ? "Datos listos (corrida en curso)" : "Datos listos (próxima corrida)",
      value: <ReadyTime ready={null} eta={currentEta(data)} typical={data.hora_tipica_datos_listos} runs={data.corridas_medidas} />,
    },
    {
      label: data.en_curso ? "Fin estimado (en curso)" : "Fin estimado (próxima)",
      value: <span className="tabular-nums">{formatWhen(data.en_curso ? data.eta_fin_en_curso : data.eta_fin_proxima)}</span>,
    },
    {
      label: "Tablas",
      value: `${formatNumber(data.tablas_fase1)} en fase 1 · ${formatNumber(data.tablas_fase2)} en fase 2`,
    },
    { label: "Transformación", value: data.transformacion ? <span className="font-mono text-[13px]">{data.transformacion}</span> : "—" },
    { label: "Éxito", value: <span className="tabular-nums">{formatPct(data.pct_exito)}</span> },
    {
      label: "systemd",
      value: (
        <span className="text-[13px] tabular-nums">
          Último {formatWhen(data.systemd_ultimo)} · próximo {formatWhen(data.systemd_proximo)}
        </span>
      ),
    },
  ];
  return (
    <dl className="grid gap-x-6 gap-y-4 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-1">
          <dt className="text-[13px] text-text-secondary">{item.label}</dt>
          <dd className="text-sm">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function weekdays(days: number[] | null): string {
  if (!days || days.length === 0) return "Todos los días";
  if (days.length === 7) return "Todos los días";
  return days.map((day) => WEEKDAYS[day] ?? String(day)).join(", ");
}

function SectionTitle({ id, title, hint }: { id: string; title: string; hint?: string }) {
  return (
    <div className="space-y-0.5">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {hint && <p className="text-[13px] text-text-secondary">{hint}</p>}
    </div>
  );
}

const th = "px-3 py-2";
const thead = "bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary";

function TypicalDay({ rows }: { rows: HorarioTipico[] }) {
  return (
    <section aria-labelledby="dwh-typical" className="space-y-3">
      <SectionTitle id="dwh-typical" title="Día típico" hint="Medianas de las corridas medidas, en hora de Bogotá; entre paréntesis, el p90 de datos listos." />
      {rows.length === 0 ? (
        <p className="text-sm text-text-secondary">Sin horario típico: la secuencia aún no tiene corridas medidas.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Horario típico de la secuencia</caption>
              <thead className={thead}>
                <tr>
                  <th scope="col" className={th}>Días</th>
                  <th scope="col" className={`${th} text-right`}>Programada</th>
                  <th scope="col" className={`${th} text-right`}>Arranca</th>
                  <th scope="col" className={`${th} text-right`}>Fin extracción</th>
                  <th scope="col" className={`${th} text-right`}>Datos listos</th>
                  <th scope="col" className={`${th} text-right`}>Fin</th>
                  <th scope="col" className={`${th} hidden xl:table-cell`}>Base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.calendario} className="hover:bg-primary-subtle">
                    <td className="px-3 py-2">
                      <span className="block">{weekdays(row.dias_semana)}</span>
                      <span className="hidden font-mono text-[13px] text-text-secondary xl:block">{row.calendario}</span>
                      <MeasuredRuns count={row.corridas_medidas} className="block xl:hidden" />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTimeOfDay(row.hora_programada)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTimeOfDay(row.hora_inicio_real)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTimeOfDay(row.hora_fin_extraccion)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className="font-semibold">{formatTimeOfDay(row.hora_datos_listos)}</span>
                      <span className="text-text-secondary"> ({formatTimeOfDay(row.hora_datos_listos_p90)})</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatTimeOfDay(row.hora_fin)}</td>
                    <td className="hidden px-3 py-2 xl:table-cell">
                      <MeasuredRuns count={row.corridas_medidas} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
            {rows.map((row) => (
              <li key={row.calendario} className="space-y-1 px-3 py-3">
                <span className="block font-mono text-[13px]">{row.calendario}</span>
                <span className="block text-sm tabular-nums">
                  Programada {formatTimeOfDay(row.hora_programada)} · datos listos{" "}
                  <span className="font-semibold">{formatTimeOfDay(row.hora_datos_listos)}</span>
                </span>
                <MeasuredRuns count={row.corridas_medidas} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Statistics({ stats }: { stats: Estadistica | null }) {
  const items: [string, number | null][] = stats
    ? [
        ["Retraso al arrancar", stats.retraso_inicio_mediana_s],
        ["Extracción", stats.extraccion_mediana_s],
        ["Transformación", stats.transformacion_mediana_s],
        ["Hasta datos listos", stats.datos_listos_mediana_s],
        ["Hasta datos listos (p90)", stats.datos_listos_p90_s],
        ["Duración total", stats.duracion_mediana_s],
        ["Duración total (p90)", stats.duracion_p90_s],
        ["Datos listos desde la hora programada", stats.datos_listos_desde_programada_s],
      ]
    : [];
  return (
    <section aria-labelledby="dwh-stats" className="space-y-3">
      <SectionTitle id="dwh-stats" title="De dónde sale la ETA" hint="Medianas salvo donde dice p90." />
      {!stats ? (
        <p className="text-sm text-text-secondary">Sin estadísticas: la secuencia aún no tiene corridas medidas.</p>
      ) : (
        <div className="space-y-2">
          <MeasuredRuns count={stats.corridas_medidas} />
          <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map(([label, value]) => (
              <div key={label} className="space-y-0.5">
                <dt className="text-[13px] text-text-secondary">{label}</dt>
                <dd className="text-sm font-semibold tabular-nums">{formatDuration(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}

function Tables({ rows }: { rows: SecuenciaTabla[] }) {
  const sorted = [...rows].sort(
    (a, b) => a.fase - b.fase || (a.carril ?? 0) - (b.carril ?? 0) || (a.orden ?? 0) - (b.orden ?? 0)
  );
  return (
    <section aria-labelledby="dwh-tables" className="space-y-3">
      <SectionTitle
        id="dwh-tables"
        title="Tablas que extrae"
        hint="En orden de ejecución: fase, carril y orden. La fase 1 deja los datos listos; la fase 2 corre después."
      />
      {sorted.length === 0 ? (
        <StatePanel icon={Table2} title="Esta secuencia no tiene tablas asignadas" />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Tablas que extrae la secuencia</caption>
              <thead className={thead}>
                <tr>
                  <th scope="col" className={`${th} text-right whitespace-nowrap`}>Orden</th>
                  <th scope="col" className={th}>Tabla</th>
                  <th scope="col" className={th}>Dominio</th>
                  <th scope="col" className={th}>Último resultado</th>
                  <th scope="col" className={`${th} text-right`}>Filas</th>
                  <th scope="col" className={`${th} text-right`}>Última extracción buena</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sorted.map((row) => (
                  <tr key={`${row.fase}-${row.pipeline_name}`} className="hover:bg-primary-subtle">
                    <td className="whitespace-nowrap px-3 py-2 text-right align-top tabular-nums">
                      {row.fase} · {row.carril ?? "—"} · {row.orden ?? "—"}
                    </td>
                    <td className="max-w-80 px-3 py-2 align-top">
                      <span className="block font-mono text-[13px]">{row.tabla ?? row.pipeline_name}</span>
                      <span className="block text-[13px] text-text-secondary">
                        {[row.estrategia, row.alcance].filter(Boolean).join(" · ")}
                        {row.habilitada === false && " · deshabilitada"}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">{row.dominio ?? "—"}</td>
                    <td className="max-w-96 px-3 py-2 align-top">
                      <RunStatusBadge status={row.ultimo_estado} />
                      {row.ultimo_inicio && (
                        <span className="block text-[13px] tabular-nums text-text-secondary">{formatWhen(row.ultimo_inicio)}</span>
                      )}
                      {row.ultimo_error && (
                        <span className="mt-1 block break-words font-mono text-[13px] text-danger">{row.ultimo_error}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right align-top tabular-nums">{formatNumber(row.ultimo_filas)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right align-top tabular-nums">{formatWhen(row.ultima_extraccion_ok)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
            {sorted.map((row) => (
              <li key={`${row.fase}-${row.pipeline_name}`} className="space-y-1.5 px-3 py-3">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-all font-mono text-[13px]">{row.tabla ?? row.pipeline_name}</span>
                  <RunStatusBadge status={row.ultimo_estado} />
                </span>
                <span className="block text-[13px] tabular-nums text-text-secondary">
                  Fase {row.fase} · última buena {formatWhen(row.ultima_extraccion_ok)}
                </span>
                {row.ultimo_error && <span className="block break-words font-mono text-[13px] text-danger">{row.ultimo_error}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
