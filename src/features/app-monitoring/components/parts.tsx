"use client";

import { CloudOff, Loader2, Lock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { formatDuration, formatPct, formatWhen } from "@/features/dwh-monitoring/lib/format";
import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useRequestCheckCycle } from "../hooks/use-app-monitoring";
import { applicationStatus, formatLatency, status, TARGET_LABEL } from "../lib/format";
import type { Aplicativo, AplicativosOverview, Estado, Objetivo, ObjetivoResumen } from "../types/app-monitoring.types";

export function StatusBadge({ value }: { value: Estado | null | undefined }) {
  const { label, tone } = status(value);
  return <Badge tone={tone}>{label}</Badge>;
}

export function ApplicationBadge({ app }: { app: Aplicativo }) {
  const { label, tone } = applicationStatus(app);
  return <Badge tone={tone}>{label}</Badge>;
}

/**
 * What failed, in the reader's words, with a retry. 403 is its own screen: it
 * says who gives access instead of offering a retry that would fail again.
 */
export function LoadError({ error, onRetry, what }: { error: Error; onRetry: () => void; what: string }) {
  if (error instanceof ApiError && error.status === 403) {
    return (
      <StatePanel icon={Lock} title="El monitoreo es del área de TI">
        Lo ven los miembros de TI y los administradores de la plataforma. Pide acceso al área de TI si lo necesitas.
      </StatePanel>
    );
  }
  const missing = error instanceof ApiError && error.status === 404;
  return (
    <StatePanel
      icon={CloudOff}
      tone="danger"
      title={missing ? "El monitoreo de aplicativos todavía no está disponible" : `No se pudo cargar ${what}`}
      action={
        <Button variant="outline" onClick={onRetry} className="max-md:h-11">
          <RefreshCw aria-hidden="true" /> Reintentar
        </Button>
      }
    >
      {missing
        ? "La API aún no publica este módulo. Cuando se despliegue, los datos aparecerán aquí sin cambios en esta pantalla."
        : errorMessage(error)}
    </StatePanel>
  );
}

/**
 * When the applications were last checked and how often they are. Only the
 * board offers «Chequear ahora»: one primary action per screen.
 */
export function CheckCycle({ overview, withAction = false }: { overview: AplicativosOverview | undefined; withAction?: boolean }) {
  const request = useRequestCheckCycle();
  if (!overview) return null;
  const auto = overview.chequeo_automatico;

  const ask = () =>
    request.mutate(undefined, {
      onSuccess: () => toast.success("Chequeo pedido. Los resultados aparecen en unos segundos."),
      onError: (error) => toast.error(errorMessage(error), { duration: Infinity }),
    });

  return (
    <div className="flex shrink-0 flex-col gap-1 md:items-end">
      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        <p className="text-sm text-text-secondary" aria-live="polite">
          {overview.ultimo_chequeo ? (
            <>
              Último chequeo <span className="font-medium text-text-primary tabular-nums">{formatWhen(overview.ultimo_chequeo)}</span>
            </>
          ) : (
            "Sin chequeos todavía"
          )}
        </p>
        {withAction && (
          <Button onClick={ask} disabled={request.isPending || !auto.habilitado} className="max-md:h-11">
            {request.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
            Chequear ahora
          </Button>
        )}
      </div>
      <p className="text-[13px] text-text-secondary">
        {auto.habilitado
          ? `Se chequean solos cada ${formatDuration(auto.intervalo_s)}.`
          : "El chequeo automático está apagado en la API (APP_MONITORING_ENABLED)."}
      </p>
    </div>
  );
}

/**
 * One target's last check in a line: its state, the latency of that check and
 * the last 24 hours' availability. The state carries text; the numbers are
 * secondary.
 */
export function TargetLine({
  target,
  summary,
  checksUi = true,
  className,
}: {
  target: Objetivo;
  summary: ObjetivoResumen | null;
  /** False when the application does not check its UI. */
  checksUi?: boolean;
  className?: string;
}) {
  const last = summary?.ultimo ?? null;
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <span className="w-8 shrink-0 text-[13px] font-medium text-text-secondary">{TARGET_LABEL[target]}</span>
      {!checksUi ? (
        <span className="text-[13px] text-text-secondary">No se chequea</span>
      ) : (
        <>
          <StatusBadge value={last?.estado} />
          {last && (
            <span className="whitespace-nowrap text-[13px] tabular-nums text-text-secondary">
              {last.latencia_ms !== null ? formatLatency(last.latencia_ms) : last.codigo_http ? `HTTP ${last.codigo_http}` : "sin respuesta"}
              {summary?.disponibilidad_24h !== null && summary?.disponibilidad_24h !== undefined && (
                <> · {formatPct(summary.disponibilidad_24h)} en 24 h</>
              )}
            </span>
          )}
        </>
      )}
    </div>
  );
}

/**
 * The newest error among the targets that are not up, to say why without
 * opening the page. `raw` marks the server's own error text, shown in mono.
 */
export function currentProblem(app: Aplicativo): { target: Objetivo; text: string; raw: boolean } | null {
  for (const target of ["api", "ui"] as const) {
    const last = app[target]?.ultimo;
    if (!last || last.estado === "up") continue;
    if (last.error) return { target, text: last.error, raw: true };
    if (last.estado === "down" && last.codigo_http) return { target, text: `Respondió HTTP ${last.codigo_http}`, raw: false };
    if (last.estado === "degraded") {
      return {
        target,
        raw: false,
        text:
          last.latencia_ms !== null && last.latencia_ms > app.umbral_lento_ms
            ? `Tardó ${formatLatency(last.latencia_ms)}; el umbral es ${formatLatency(app.umbral_lento_ms)}`
            : "El health reporta un componente que no está sano",
      };
    }
  }
  return null;
}

/**
 * The toast after «Probar ahora»: what came out, so nobody has to look for
 * the row. A failure stays until it is dismissed, like every error toast.
 */
export function announceCheck(app: Aplicativo) {
  const { label } = status(app.estado);
  const problem = currentProblem(app);
  const message = `«${app.nombre}»: ${label.toLowerCase()}`;
  if (app.estado === "up") toast.success(message);
  else if (app.estado === "down") toast.error(message, { description: problem?.text, duration: Infinity });
  else toast.warning(message, { description: problem?.text });
}
