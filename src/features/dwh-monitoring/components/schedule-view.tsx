"use client";

import { useEffect, useState } from "react";
import { CalendarX2, ChevronLeft, ChevronRight } from "lucide-react";

import PageHeader from "@/shared/components/page-header";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { cn } from "@/shared/lib/utils";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useSchedule } from "../hooks/use-dwh-monitoring";
import {
  addDays,
  bogotaDay,
  currentEta,
  dwhPath,
  formatClock,
  formatLongDay,
  formatTimeOfDay,
  isoWeekday,
  minutesIntoDay,
  runsOnWeekday,
  timeOfDayMinutes,
} from "../lib/format";
import type { Corrida, Horario, HorarioTipico, Secuencia } from "../types/dwh-monitoring.types";
import { LoadError, MeasuredRuns, RunStatusBadge, SequenceLink } from "./parts";
import SyncStatus from "./sync-status";

interface Row {
  secuencia: string;
  sequence: Secuencia | null;
  typical: HorarioTipico[];
  runs: Corrida[];
}

interface Segment {
  from: number;
  to: number;
  kind: "fase1" | "fase2" | "eta";
  title: string;
}

/** Re-renders once a minute so the «now» line and running bars keep moving. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/**
 * The day of the warehouse as a Gantt: for each sequence, its typical day
 * (outlined, from the medians) above what really happened that day (filled).
 * Read left to right in Bogotá time. On a phone the same comparison is a list
 * of times, since a chart this wide does not fit.
 */
export default function ScheduleView({ area }: { area: string }) {
  const today = bogotaDay();
  const [day, setDay] = useState(today);
  useBreadcrumbLabel(dwhPath(area, "horario"), "Horario del día");
  const isToday = day === today;
  const schedule = useSchedule(day, isToday);
  const data = schedule.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horario del día"
        description="El día típico de cada secuencia contra lo que pasó en la fecha elegida: cuándo arrancó, cuándo quedaron listos los datos y cuándo terminó."
        aside={<SyncStatus />}
      />

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1.5">
          <label htmlFor="dwh-schedule-day" className="block text-[13px] font-medium">
            Fecha
          </label>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" aria-label="Día anterior" onClick={() => setDay(addDays(day, -1))} className="max-md:size-11">
              <ChevronLeft aria-hidden="true" />
            </Button>
            <div className="w-40">
              <DatePicker id="dwh-schedule-day" value={day} max={today} onChange={(next) => next && setDay(next)} />
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Día siguiente"
              disabled={isToday}
              onClick={() => setDay(addDays(day, 1))}
              className="max-md:size-11"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
        <p className="pb-2 text-sm text-text-secondary">{formatLongDay(day)}</p>
      </div>

      {schedule.isPending ? (
        <TableSkeleton label="Cargando el horario" rows={6} />
      ) : schedule.isError && !data ? (
        <LoadError error={schedule.error} onRetry={() => schedule.refetch()} what="el horario" />
      ) : data ? (
        <Chart data={data} area={area} isToday={isToday} />
      ) : null}
    </div>
  );
}

function buildRows(data: Horario): Row[] {
  const weekday = isoWeekday(data.fecha);
  const names = new Set<string>();
  const ordered = [...data.secuencias].sort((a, b) => (a.hora_inicio ?? "99").localeCompare(b.hora_inicio ?? "99"));
  const rows: Row[] = ordered.map((sequence) => {
    names.add(sequence.secuencia);
    return { secuencia: sequence.secuencia, sequence, typical: [], runs: [] };
  });
  // A run of a sequence the list no longer has still happened: it gets a row.
  for (const run of data.corridas) {
    if (!names.has(run.secuencia)) {
      names.add(run.secuencia);
      rows.push({ secuencia: run.secuencia, sequence: null, typical: [], runs: [] });
    }
  }
  const byName = new Map(rows.map((row) => [row.secuencia, row]));
  for (const typical of data.tipico) {
    if (runsOnWeekday(typical.dias_semana, weekday)) byName.get(typical.secuencia)?.typical.push(typical);
  }
  for (const run of data.corridas) byName.get(run.secuencia)?.runs.push(run);
  for (const row of rows) row.runs.sort((a, b) => a.inicio.localeCompare(b.inicio));
  return rows;
}

const span = (from: string | null, to: string | null) => `${formatClock(from)}–${to ? formatClock(to) : "en curso"}`;

/** Where a run's filled bar goes: phase 1 up to ready data, phase 2 after it, and the estimate of a running one. */
function runSegments(run: Corrida, day: string, nowMinutes: number | null, eta: string | null): Segment[] {
  const at = (value: string | null) => minutesIntoDay(value, day);
  const start = at(run.inicio);
  if (start === null) return [];
  const open = !run.fin && run.estado === "running";
  const end = at(run.fin) ?? (open ? nowMinutes : null) ?? at(run.datos_listos) ?? at(run.extraccion_fin) ?? start;
  const ready = at(run.datos_listos);
  const segments: Segment[] = [];

  const phase1End = ready ?? at(run.transformacion_fin) ?? (run.fase2_inicio ? at(run.fase2_inicio) : null) ?? end;
  segments.push({
    from: start,
    to: Math.max(phase1End, start),
    kind: "fase1",
    title: `Extracción y transformación ${span(run.inicio, run.datos_listos ?? run.transformacion_fin ?? run.fin)}`,
  });
  if (phase1End < end) {
    segments.push({ from: phase1End, to: end, kind: "fase2", title: `Fase 2 ${span(run.datos_listos ?? run.fase2_inicio, run.fin)}` });
  }
  const etaEnd = at(eta);
  if (open && etaEnd !== null && etaEnd > end) {
    segments.push({ from: end, to: etaEnd, kind: "eta", title: `Fin estimado ${formatClock(eta)}` });
  }
  return segments;
}

function Chart({ data, area, isToday }: { data: Horario; area: string; isToday: boolean }) {
  const now = useNow();
  const rows = buildRows(data);
  const nowMinutes = isToday ? minutesIntoDay(new Date(now).toISOString(), data.fecha) : null;

  if (rows.length === 0) {
    return (
      <StatePanel icon={CalendarX2} title="Sin secuencias ni corridas este día">
        Elige otra fecha, o espera a que la plataforma copie el esquema de monitoreo del DWH.
      </StatePanel>
    );
  }

  // The axis spans what there is to draw, rounded out to whole hours.
  const points: number[] = [];
  for (const row of rows) {
    for (const typical of row.typical) {
      for (const value of [typical.hora_programada, typical.hora_inicio_real, typical.hora_fin, typical.hora_datos_listos_p90]) {
        const minutes = timeOfDayMinutes(value);
        if (minutes !== null) points.push(minutes);
      }
    }
    for (const run of row.runs) {
      for (const segment of runSegments(run, data.fecha, nowMinutes, row.sequence ? currentEta(row.sequence) : null)) {
        points.push(segment.from, segment.to);
      }
    }
  }
  if (nowMinutes !== null && nowMinutes >= 0 && nowMinutes <= 1440) points.push(nowMinutes);
  const first = points.length ? Math.max(0, Math.floor(Math.min(...points) / 60) * 60) : 0;
  const last = points.length ? Math.min(1440, Math.ceil(Math.max(...points) / 60) * 60) : 1440;
  const start = first;
  const end = last > first ? last : first + 60;
  const step = end - start > 12 * 60 ? 120 : 60;
  const ticks: number[] = [];
  for (let tick = Math.ceil(start / step) * step; tick <= end; tick += step) ticks.push(tick);
  const pct = (minutes: number) => `${((Math.min(Math.max(minutes, start), end) - start) / (end - start)) * 100}%`;
  const width = (from: number, to: number) =>
    `${((Math.min(Math.max(to, start), end) - Math.min(Math.max(from, start), end)) / (end - start)) * 100}%`;
  const showNow = nowMinutes !== null && nowMinutes >= start && nowMinutes <= end;

  return (
    <div className="space-y-3">
      <Legend />

      {/* Wide screens: the chart. */}
      <div className="hidden rounded-lg border border-border bg-surface md:block">
        <div className="grid grid-cols-[15rem_minmax(0,1fr)] border-b border-border bg-canvas-subtle">
          <span className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">Secuencia</span>
          <div className="relative mr-4 h-8" aria-hidden="true">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute top-2 -translate-x-1/2 text-[11px] tabular-nums text-text-secondary"
                style={{ left: pct(tick) }}
              >
                {String(Math.floor(tick / 60) % 24).padStart(2, "0")}:00
              </span>
            ))}
          </div>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.secuencia} className="grid grid-cols-[15rem_minmax(0,1fr)]">
              <RowLabel row={row} area={area} />
              <div className="relative mr-4 min-h-16" aria-hidden="true">
                {ticks.map((tick) => (
                  <span key={tick} className="absolute inset-y-0 w-px bg-border" style={{ left: pct(tick) }} />
                ))}
                {showNow && (
                  <span className="absolute inset-y-0 z-10 border-l-2 border-dashed border-text-primary" style={{ left: pct(nowMinutes) }} />
                )}
                {/* Typical lane: outlined, from the medians. */}
                {row.typical.map((typical) => {
                  const from = timeOfDayMinutes(typical.hora_inicio_real) ?? timeOfDayMinutes(typical.hora_programada);
                  const to = timeOfDayMinutes(typical.hora_fin) ?? timeOfDayMinutes(typical.hora_datos_listos);
                  const ready = timeOfDayMinutes(typical.hora_datos_listos);
                  const p90 = timeOfDayMinutes(typical.hora_datos_listos_p90);
                  if (from === null || to === null) return null;
                  return (
                    <div key={typical.calendario}>
                      <span
                        className="absolute top-3 h-3 rounded-sm border border-text-secondary"
                        style={{ left: pct(from), width: width(from, to) }}
                        title={`Típico ${formatTimeOfDay(typical.hora_inicio_real)}–${formatTimeOfDay(typical.hora_fin)}`}
                      />
                      {ready !== null && p90 !== null && p90 > ready && (
                        <span
                          className="absolute top-[1.0625rem] h-0 border-t-2 border-dotted border-text-secondary"
                          style={{ left: pct(ready), width: width(ready, p90) }}
                          title={`Datos listos p90 ${formatTimeOfDay(typical.hora_datos_listos_p90)}`}
                        />
                      )}
                      {ready !== null && (
                        <span
                          className="absolute top-2 h-5 w-0.5 -translate-x-1/2 bg-text-primary"
                          style={{ left: pct(ready) }}
                          title={`Datos listos típicos ${formatTimeOfDay(typical.hora_datos_listos)}`}
                        />
                      )}
                    </div>
                  );
                })}
                {/* Real lane: filled, what happened. */}
                {row.runs.map((run) => {
                  const failed = run.estado === "failed" || run.estado === "abandonada";
                  const ready = minutesIntoDay(run.datos_listos, data.fecha);
                  return (
                    <div key={run.corrida_id}>
                      {runSegments(run, data.fecha, nowMinutes, row.sequence ? currentEta(row.sequence) : null).map((segment) => (
                        <span
                          key={segment.kind}
                          title={segment.title}
                          className={cn(
                            "absolute top-8 h-4 min-w-0.5 rounded-sm",
                            segment.kind === "fase1" && (failed ? "bg-danger" : "bg-primary"),
                            segment.kind === "fase2" && (failed ? "border-2 border-danger" : "border-2 border-primary"),
                            segment.kind === "eta" && "border-2 border-dashed border-text-secondary"
                          )}
                          style={{ left: pct(segment.from), width: width(segment.from, segment.to) }}
                        />
                      ))}
                      {ready !== null && (
                        <span
                          className="absolute top-7 h-6 w-0.5 -translate-x-1/2 bg-text-primary"
                          style={{ left: pct(ready) }}
                          title={`Datos listos ${formatClock(run.datos_listos)}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
        {showNow && (
          <p className="border-t border-border px-3 py-2 text-[13px] tabular-nums text-text-secondary">
            La línea punteada vertical es la hora actual: {formatClock(new Date(now).toISOString())}.
          </p>
        )}
      </div>

      {/* Phones: the same comparison, as times. */}
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
        {rows.map((row) => (
          <li key={row.secuencia} className="px-3 py-3">
            <RowLabel row={row} area={area} compact />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The words behind each row of bars: status, when the data was (or will be)
 * ready against the typical time, and both timelines in full for screen
 * readers and for phones.
 */
function RowLabel({ row, area, compact = false }: { row: Row; area: string; compact?: boolean }) {
  const run = row.runs.at(-1) ?? null;
  const typical = row.typical[0] ?? null;
  const eta = row.sequence ? currentEta(row.sequence) : null;
  const typicalText = typical
    ? `Típico: arranca ${formatTimeOfDay(typical.hora_inicio_real ?? typical.hora_programada)}, datos listos ${formatTimeOfDay(typical.hora_datos_listos)} (p90 ${formatTimeOfDay(typical.hora_datos_listos_p90)}), termina ${formatTimeOfDay(typical.hora_fin)}.`
    : "Sin día típico para esta fecha.";
  const runText = run
    ? `Real: arrancó ${formatClock(run.inicio)}${run.datos_listos ? `, datos listos ${formatClock(run.datos_listos)}` : ""}${run.fin ? `, terminó ${formatClock(run.fin)}` : ""}.${row.runs.length > 1 ? ` ${row.runs.length} corridas este día.` : ""}`
    : "Sin corrida este día.";

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", !compact && "px-3 py-2")}>
      <span className="flex flex-wrap items-center gap-1.5">
        <SequenceLink area={area} secuencia={row.secuencia} className="truncate max-md:py-1.5" />
        {run ? <RunStatusBadge status={run.estado} /> : null}
        {run?.fuera_de_horario && <span className="text-[13px] text-text-secondary">fuera de horario</span>}
      </span>
      <span className="text-[13px] tabular-nums text-text-secondary">
        {run?.datos_listos ? (
          <>
            Datos listos <span className="font-semibold text-text-primary">{formatClock(run.datos_listos)}</span>
          </>
        ) : run?.estado === "running" && eta ? (
          <>
            Datos listos <span className="font-semibold text-text-primary">{formatClock(eta)}</span> estimada
          </>
        ) : run ? (
          "Sin datos listos"
        ) : (
          "Sin corrida"
        )}
        {typical?.hora_datos_listos && ` · típico ${formatTimeOfDay(typical.hora_datos_listos)}`}
      </span>
      {run?.estado === "running" && eta && <MeasuredRuns count={row.sequence?.corridas_medidas} />}
      {compact ? (
        <span className="space-y-0.5 text-[13px] tabular-nums text-text-secondary">
          <span className="block">{typicalText}</span>
          <span className="block">{runText}</span>
        </span>
      ) : (
        <span className="sr-only">
          {typicalText} {runText}
        </span>
      )}
    </div>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-text-secondary max-md:hidden" aria-label="Cómo leer el gráfico">
      <li className="flex items-center gap-2">
        <span className="h-3 w-8 rounded-sm border border-text-secondary" aria-hidden="true" />
        Día típico (medianas)
      </li>
      <li className="flex items-center gap-2">
        <span className="h-3 w-8 rounded-sm bg-primary" aria-hidden="true" />
        Real: hasta datos listos
      </li>
      <li className="flex items-center gap-2">
        <span className="h-3 w-8 rounded-sm border-2 border-primary" aria-hidden="true" />
        Real: fase 2
      </li>
      <li className="flex items-center gap-2">
        <span className="h-3 w-8 rounded-sm bg-danger" aria-hidden="true" />
        Corrida fallida
      </li>
      <li className="flex items-center gap-2">
        <span className="h-3 w-8 rounded-sm border-2 border-dashed border-text-secondary" aria-hidden="true" />
        Fin estimado de una en curso
      </li>
      <li className="flex items-center gap-2">
        <span className="h-4 w-0.5 bg-text-primary" aria-hidden="true" />
        Datos listos
      </li>
    </ul>
  );
}
