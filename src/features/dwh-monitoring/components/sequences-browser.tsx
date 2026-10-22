"use client";

import { Workflow } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";

import { useSequences } from "../hooks/use-dwh-monitoring";
import {
  currentEta,
  formatDuration,
  formatMinutes,
  formatPct,
  formatTimeOfDay,
  formatWhen,
  scheduleStatus,
} from "../lib/format";
import type { Secuencia } from "../types/dwh-monitoring.types";
import { LoadError, PageHeader, ReadyTime, RunStatusBadge, SequenceLink, TableSkeleton } from "./parts";
import SyncStatus from "./sync-status";

/** Every sequence the warehouse knows, in the order they run during the day. */
export default function SequencesBrowser({ area }: { area: string }) {
  const sequences = useSequences();
  const rows = [...(sequences.data?.items ?? [])].sort(
    (a, b) => (a.hora_inicio ?? "99").localeCompare(b.hora_inicio ?? "99") || a.secuencia.localeCompare(b.secuencia)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Secuencias"
        description="Cada secuencia de extracción del DWH: su programación, cómo le fue la última vez, si está corriendo y cuándo estarán listos sus datos."
        aside={<SyncStatus />}
      />

      {sequences.isPending ? (
        <TableSkeleton label="Cargando secuencias" />
      ) : sequences.isError && !sequences.data ? (
        <LoadError error={sequences.error} onRetry={() => sequences.refetch()} what="las secuencias" />
      ) : rows.length === 0 ? (
        <StatePanel icon={Workflow} title="Todavía no hay secuencias">
          Aparecen cuando la plataforma copie el esquema de monitoreo del DWH.
        </StatePanel>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Secuencias de extracción del datawarehouse</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2">Secuencia</th>
                  <th scope="col" className="px-3 py-2">Programación</th>
                  <th scope="col" className="px-3 py-2">Última corrida</th>
                  <th scope="col" className="px-3 py-2">Datos listos</th>
                  <th scope="col" className="hidden px-3 py-2 text-right xl:table-cell">Éxito</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((sequence) => (
                  <tr key={sequence.secuencia} className="hover:bg-primary-subtle">
                    <td className="max-w-52 px-3 py-2 align-top">
                      <SequenceLink area={area} secuencia={sequence.secuencia} />
                      {sequence.descripcion && (
                        <span className="block truncate text-[13px] text-text-secondary" title={sequence.descripcion}>
                          {sequence.descripcion}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <ScheduleCell sequence={sequence} />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <LastRunCell sequence={sequence} />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <ReadyTime
                        ready={null}
                        eta={currentEta(sequence)}
                        typical={sequence.hora_tipica_datos_listos}
                        runs={sequence.corridas_medidas}
                      />
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2 text-right align-top tabular-nums xl:table-cell">
                      {formatPct(sequence.pct_exito)}
                      <span className="block text-[13px] text-text-secondary">
                        dura {formatMinutes(sequence.duracion_mediana_min)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
            {rows.map((sequence) => (
              <li key={sequence.secuencia} className="flex flex-col gap-2 px-3 py-3">
                <span className="flex items-start justify-between gap-3">
                  <SequenceLink area={area} secuencia={sequence.secuencia} className="py-1" />
                  <LastRunBadge sequence={sequence} />
                </span>
                <ReadyTime
                  ready={null}
                  eta={currentEta(sequence)}
                  typical={sequence.hora_tipica_datos_listos}
                  runs={sequence.corridas_medidas}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ScheduleCell({ sequence }: { sequence: Secuencia }) {
  const { label, tone } = scheduleStatus(sequence.estado_programacion);
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge tone={tone}>{label}</Badge>
      <span className="whitespace-nowrap text-sm tabular-nums">
        {formatTimeOfDay(sequence.hora_inicio)}
        {sequence.tope_s !== null && <span className="text-text-secondary"> · tope {formatDuration(sequence.tope_s)}</span>}
      </span>
      {sequence.proxima_ejecucion && (
        <span className="whitespace-nowrap text-[13px] tabular-nums text-text-secondary">
          Próxima {formatWhen(sequence.proxima_ejecucion)}
        </span>
      )}
      {sequence.calendario && <span className="hidden font-mono text-[13px] text-text-secondary xl:block">{sequence.calendario}</span>}
    </span>
  );
}

function LastRunBadge({ sequence }: { sequence: Secuencia }) {
  return sequence.en_curso ? <RunStatusBadge status="running" /> : <RunStatusBadge status={sequence.ultima_estado} />;
}

function LastRunCell({ sequence }: { sequence: Secuencia }) {
  return (
    <span className="flex flex-col items-start gap-1">
      <LastRunBadge sequence={sequence} />
      {sequence.ultima_inicio && (
        <span className="whitespace-nowrap text-[13px] tabular-nums text-text-secondary">
          {formatWhen(sequence.ultima_inicio)}
          {sequence.ultima_duracion_s !== null && ` · ${formatDuration(sequence.ultima_duracion_s)}`}
        </span>
      )}
    </span>
  );
}
