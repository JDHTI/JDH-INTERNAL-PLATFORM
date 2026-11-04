"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge, type BadgeTone } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";

import { useSyncRuns, useSyncStatus } from "../../hooks/use-directory";
import { useDirectoryMutation } from "../../hooks/use-directory-mutation";
import { requestSync } from "../../services/directory.service";
import type { SyncRun } from "../../types/directory.types";

const dateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

const STATUS: Record<SyncRun["status"], { label: string; tone: BadgeTone }> = {
  running: { label: "En curso", tone: "info" },
  success: { label: "Completada", tone: "success" },
  failed: { label: "Falló", tone: "danger" },
};

/** The counts worth reading, in the order a person asks about them. */
const COUNT_LABELS: [string, string][] = [
  ["total", "Personas"],
  ["created", "Nuevas"],
  ["updated", "Actualizadas"],
  ["deactivated", "Desactivadas"],
  ["photos", "Fotos"],
  ["without_site", "Sin sede"],
  ["errors", "Errores"],
];

function CountsLine({ counts }: { counts: Record<string, number> }) {
  return (
    <span className="tabular-nums">
      {COUNT_LABELS.filter(([key]) => key in counts)
        .map(([key, label]) => `${label}: ${counts[key]}`)
        .join(" · ")}
    </span>
  );
}

export default function SyncPanel() {
  const status = useSyncStatus();
  const runs = useSyncRuns(20);
  const { busy, error, run } = useDirectoryMutation();

  const start = async () => {
    const outcome = await run("sync", requestSync);
    if (outcome.ok) toast.success("Sincronización en marcha. Tarda alrededor de un minuto.");
  };

  if (status.isPending) {
    return <div className="h-32 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando la sincronización" />;
  }

  if (status.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <CloudOff className="size-4 text-danger" aria-hidden="true" />
          No se pudo leer el estado de la sincronización
        </span>
        <span className="text-text-secondary">{errorMessage(status.error)}</span>
        <Button variant="outline" size="sm" onClick={() => status.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const sync = status.data;
  const latest = sync.latest;
  const history = runs.data?.items ?? [];

  return (
    <section aria-labelledby="sync-heading" className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 id="sync-heading" className="text-base font-semibold">
            Sincronización con Microsoft Entra
          </h2>
          <p className="text-sm text-text-secondary">
            {sync.enabled
              ? `Corre cada día a las ${sync.scheduled_at} (${sync.timezone}).${
                  sync.next_run_at ? ` La próxima: ${dateTime.format(new Date(sync.next_run_at))}.` : ""
                }`
              : "Está apagada en este entorno (DIRECTORY_SYNC_ENABLED). El directorio solo cambia por la importación o a mano."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={start}
          disabled={!sync.enabled || sync.running || busy === "sync"}
        >
          <RefreshCw className={sync.running ? "motion-safe:animate-spin" : undefined} aria-hidden="true" />
          {sync.running ? "Sincronizando…" : "Sincronizar ahora"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {latest ? (
        <div className="space-y-1 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Última corrida:</span>
            <Badge tone={STATUS[latest.status].tone}>{STATUS[latest.status].label}</Badge>
            <span className="text-text-secondary">{dateTime.format(new Date(latest.started_at))}</span>
          </p>
          {latest.status !== "running" && (
            <p className="text-text-secondary">
              <CountsLine counts={latest.counts} />
            </p>
          )}
          {latest.error_message && <p className="text-danger">{latest.error_message}</p>}
        </div>
      ) : (
        <p className="text-sm text-text-secondary">Todavía no hay ninguna corrida registrada.</p>
      )}

      {history.length > 1 && (
        <details className="group">
          <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:min-h-0">
            Historial ({history.length})
          </summary>
          <div className="mt-2 overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-canvas-subtle text-xs text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Inicio</th>
                  <th scope="col" className="px-3 py-2 font-medium">Origen</th>
                  <th scope="col" className="px-3 py-2 font-medium">Estado</th>
                  <th scope="col" className="px-3 py-2 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 whitespace-nowrap">{dateTime.format(new Date(item.started_at))}</td>
                    <td className="px-3 py-2 text-text-secondary">
                      {item.trigger === "scheduled" ? "Programada" : item.triggered_by ?? "Manual"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Badge>
                    </td>
                    <td className="px-3 py-2 text-text-secondary">
                      {item.error_message ?? <CountsLine counts={item.counts} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
