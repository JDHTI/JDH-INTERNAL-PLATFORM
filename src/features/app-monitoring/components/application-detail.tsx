"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, History, Loader2, MoreHorizontal, Pencil, Power, RefreshCw, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { bogotaDay, formatDuration, formatNumber, formatPct, formatWhen } from "@/features/dwh-monitoring/lib/format";
import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { DateRangePicker, type IsoDateRange } from "@/shared/components/ui/date-range-picker";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Menu, MenuItem, MenuSeparator } from "@/shared/components/ui/menu";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";

import { useApplication, useCheckApplication, useChecks, useUpdateApplication } from "../hooks/use-app-monitoring";
import { appsPath, formatLatency, redirectTarget, TARGET_LABEL } from "../lib/format";
import type { Aplicativo, Chequeo, Objetivo, ObjetivoResumen } from "../types/app-monitoring.types";
import ApplicationDialog from "./application-dialog";
import { DeleteDialog } from "./applications-manager";
import LatencyChart from "./latency-chart";
import { announceCheck, ApplicationBadge, LoadError, StatusBadge } from "./parts";

const PAGE_SIZE = 100;
/** The most the API pages at once; enough for most of a day at one check a minute. */
const CHART_SIZE = 500;

const thead = "bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary";

/** One application: where each target stands, how it is configured, and its check history. */
export default function ApplicationDetail({ area, id }: { area: string; id: string }) {
  const router = useRouter();
  const application = useApplication(id);
  const app = application.data;
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // The crumb shows the application's name, not its id.
  useBreadcrumbLabel(appsPath(area, id), app?.nombre);

  const back = (
    <Link
      href={appsPath(area)}
      className="inline-flex items-center gap-1.5 rounded-sm text-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver a los aplicativos
    </Link>
  );

  if (application.isPending) {
    return (
      <div className="space-y-6">
        {back}
        <TableSkeleton label="Cargando el aplicativo" rows={8} />
      </div>
    );
  }
  if (!app) {
    const missing = application.error instanceof ApiError && application.error.status === 404;
    return (
      <div className="space-y-6">
        {back}
        {missing ? (
          <StatePanel icon={SearchX} title="Ese aplicativo no existe">
            Puede que lo hayan eliminado. La lista de aplicativos muestra los que se chequean hoy.
          </StatePanel>
        ) : (
          <LoadError error={application.error!} onRetry={() => application.refetch()} what="el aplicativo" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {back}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{app.nombre}</h1>
          <p className="break-all font-mono text-[13px] text-text-secondary">{app.url_base}</p>
          {app.descripcion && <p className="max-w-prose text-sm text-text-secondary">{app.descripcion}</p>}
          <p className="flex flex-wrap items-center gap-1.5 pt-1">
            <ApplicationBadge app={app} />
            {!app.verificar_tls && <Badge>Certificado sin verificar</Badge>}
          </p>
        </div>
        <HeaderActions app={app} onEdit={() => setEditing(true)} onDelete={() => setDeleting(true)} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TargetPanel target="api" summary={app.api} />
        {app.verificar_ui ? (
          <TargetPanel target="ui" summary={app.ui} />
        ) : (
          <section className="rounded-lg border border-border p-4">
            <h2 className="text-base font-semibold">UI</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Este aplicativo solo chequea su API. Actívalo en «Editar» para chequear también la UI.
            </p>
          </section>
        )}
      </div>

      <Settings app={app} />
      <ChecksHistory app={app} />

      {editing && <ApplicationDialog app={app} onClose={() => setEditing(false)} />}
      {deleting && <DeleteDialog app={app} onClose={() => setDeleting(false)} onDeleted={() => router.push(appsPath(area))} />}
    </div>
  );
}

function HeaderActions({ app, onEdit, onDelete }: { app: Aplicativo; onEdit: () => void; onDelete: () => void }) {
  const check = useCheckApplication();
  const update = useUpdateApplication();
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Button
        onClick={() =>
          check.mutate(app.id, {
            onSuccess: announceCheck,
            onError: (error) => toast.error(errorMessage(error), { duration: Infinity }),
          })
        }
        disabled={check.isPending}
        className="max-md:h-11"
      >
        {check.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
        Probar ahora
      </Button>
      <Button variant="outline" onClick={onEdit} className="max-md:h-11">
        <Pencil aria-hidden="true" />
        Editar
      </Button>
      <Menu
        align="end"
        triggerLabel={`Más acciones para ${app.nombre}`}
        triggerTitle="Más acciones"
        triggerClassName={buttonVariants({ variant: "ghost", size: "icon", className: "max-md:size-11" })}
        trigger={<MoreHorizontal aria-hidden="true" />}
      >
        <MenuItem
          disabled={update.isPending}
          onClick={() =>
            update.mutate(
              { id: app.id, input: { habilitado: !app.habilitado } },
              {
                onSuccess: (saved) => toast.success(`«${saved.nombre}» ${saved.habilitado ? "habilitado" : "deshabilitado"}.`),
                onError: (error) => toast.error(errorMessage(error), { duration: Infinity }),
              }
            )
          }
        >
          <Power aria-hidden="true" /> {app.habilitado ? "Deshabilitar" : "Habilitar"}
        </MenuItem>
        <MenuSeparator />
        <MenuItem onClick={onDelete}>
          <Trash2 aria-hidden="true" /> Eliminar
        </MenuItem>
      </Menu>
    </div>
  );
}

/** The newest check of one target, its last 24 hours, and what it answered. */
function TargetPanel({ target, summary }: { target: Objetivo; summary: ObjetivoResumen | null }) {
  const last = summary?.ultimo ?? null;
  const redirect = target === "ui" ? redirectTarget(last?.detalle ?? null) : null;
  const body = target === "api" && last?.detalle ? JSON.stringify(last.detalle, null, 2) : null;
  const facts: [string, React.ReactNode][] = [
    ["Código HTTP", last?.codigo_http ?? "—"],
    ["Latencia", formatLatency(last?.latencia_ms)],
    ["Disponibilidad 24 h", formatPct(summary?.disponibilidad_24h)],
    ["Chequeos 24 h", formatNumber(summary?.chequeos_24h)],
    ["Latencia media 24 h", formatLatency(summary?.latencia_media_24h_ms)],
  ];

  return (
    <section aria-labelledby={`target-${target}`} className="min-w-0 space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`target-${target}`} className="text-base font-semibold">
            {TARGET_LABEL[target]}
          </h2>
          {summary && (
            <a
              href={summary.url}
              target="_blank"
              rel="noreferrer"
              className="block break-all rounded-sm font-mono text-[13px] text-text-secondary underline-offset-2 hover:text-text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {summary.url}
            </a>
          )}
        </div>
        <StatusBadge value={last?.estado} />
      </div>
      <p className="text-[13px] tabular-nums text-text-secondary">
        {last ? `Último chequeo ${formatWhen(last.chequeado_en)}` : "Aún sin chequear. «Probar ahora» lo chequea en el acto."}
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 2xl:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0 space-y-0.5">
            <dt className="text-[13px] text-text-secondary">{label}</dt>
            <dd className="text-sm tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {last?.error && (
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-danger">Error</p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-canvas-subtle p-3 font-mono text-[13px]">{last.error}</pre>
        </div>
      )}
      {redirect && (
        <p className="text-[13px] text-text-secondary">
          Redirige a <span className="break-all font-mono text-text-primary">{redirect}</span>, que cuenta como que responde.
        </p>
      )}
      {body && (
        <details className="group rounded-md border border-border">
          <summary className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13px] font-medium select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:min-h-11 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-4 text-text-secondary transition-transform duration-150 group-open:rotate-90" aria-hidden="true" />
            Respuesta del health
          </summary>
          <pre className="max-h-64 overflow-auto border-t border-border p-3 font-mono text-[13px]">{body}</pre>
        </details>
      )}
    </section>
  );
}

function Settings({ app }: { app: Aplicativo }) {
  const facts: [string, React.ReactNode][] = [
    ["Ruta del health", <span key="h" className="break-all font-mono text-[13px]">{app.ruta_health}</span>],
    ["Ruta de la UI", <span key="u" className="break-all font-mono text-[13px]">{app.verificar_ui ? app.ruta_ui : "No se chequea"}</span>],
    ["Tiempo de espera", formatDuration(app.timeout_s)],
    ["Umbral de lentitud", formatLatency(app.umbral_lento_ms)],
    ["Certificado", app.verificar_tls ? "Se verifica" : "Sin verificar"],
    ["Chequeo automático", app.habilitado ? "Habilitado" : "Deshabilitado"],
    ["Identificador", <span key="s" className="break-all font-mono text-[13px]">{app.slug}</span>],
    ["Actualizado", <span key="a" className="tabular-nums">{formatWhen(app.actualizado_en ?? app.creado_en)}</span>],
  ];
  return (
    <section aria-labelledby="app-settings" className="space-y-3">
      <h2 id="app-settings" className="text-xl font-semibold tracking-tight">
        Configuración
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border px-4 py-3 lg:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0 space-y-0.5">
            <dt className="text-[13px] text-text-secondary">{label}</dt>
            <dd className="text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const TARGET_OPTIONS = [
  { value: "", label: "API y UI" },
  { value: "api", label: "Solo la API" },
  { value: "ui", label: "Solo la UI" },
];

/**
 * Every check in a range, newest first. Without dates the API takes today
 * (in Bogotá), and the chart above the table shows the latest checks of each
 * target in the same range.
 */
function ChecksHistory({ app }: { app: Aplicativo }) {
  const id = useId();
  const [range, setRange] = useState<IsoDateRange>({});
  const [target, setTarget] = useState("");
  const [page, setPage] = useState(1);
  const today = bogotaDay();
  const live = !range.to || range.to >= today;
  const dates = { desde: range.from, hasta: range.to };

  const history = useChecks(app.id, { ...dates, objetivo: (target || undefined) as Objetivo | undefined, page, size: PAGE_SIZE }, { live });
  const apiChart = useChecks(app.id, { ...dates, objetivo: "api", page: 1, size: CHART_SIZE }, { live });
  const uiChart = useChecks(app.id, { ...dates, objetivo: "ui", page: 1, size: CHART_SIZE }, { live, enabled: app.verificar_ui });
  const result = history.data;
  const rows = result?.items ?? [];
  const rangeText = range.from ? "en estas fechas" : "hoy";

  return (
    <section aria-labelledby="app-history" className="space-y-4">
      <div className="space-y-0.5">
        <h2 id="app-history" className="text-xl font-semibold tracking-tight">
          Historial de chequeos
        </h2>
        <p className="text-[13px] text-text-secondary">Las horas son de Bogotá. Sin fechas se ve el día de hoy.</p>
      </div>

      <form
        role="search"
        aria-label="Filtros del historial"
        onSubmit={(event) => event.preventDefault()}
        className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl"
      >
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={`${id}-range`} className="block text-[13px] font-medium">
            Fechas
          </label>
          <DateRangePicker
            id={`${id}-range`}
            label="Fechas"
            value={range}
            max={today}
            placeholder="Hoy"
            onChange={(next) => {
              setRange(next);
              setPage(1);
            }}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={`${id}-target`} className="block text-[13px] font-medium">
            Objetivo
          </label>
          <Dropdown
            id={`${id}-target`}
            aria-label="Objetivo"
            value={target}
            onValueChange={(next) => {
              setTarget(next);
              setPage(1);
            }}
            options={TARGET_OPTIONS}
            className="max-md:[&_[data-slot=dropdown-trigger]]:h-11"
          />
        </div>
      </form>

      <div className="space-y-5 rounded-lg border border-border bg-surface p-4">
        {apiChart.isPending ? (
          <div className="h-32 animate-pulse rounded-md bg-canvas-subtle" aria-hidden="true" />
        ) : apiChart.data ? (
          <LatencyChart title="Latencia de la API" checks={apiChart.data.items} threshold={app.umbral_lento_ms} />
        ) : null}
        {app.verificar_ui &&
          (uiChart.isPending ? (
            <div className="h-32 animate-pulse rounded-md bg-canvas-subtle" aria-hidden="true" />
          ) : uiChart.data ? (
            <LatencyChart title="Latencia de la UI" checks={uiChart.data.items} threshold={app.umbral_lento_ms} />
          ) : null)}
        {/* A day at one check a minute is ~1440 rows per target; paging all of a month into a chart is not worth it. */}
        {apiChart.data && apiChart.data.total > CHART_SIZE && (
          <p className="text-[13px] tabular-nums text-text-secondary">
            La gráfica cubre desde {formatWhen(apiChart.data.items.at(-1)?.chequeado_en)}: son los{" "}
            {formatNumber(CHART_SIZE)} chequeos más recientes de cada objetivo, de {formatNumber(apiChart.data.total)}. La tabla tiene todos.
          </p>
        )}
      </div>

      {history.isPending ? (
        <TableSkeleton label="Cargando el historial" rows={8} />
      ) : history.isError && !result ? (
        <LoadError error={history.error} onRetry={() => history.refetch()} what="el historial de chequeos" />
      ) : rows.length === 0 ? (
        <StatePanel icon={History} title={`Sin chequeos ${rangeText}`}>
          {app.habilitado
            ? "Aparecen con el próximo ciclo automático, o al pulsar «Probar ahora»."
            : "Está deshabilitado, así que solo se chequea con «Probar ahora». Elige fechas anteriores para ver su historial."}
        </StatePanel>
      ) : (
        <div className="space-y-3">
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Chequeos de {app.nombre}, del más reciente al más antiguo</caption>
              <thead className={thead}>
                <tr>
                  <th scope="col" className="px-3 py-2 text-right">Hora</th>
                  <th scope="col" className="px-3 py-2">Objetivo</th>
                  <th scope="col" className="px-3 py-2">Estado</th>
                  <th scope="col" className="px-3 py-2 text-right">HTTP</th>
                  <th scope="col" className="px-3 py-2 text-right">Latencia</th>
                  <th scope="col" className="px-3 py-2">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={`${row.objetivo}-${row.chequeado_en}`} className="hover:bg-primary-subtle">
                    <td className="whitespace-nowrap px-3 py-2 text-right align-top tabular-nums">{formatWhen(row.chequeado_en)}</td>
                    <td className="px-3 py-2 align-top">{TARGET_LABEL[row.objetivo]}</td>
                    <td className="px-3 py-2 align-top">
                      <StatusBadge value={row.estado} />
                    </td>
                    <td className="px-3 py-2 text-right align-top tabular-nums">{row.codigo_http ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right align-top tabular-nums">{formatLatency(row.latencia_ms)}</td>
                    <td className="max-w-md px-3 py-2 align-top">
                      <CheckDetail check={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border bg-surface md:hidden">
            {rows.map((row) => (
              <li key={`${row.objetivo}-${row.chequeado_en}`} className="space-y-1 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm tabular-nums">
                    {formatWhen(row.chequeado_en)} · {TARGET_LABEL[row.objetivo]}
                  </span>
                  <StatusBadge value={row.estado} />
                </div>
                <p className="text-[13px] tabular-nums text-text-secondary">
                  {row.codigo_http ? `HTTP ${row.codigo_http}` : "Sin código"} · {formatLatency(row.latencia_ms)}
                </p>
                <CheckDetail check={row} />
              </li>
            ))}
          </ul>

          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {formatNumber(result.total)} {result.total === 1 ? "chequeo" : "chequeos"} {rangeText}
              </span>
              <Pager page={result.page} size={result.size} total={result.total} count={rows.length} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CheckDetail({ check }: { check: Chequeo }) {
  const redirect = redirectTarget(check.detalle);
  // The same error repeats check after check; two lines tell them apart, the panel above has it whole.
  if (check.error) {
    return (
      <span title={check.error} className="line-clamp-2 break-words font-mono text-[13px]">
        {check.error}
      </span>
    );
  }
  if (redirect) return <span className="break-all text-[13px] text-text-secondary">Redirige a {redirect}</span>;
  return <span className="text-text-secondary">—</span>;
}
