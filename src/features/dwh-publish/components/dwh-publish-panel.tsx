"use client";

import { CloudOff, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/features/session/hooks/use-session";
import { isPlatformAdmin } from "@/features/session/types/session.types";
import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Alert } from "@/shared/components/ui/alert";
import { Badge, type BadgeTone } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";

import { useFailedEvents, usePublishStatus, useReconcile, useRetryFailed } from "../hooks/use-dwh-publish";
import type { FailedEvent, PublishStatus, ReconcileResult, TopicStatus } from "../types/dwh-publish.types";

const dateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
const when = (value: string | null) => (value ? dateTime.format(new Date(value)) : "—");
const number = (value: number) => value.toLocaleString("es-CO");

const TOPIC_LABELS: Record<string, string> = {
  supplier_support: "Apoyos",
  supplier_support_load: "Cargas masivas",
};
const topicLabel = (topic: string) => TOPIC_LABELS[topic] ?? topic;

function pausedUntil(status: PublishStatus): Date | null {
  if (!status.paused_until) return null;
  const until = new Date(status.paused_until);
  return until.getTime() > Date.now() ? until : null;
}

/** One word for the whole publisher, in the order an administrator has to act on it. */
function overall(status: PublishStatus): { label: string; tone: BadgeTone } {
  const paused = pausedUntil(status);
  if (!status.configured) return { label: "Sin configurar", tone: "warning" };
  if (!status.enabled) return { label: "Apagado", tone: "neutral" };
  if (paused) return { label: `Pausado hasta ${dateTime.format(paused)}`, tone: "warning" };
  if (status.topics.some((topic) => topic.failed > 0)) return { label: "Con fallidos", tone: "danger" };
  if (status.topics.some((topic) => topic.pending > 0)) return { label: "Publicando", tone: "info" };
  return { label: "Al día", tone: "success" };
}

/**
 * Publication of the supplier supports to the DWH, for administrators: what is
 * queued, failed and published per topic, the failed events to send again, and
 * a reconcile on demand. Nothing on the platform waits for the warehouse; this
 * board is where a stuck queue shows.
 */
export default function DwhPublishPanel() {
  const { data: user } = useSession();
  const isAdmin = isPlatformAdmin(user?.role);
  const status = usePublishStatus(isAdmin);
  const anyFailed = status.data?.topics.some((topic) => topic.failed > 0) ?? false;
  const failed = useFailedEvents(isAdmin && anyFailed);
  const retry = useRetryFailed();
  const reconcile = useReconcile();

  if (!isAdmin) return null;

  const retryEvents = (ids?: number[]) =>
    retry.mutate(ids, {
      onSuccess: ({ requeued }) =>
        toast.success(requeued === 1 ? "1 evento volvió a la cola." : `${number(requeued)} eventos volvieron a la cola.`),
      onError: (failure) => toast.error(errorMessage(failure)),
    });

  const reconcileNow = () =>
    reconcile.mutate(undefined, {
      onSuccess: (results) => {
        const queued = results.reduce((sum, result) => sum + result.queued, 0);
        toast.success(
          queued === 0
            ? "Conciliado: el DWH tiene todo lo de la plataforma."
            : `Conciliado: ${number(queued)} ${queued === 1 ? "registro faltaba y volvió" : "registros faltaban y volvieron"} a la cola.`
        );
      },
      onError: (failure) => toast.error(errorMessage(failure)),
    });

  const data = status.data;
  const state = data ? overall(data) : null;
  const paused = data ? pausedUntil(data) : null;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4" aria-labelledby="dwh-publish-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="dwh-publish-title" className="font-semibold">Publicación de apoyos al DWH</h2>
            {state && <Badge tone={state.tone}>{state.label}</Badge>}
          </div>
          <p className="max-w-prose text-sm text-text-secondary">
            Cada cambio de un apoyo o de una carga masiva espera en una cola de la plataforma y se envía al esquema{" "}
            <code className="font-mono text-[13px]">plataforma</code> del DWH en segundo plano. Solo lo ven los
            administradores.
          </p>
        </div>
        {data && (
          <Button
            variant="outline"
            size="sm"
            onClick={reconcileNow}
            disabled={reconcile.isPending || !data.configured}
            className="shrink-0 max-md:h-11"
          >
            {reconcile.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
            Conciliar ahora
          </Button>
        )}
      </div>

      {status.isPending ? (
        <TableSkeleton rows={2} label="Cargando el estado de la publicación" />
      ) : status.isError || !data ? (
        <StatePanel
          icon={CloudOff}
          title="No se pudo leer el estado de la publicación"
          tone="danger"
          action={
            <Button variant="outline" onClick={() => void status.refetch()}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(status.error)}
        </StatePanel>
      ) : (
        <>
          {!data.configured ? (
            <Alert severity="warning">
              Falta la conexión de escritura al DWH (<code className="font-mono text-[13px]">DWH_WRITER_*</code>). Los
              cambios se guardan en la cola y salen cuando se configure.
            </Alert>
          ) : !data.enabled ? (
            <Alert>
              El publicador está apagado en el API (<code className="font-mono text-[13px]">DWH_PUBLISH_ENABLED</code>).
              La cola se llena y se envía al encenderlo.
            </Alert>
          ) : paused ? (
            <Alert severity="warning">
              El DWH falló varias veces seguidas y el publicador descansa hasta {dateTime.format(paused)}. Reintentar los
              fallidos levanta la pausa.
            </Alert>
          ) : null}
          {data.last_error && <Alert severity="danger">Último error del publicador: {data.last_error}</Alert>}

          <Topics topics={data.topics} />

          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
            <div>
              <dt className="inline text-text-secondary">Última pasada: </dt>
              <dd className="inline tabular-nums">{when(data.last_run_at)}</dd>
            </div>
            <div>
              <dt className="inline text-text-secondary">Último envío sin error: </dt>
              <dd className="inline tabular-nums">{when(data.last_success_at)}</dd>
            </div>
            <div>
              <dt className="inline text-text-secondary">Última conciliación: </dt>
              <dd className="inline tabular-nums">{when(data.last_reconcile_at)}</dd>
            </div>
          </dl>

          {data.last_reconcile.length > 0 && <Reconcile results={data.last_reconcile} />}

          {anyFailed && (
            <Failed
              query={failed}
              retrying={retry.isPending ? (retry.variables ?? "all") : null}
              onRetry={retryEvents}
            />
          )}
        </>
      )}
    </section>
  );
}

const headClass = "bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary";

function Topics({ topics }: { topics: TopicStatus[] }) {
  if (topics.length === 0) {
    return <p className="text-sm text-text-secondary">Aún no se ha encolado nada para el DWH.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Pendientes, fallidos y publicados por tema</caption>
        <thead className={headClass}>
          <tr>
            <th scope="col" className="px-3 py-2">Tema</th>
            <th scope="col" className="px-3 py-2 text-right">Pendientes</th>
            <th scope="col" className="px-3 py-2 text-right">Fallidos</th>
            <th scope="col" className="px-3 py-2 text-right">Publicados</th>
            <th scope="col" className="px-3 py-2">Pendiente más antiguo</th>
            <th scope="col" className="px-3 py-2">Última publicación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {topics.map((topic) => (
            <tr key={topic.topic} className="align-top">
              <td className="px-3 py-2">
                <span className="block font-medium">{topicLabel(topic.topic)}</span>
                {topic.last_error && <span className="block max-w-md text-[13px] text-danger">{topic.last_error}</span>}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{number(topic.pending)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {topic.failed > 0 ? <Badge tone="danger">{number(topic.failed)}</Badge> : "0"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{number(topic.published)}</td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">{when(topic.oldest_pending_at)}</td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">{when(topic.last_published_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Reconcile({ results }: { results: ReconcileResult[] }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer rounded-sm text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        Resultado de la última conciliación
      </summary>
      <div className="mt-2 overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className={headClass}>
            <tr>
              <th scope="col" className="px-3 py-2">Tema</th>
              <th scope="col" className="px-3 py-2 text-right">En la plataforma</th>
              <th scope="col" className="px-3 py-2 text-right">En el DWH</th>
              <th scope="col" className="px-3 py-2 text-right">Encolados de nuevo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border tabular-nums">
            {results.map((result) => (
              <tr key={result.topic}>
                <td className="px-3 py-2">{topicLabel(result.topic)}</td>
                <td className="px-3 py-2 text-right">{number(result.local)}</td>
                <td className="px-3 py-2 text-right">{number(result.remote)}</td>
                <td className="px-3 py-2 text-right">{number(result.queued)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Failed({
  query,
  retrying,
  onRetry,
}: {
  query: ReturnType<typeof useFailedEvents>;
  /** The ids being sent again, "all", or null when nothing is. */
  retrying: number[] | "all" | null;
  onRetry: (ids?: number[]) => void;
}) {
  const events = query.data ?? [];
  const busy = retrying !== null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Fallidos</h3>
          <p className="text-[13px] text-text-secondary">
            El DWH los rechazó en todos los intentos. Revisa el error y envíalos de nuevo: vuelven a la cola desde cero.
          </p>
        </div>
        {events.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => onRetry()} disabled={busy} className="max-md:h-11">
            {retrying === "all" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
            Reintentar todos
          </Button>
        )}
      </div>
      {query.isPending ? (
        <TableSkeleton rows={3} label="Cargando los fallidos" />
      ) : query.isError ? (
        <p role="alert" className="text-sm text-danger">{errorMessage(query.error)}</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-text-secondary">Ya no hay fallidos: alguien los reintentó hace un momento.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {events.map((event) => (
            <FailedRow
              key={event.id}
              event={event}
              pending={Array.isArray(retrying) && retrying.includes(event.id)}
              disabled={busy}
              onRetry={() => onRetry([event.id])}
            />
          ))}
        </ul>
      )}
      {events.length >= 100 && (
        <p className="text-[13px] text-text-secondary">Se muestran los 100 más recientes. «Reintentar todos» incluye el resto.</p>
      )}
    </div>
  );
}

function FailedRow({
  event,
  pending,
  disabled,
  onRetry,
}: {
  event: FailedEvent;
  pending: boolean;
  disabled: boolean;
  onRetry: () => void;
}) {
  return (
    <li className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-0.5">
        <p className="flex flex-wrap items-center gap-x-2">
          <span className="font-medium">{topicLabel(event.topic)}</span>
          <span className="break-all font-mono text-[13px] text-text-secondary">{event.entity_id}</span>
        </p>
        <p className="text-[13px] text-text-secondary tabular-nums">
          Versión {event.version} · {event.attempts} {event.attempts === 1 ? "intento" : "intentos"} · encolado{" "}
          {when(event.created_at)}
        </p>
        {event.last_error && <p className="break-words text-[13px] text-danger">{event.last_error}</p>}
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} disabled={disabled} className="shrink-0 self-start max-md:h-11">
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
        Reintentar
      </Button>
    </li>
  );
}
