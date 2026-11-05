"use client";

import { useState } from "react";
import { CloudOff, History, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/features/session/hooks/use-session";
import { isPlatformAdmin } from "@/features/session/types/session.types";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Alert } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { errorMessage } from "@/shared/lib/api-client";

import { useJobRuns, useJobs, useRunJob } from "../hooks/use-jobs";
import { RUN_STATUS, TRIGGER_LABELS, isOpenRun, type JobDto, type JobRunDto } from "../types/jobs.types";

const dateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
const when = (value: string | null) => (value ? dateTime.format(new Date(value)) : "—");

/**
 * The syncs that fill the masters. They run when the DWH publishes fresh data,
 * with a daily fallback; an administrator can also run one now. A moderator
 * reads the same board without the button.
 */
export default function JobsPanel() {
  const { data: user } = useSession();
  const canRun = isPlatformAdmin(user?.role);
  const jobs = useJobs();
  const run = useRunJob();
  const [history, setHistory] = useState<JobDto | null>(null);

  const runNow = (job: JobDto) =>
    run.mutate(job.key, {
      onSuccess: () => toast.success(`${job.label}: en cola. El estado se actualiza solo.`),
      onError: (failure) => toast.error(errorMessage(failure)),
    });

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4" aria-labelledby="jobs-title">
      <div className="space-y-1">
        <h2 id="jobs-title" className="font-semibold">Sincronización con el DWH</h2>
        <p className="max-w-prose text-sm text-text-secondary">
          Cada tarea corre sola cuando el DWH publica datos nuevos de su secuencia.
          {jobs.data &&
            ` Si un día la señal no llega, el respaldo de las ${jobs.data.fallback_at} (${jobs.data.timezone}) la corre.`}
        </p>
      </div>

      {jobs.isPending ? (
        <TableSkeleton rows={5} label="Cargando tareas" />
      ) : jobs.isError ? (
        <StatePanel
          icon={CloudOff}
          title="No se pudieron cargar las tareas"
          tone="danger"
          action={<Button variant="outline" onClick={() => void jobs.refetch()}>Reintentar</Button>}
        >
          {errorMessage(jobs.error)}
        </StatePanel>
      ) : (
        <>
          {!jobs.data.enabled && (
            <Alert>
              Las tareas automáticas están apagadas en el API (<code className="font-mono text-[13px]">JOBS_ENABLED</code>).
              Nada corre solo y «Sincronizar ahora» no está disponible.
            </Alert>
          )}
          {jobs.data.dwh.error && (
            <Alert severity="danger">
              El último sondeo al DWH falló: {jobs.data.dwh.error}. Se reintenta solo en el siguiente ciclo.
            </Alert>
          )}

          <ul className="divide-y divide-border rounded-md border border-border">
            {jobs.data.items.map((job) => {
              const open = isOpenRun(job.last_run);
              const starting = run.isPending && run.variables === job.key;
              return (
                <li
                  key={job.key}
                  className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-center"
                >
                  <div className="min-w-0 sm:col-span-2 xl:col-span-1">
                    <p className="font-medium">{job.label}</p>
                    <p className="text-[13px] text-text-secondary">{job.description}</p>
                    {job.sequence && (
                      <p className="text-[13px] text-text-secondary">
                        Secuencia <span className="font-mono">{job.sequence}</span>
                      </p>
                    )}
                  </div>
                  <dl className="space-y-1 text-[13px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <dt className="sr-only">Última ejecución</dt>
                      <dd className="flex flex-wrap items-center gap-2">
                        {job.last_run ? (
                          <>
                            <Badge tone={RUN_STATUS[job.last_run.status].tone}>
                              {open && <Loader2 className="animate-spin" aria-hidden="true" />}
                              {RUN_STATUS[job.last_run.status].label}
                            </Badge>
                            <span className="text-text-secondary">{TRIGGER_LABELS[job.last_run.trigger]}</span>
                          </>
                        ) : (
                          <span className="text-text-secondary">Aún no ha corrido</span>
                        )}
                      </dd>
                    </div>
                    {job.last_run && (
                      <div className="text-text-secondary">
                        <dt className="inline">{job.last_run.finished_at ? "Terminó " : "Empezó "}</dt>
                        <dd className="inline tabular-nums">
                          {when(job.last_run.finished_at ?? job.last_run.started_at ?? job.last_run.queued_at)}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <dl className="space-y-1 text-[13px]">
                    <div>
                      <dt className="text-text-secondary">Próxima actualización del DWH</dt>
                      <dd className="tabular-nums">{when(job.next_expected_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">Último éxito</dt>
                      <dd className="tabular-nums">{when(job.last_success_at)}</dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-1 xl:justify-end">
                    <Button variant="outline" size="sm" onClick={() => setHistory(job)} className="max-md:h-11">
                      <History aria-hidden="true" /> Historial
                    </Button>
                    {canRun && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runNow(job)}
                        disabled={!jobs.data.enabled || open || starting}
                        className="max-md:h-11"
                      >
                        {starting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
                        Sincronizar ahora
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-text-secondary">
            Último sondeo al DWH: <span className="tabular-nums">{when(jobs.data.dwh.last_poll_at)}</span>
          </p>
        </>
      )}

      <Dialog
        open={history !== null}
        onOpenChange={(open) => {
          if (!open) setHistory(null);
        }}
        title={history ? `Historial: ${history.label}` : "Historial"}
        description="Las 50 ejecuciones más recientes."
        wide
      >
        {history && <RunHistory job={history.key} />}
      </Dialog>
    </section>
  );
}

function RunHistory({ job }: { job: string }) {
  const runs = useJobRuns(job);
  if (runs.isPending) return <TableSkeleton rows={5} label="Cargando historial" />;
  if (runs.isError) return <p role="alert" className="text-sm text-danger">{errorMessage(runs.error)}</p>;
  if (runs.data.length === 0) return <p className="text-sm text-text-secondary">Esta tarea aún no ha corrido.</p>;

  return (
    <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto overscroll-contain">
      {runs.data.map((run) => (
        <RunRow key={run.id} run={run} />
      ))}
    </ul>
  );
}

function RunRow({ run }: { run: JobRunDto }) {
  const details = Object.entries(run.detail);
  return (
    <li className="space-y-1 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge tone={RUN_STATUS[run.status].tone}>{RUN_STATUS[run.status].label}</Badge>
        <span className="tabular-nums">{when(run.started_at ?? run.queued_at)}</span>
        <span className="text-text-secondary">
          {TRIGGER_LABELS[run.trigger]}
          {run.triggered_by && ` · ${run.triggered_by}`}
        </span>
        {run.started_at && run.finished_at && (
          <span className="text-text-secondary tabular-nums">{duration(run.started_at, run.finished_at)}</span>
        )}
      </div>
      {run.error && <p className="text-danger">{run.error}</p>}
      {details.length > 0 && (
        <details className="text-[13px]">
          <summary className="cursor-pointer rounded-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Detalle
          </summary>
          <dl className="mt-1 space-y-0.5">
            {details.map(([key, value]) => (
              <div key={key} className="grid gap-x-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                <dt className="font-mono text-text-secondary">{key}</dt>
                <dd className="break-words font-mono">{typeof value === "string" ? value : JSON.stringify(value)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </li>
  );
}

function duration(from: string, to: string): string {
  const seconds = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${seconds % 60} s`;
}
