"use client";

import Link from "next/link";
import { DatabaseZap } from "lucide-react";

import PageHeader from "@/shared/components/page-header";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";

import { useOverview } from "../hooks/use-dwh-monitoring";
import { dwhPath, formatNumber, formatPct, formatWhen } from "../lib/format";
import type { DatosListos, Overview as OverviewData } from "../types/dwh-monitoring.types";
import { LoadError, NoLoadYet, ReadyTime, RunStatusBadge, SequenceLink } from "./parts";
import SyncStatus, { LoadWarning } from "./sync-status";

/**
 * The module's front page answers one question first: are today's data ready,
 * and if not, when. Freshness and the sequences sit in a strip above it as
 * context, each linking to the page that explains it.
 */
export default function Overview({ area }: { area: string }) {
  const overview = useOverview();
  const data = overview.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Datawarehouse"
        description="Cuándo quedan listos los datos de cada secuencia, qué tan frescas están las tablas y cómo va la carga desde el DWH."
        aside={<SyncStatus withAction />}
      />

      {overview.isPending ? (
        <TableSkeleton label="Cargando el resumen" />
      ) : overview.isError && !data ? (
        <LoadError error={overview.error} onRetry={() => overview.refetch()} what="el resumen del datawarehouse" />
      ) : data && isEmpty(data) ? (
        <NoLoadYet enabled={data.carga.habilitada} />
      ) : data ? (
        <>
          <LoadWarning status={data.carga} />
          <Figures area={area} data={data} />
          <ReadyToday area={area} rows={data.datos_listos_hoy} />
        </>
      ) : null}
    </div>
  );
}

function isEmpty(data: OverviewData): boolean {
  return data.frescura === null && data.datos_listos_hoy.length === 0 && data.carga.ultima === null;
}

/** Three figures in one strip, not three cards: they are context for the table below, not the subject. */
function Figures({ area, data }: { area: string; data: OverviewData }) {
  const freshness = data.frescura;
  const late = (freshness?.atrasadas ?? 0) + (freshness?.nunca_extraidas ?? 0);
  return (
    <dl className="grid divide-y divide-border rounded-lg border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <Figure
        label="Tablas programadas frescas"
        value={formatPct(freshness?.pct_fresca_programadas)}
        detail={
          freshness
            ? `${formatNumber(freshness.frescas_programadas)} de ${formatNumber(freshness.tablas_programadas)} · calculado ${formatWhen(freshness.calculado_en)}`
            : "Sin cálculo todavía"
        }
      />
      <Figure
        label="Tablas atrasadas o nunca extraídas"
        value={freshness ? formatNumber(late) : "—"}
        detail={
          <Link
            href={dwhPath(area, "frescura")}
            className="rounded-sm font-medium text-text-primary underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Ver cuáles
          </Link>
        }
      />
      <Figure
        label="Secuencias activas"
        value={formatNumber(data.secuencias_activas)}
        detail={
          data.secuencias_en_curso > 0
            ? `${formatNumber(data.secuencias_en_curso)} en curso ahora`
            : "Ninguna en curso ahora"
        }
      />
    </dl>
  );
}

function Figure({ label, value, detail }: { label: string; value: string; detail: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <dt className="text-[13px] text-text-secondary">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
      <dd className="text-[13px] text-text-secondary">{detail}</dd>
    </div>
  );
}

function ReadyToday({ area, rows }: { area: string; rows: DatosListos[] }) {
  return (
    <section aria-labelledby="dwh-ready-title" className="space-y-3">
      <div className="space-y-0.5">
        <h2 id="dwh-ready-title" className="text-xl font-semibold tracking-tight">
          Datos listos hoy
        </h2>
        <p className="text-[13px] text-text-secondary">
          La hora real cuando ya pasó; si no, la estimada con las corridas en que se basa. Las horas son de Bogotá.
        </p>
      </div>

      {rows.length === 0 ? (
        <StatePanel icon={DatabaseZap} title="No hay secuencias activas">
          Cuando una secuencia quede activa en el DWH, su hora de datos listos aparece aquí.
        </StatePanel>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Hora de datos listos de cada secuencia activa, hoy</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2">Secuencia</th>
                  <th scope="col" className="px-3 py-2">Datos listos</th>
                  <th scope="col" className="px-3 py-2">Última corrida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.secuencia} className="hover:bg-primary-subtle">
                    <td className="px-3 py-2 align-top">
                      <SequenceLink area={area} secuencia={row.secuencia} />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <ReadyTime
                        ready={row.datos_listos}
                        eta={row.eta_datos_listos}
                        typical={row.hora_tipica_datos_listos}
                        runs={row.corridas_medidas}
                        todayOnly
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <RunStatusBadge status={row.ultima_estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
            {rows.map((row) => (
              <li key={row.secuencia} className="flex items-start justify-between gap-3 px-3 py-3">
                <span className="flex min-w-0 flex-col gap-1.5">
                  <SequenceLink area={area} secuencia={row.secuencia} className="py-1" />
                  <ReadyTime
                    ready={row.datos_listos}
                    eta={row.eta_datos_listos}
                    typical={row.hora_tipica_datos_listos}
                    runs={row.corridas_medidas}
                    todayOnly
                  />
                </span>
                <RunStatusBadge status={row.ultima_estado} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
