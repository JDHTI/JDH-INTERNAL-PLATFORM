"use client";

import Link from "next/link";
import { AppWindow } from "lucide-react";

import { dwhPath, formatNumber, formatPct, formatWhen, LOAD_STATUS } from "@/features/dwh-monitoring/lib/format";
import PageHeader from "@/shared/components/page-header";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { buttonVariants } from "@/shared/components/ui/button";

import { useBoard } from "../hooks/use-app-monitoring";
import { appsPath, bySeverity, status } from "../lib/format";
import type { Aplicativo, Board, DatawarehouseBoard } from "../types/app-monitoring.types";
import { ApplicationBadge, CheckCycle, currentProblem, LoadError, StatusBadge, TargetLine } from "./parts";

const link =
  "rounded-sm text-sm font-medium text-text-primary underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:inline-flex max-md:min-h-11 max-md:items-center";

/**
 * The board answers one question: is everything responding, and if not, what.
 * The verdict comes first and names what is wrong; the applications follow
 * worst first, then the data warehouse, each linking to the screen that
 * explains it.
 */
export default function MonitoringBoard({ area }: { area: string }) {
  const board = useBoard();
  const data = board.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tablero general"
        description="Si los aplicativos y el datawarehouse están respondiendo ahora, y qué falla cuando algo no."
        aside={<CheckCycle overview={data?.aplicativos} withAction />}
      />

      {board.isPending ? (
        <TableSkeleton label="Cargando el tablero" rows={6} />
      ) : board.isError && !data ? (
        <LoadError error={board.error} onRetry={() => board.refetch()} what="el tablero" />
      ) : data ? (
        <>
          <Verdict data={data} />
          <Applications area={area} apps={data.aplicativos.aplicativos} />
          <Warehouse area={area} dwh={data.datawarehouse} />
        </>
      ) : null}
    </div>
  );
}

/** The one thing to read on this screen: the overall state and, when it is not up, who pulls it down. */
function Verdict({ data }: { data: Board }) {
  const problems = [
    ...data.aplicativos.aplicativos
      .filter((app) => app.habilitado && (app.estado === "down" || app.estado === "degraded"))
      .sort(bySeverity)
      .map((app) => ({ name: app.nombre, estado: app.estado })),
    ...(data.datawarehouse.estado === "down" || data.datawarehouse.estado === "degraded"
      ? [{ name: "Datawarehouse", estado: data.datawarehouse.estado }]
      : []),
  ];
  const headline =
    data.estado_general === null
      ? "Todavía no hay mediciones"
      : problems.length === 0
        ? "Todo está respondiendo"
        : problems.length === 1
          ? `${problems[0].name} tiene problemas`
          : `${problems.length} sistemas tienen problemas`;

  return (
    <section aria-labelledby="board-verdict" className="space-y-2 rounded-lg border border-border bg-surface px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge value={data.estado_general} />
        <h2 id="board-verdict" className="text-xl font-semibold tracking-tight">
          {headline}
        </h2>
      </div>
      {problems.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {problems.map((problem) => (
            <li key={problem.name}>
              {problem.name}: <span className="font-medium">{status(problem.estado).label.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[13px] text-text-secondary tabular-nums">
        {data.estado_general === null
          ? "Aparecen cuando corra el primer chequeo de los aplicativos o la primera carga del datawarehouse."
          : `Calculado ${formatWhen(data.generado_en)}. Cuenta solo los aplicativos habilitados.`}
      </p>
    </section>
  );
}

function SectionHeading({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Applications({ area, apps }: { area: string; apps: Aplicativo[] }) {
  const enabled = apps.filter((app) => app.habilitado).sort(bySeverity);
  const disabled = apps.filter((app) => !app.habilitado);

  return (
    <section aria-labelledby="board-apps" className="space-y-3">
      <SectionHeading id="board-apps" title="Aplicativos">
        <Link href={appsPath(area)} className={link}>
          Administrar aplicativos
        </Link>
      </SectionHeading>

      {apps.length === 0 ? (
        <StatePanel
          icon={AppWindow}
          title="No hay aplicativos registrados"
          action={
            <Link href={appsPath(area)} className={buttonVariants({ variant: "outline", className: "max-md:h-11" })}>
              Agregar un aplicativo
            </Link>
          }
        >
          Registra la dirección de cada plataforma y la API la chequea cada minuto en su health y en su UI.
        </StatePanel>
      ) : (
        <>
          {enabled.length === 0 ? (
            <p className="text-sm text-text-secondary">Todos los aplicativos están deshabilitados.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {enabled.map((app) => (
                <li key={app.id}>
                  <AppCard area={area} app={app} />
                </li>
              ))}
            </ul>
          )}
          {disabled.length > 0 && (
            <p className="text-[13px] text-text-secondary">
              Deshabilitados, sin chequeo automático:{" "}
              {disabled.map((app, index) => (
                <span key={app.id}>
                  {index > 0 && ", "}
                  <Link
                    href={appsPath(area, app.id)}
                    className="rounded-sm text-text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {app.nombre}
                  </Link>
                </span>
              ))}
              .
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** One application: its state, each target in a line, and the reason when something is off. */
function AppCard({ area, app }: { area: string; app: Aplicativo }) {
  const problem = currentProblem(app);
  const checked = app.api?.ultimo?.chequeado_en ?? app.ui?.ultimo?.chequeado_en ?? null;
  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">
            <Link
              href={appsPath(area, app.id)}
              className="rounded-sm underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {app.nombre}
            </Link>
          </h3>
          <p className="truncate font-mono text-[13px] text-text-secondary">{app.url_base}</p>
        </div>
        <ApplicationBadge app={app} />
      </header>

      <div className="space-y-1.5">
        <TargetLine target="api" summary={app.api} />
        <TargetLine target="ui" summary={app.ui} checksUi={app.verificar_ui} />
      </div>

      {problem && (
        <p className="break-words text-[13px]">
          <span className="font-medium">{problem.target === "api" ? "API" : "UI"}: </span>
          <span className={problem.raw ? "font-mono" : undefined}>{problem.text}</span>
        </p>
      )}

      <p className="mt-auto text-[13px] tabular-nums text-text-secondary">
        {checked ? `Chequeado ${formatWhen(checked)}` : "Aún sin chequear"}
      </p>
    </article>
  );
}

/** Why the warehouse is not up, in the words of the rule the API applies. */
function warehouseReasons(dwh: DatawarehouseBoard): string[] {
  const reasons: string[] = [];
  const load = dwh.ultima_carga;
  if (load?.estado === "failed") reasons.push("La última carga desde el DWH falló.");
  if (load?.estado === "partial") reasons.push("La última carga desde el DWH quedó parcial.");
  if (dwh.estado === "down" && load?.estado !== "failed") reasons.push("La copia lleva más de tres ciclos sin una carga exitosa.");
  const late = (dwh.atrasadas ?? 0) + (dwh.nunca_extraidas ?? 0);
  if (late > 0) reasons.push(`${formatNumber(late)} ${late === 1 ? "tabla atrasada o nunca extraída" : "tablas atrasadas o nunca extraídas"}.`);
  if (dwh.secuencias_fallidas > 0) {
    reasons.push(
      `${formatNumber(dwh.secuencias_fallidas)} ${dwh.secuencias_fallidas === 1 ? "secuencia terminó" : "secuencias terminaron"} su última corrida con fallo.`
    );
  }
  return reasons;
}

function Warehouse({ area, dwh }: { area: string; dwh: DatawarehouseBoard }) {
  const reasons = dwh.estado === "up" || dwh.estado === null ? [] : warehouseReasons(dwh);
  const load = dwh.ultima_carga;
  const loadStatus = load?.estado ? LOAD_STATUS[load.estado] : null;

  return (
    <section aria-labelledby="board-dwh" className="space-y-3">
      <SectionHeading id="board-dwh" title="Datawarehouse">
        <Link href={dwhPath(area)} className={link}>
          Ver el monitoreo del datawarehouse
        </Link>
      </SectionHeading>

      <div className="rounded-lg border border-border bg-surface">
        <div className="space-y-2 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge value={dwh.estado} />
            <p className="text-sm">
              {dwh.estado === null
                ? "Todavía no hay ninguna carga desde el DWH."
                : dwh.ultima_carga_exitosa
                  ? <>Datos actualizados <span className="font-medium tabular-nums">{formatWhen(dwh.ultima_carga_exitosa)}</span></>
                  : "Sin una carga exitosa todavía."}
            </p>
          </div>
          {reasons.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
          {load?.error && <p className="break-words font-mono text-[13px]">{load.error}</p>}
        </div>

        <dl className="grid divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          <Figure label="Tablas programadas frescas" value={formatPct(dwh.pct_fresca_programadas)} />
          <Figure
            label="Atrasadas · nunca extraídas"
            value={dwh.atrasadas === null ? "—" : `${formatNumber(dwh.atrasadas)} · ${formatNumber(dwh.nunca_extraidas)}`}
          />
          <Figure
            label="Secuencias fallidas"
            value={formatNumber(dwh.secuencias_fallidas)}
            detail={`${formatNumber(dwh.secuencias_activas)} activas · ${formatNumber(dwh.secuencias_en_curso)} en curso`}
          />
          <Figure
            label="Última carga"
            value={loadStatus ? <Badge tone={loadStatus.tone}>{loadStatus.label}</Badge> : "—"}
            detail={load ? `Empezó ${formatWhen(load.iniciado_en)}` : "Sin cargas"}
          />
        </dl>
      </div>
    </section>
  );
}

function Figure({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <dt className="text-[13px] text-text-secondary">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
      {detail && <dd className="text-[13px] tabular-nums text-text-secondary">{detail}</dd>}
    </div>
  );
}
