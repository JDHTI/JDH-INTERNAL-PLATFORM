"use client";

import Link from "next/link";
import { CloudOff, DatabaseZap, Lock, RefreshCw } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import {
  bogotaDay,
  dwhPath,
  formatClock,
  formatNumber,
  formatTimeOfDay,
  formatWhen,
  RELIABLE_RUNS,
  runStatus,
} from "../lib/format";

/** One heading per page, what it answers in one line, and room on the right for the load status. */
export function PageHeader({
  title,
  description,
  aside,
}: {
  title: string;
  description: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-prose text-sm text-text-secondary">{description}</p>
      </div>
      {aside}
    </div>
  );
}

export function RunStatusBadge({ status }: { status: string | null | undefined }) {
  const { label, tone } = runStatus(status);
  return <Badge tone={tone}>{label}</Badge>;
}

/**
 * How many runs a median stands on, next to every ETA. Below five the
 * estimate is a guess, and it is written, not coloured.
 */
export function MeasuredRuns({ count, className }: { count: number | null | undefined; className?: string }) {
  if (count === null || count === undefined) return null;
  const weak = count < RELIABLE_RUNS;
  return (
    <span className={cn("text-[13px] text-text-secondary", className)}>
      {formatNumber(count)} {count === 1 ? "corrida medida" : "corridas medidas"}
      {weak && <span className="font-medium text-warning"> · poco fiable</span>}
    </span>
  );
}

export function TableSkeleton({ rows = 5, label }: { rows?: number; label: string }) {
  return (
    <div className="space-y-2" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="h-10 animate-pulse rounded-md bg-canvas-subtle" />
      ))}
    </div>
  );
}

/**
 * What failed, in the reader's words, with a retry. 403 is its own screen: it
 * says who gives access instead of offering a retry that would fail again.
 */
export function LoadError({ error, onRetry, what }: { error: Error; onRetry: () => void; what: string }) {
  if (error instanceof ApiError && error.status === 403) {
    return (
      <StatePanel icon={Lock} title="El monitoreo del datawarehouse es del área de TI">
        Lo ven los miembros de TI y los administradores de la plataforma. Pide acceso al área de TI si lo necesitas.
      </StatePanel>
    );
  }
  const missing = error instanceof ApiError && error.status === 404;
  return (
    <StatePanel
      icon={CloudOff}
      tone="danger"
      title={missing ? "El monitoreo del datawarehouse todavía no está disponible" : `No se pudo cargar ${what}`}
      action={
        <Button variant="outline" onClick={onRetry}>
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

/** Before the first copy from the warehouse there is nothing to show, and the reason is said. */
export function NoLoadYet({ enabled }: { enabled: boolean }) {
  return (
    <StatePanel icon={DatabaseZap} title="Todavía no hay datos del datawarehouse">
      {enabled
        ? "La plataforma copia el esquema de monitoreo del DWH en segundo plano y aún no termina la primera carga. Los datos aparecen aquí cuando termine."
        : "La carga desde el DWH está apagada en la API (DWH_MONITORING_SYNC_ENABLED). Cuando se encienda, la primera copia aparece aquí."}
    </StatePanel>
  );
}

/** Link to a sequence's own page, with the name as the warehouse writes it. */
export function SequenceLink({ area, secuencia, className }: { area: string; secuencia: string; className?: string }) {
  return (
    <Link
      href={dwhPath(area, `secuencias/${encodeURIComponent(secuencia)}`)}
      className={cn(
        "rounded-sm font-mono text-[13px] font-medium text-text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      {secuencia}
    </Link>
  );
}

/**
 * When the data of a sequence is ready: the real time when it already
 * happened, the estimate otherwise, marked as such, with the typical time and
 * the runs the estimate stands on.
 */
export function ReadyTime({
  ready,
  eta,
  typical,
  runs,
  todayOnly = false,
}: {
  ready: string | null;
  eta: string | null;
  typical?: string | null;
  runs: number | null;
  /** In a list about today, an estimate for another day means today's data will not be ready. */
  todayOnly?: boolean;
}) {
  const notToday = todayOnly && !ready && eta !== null && bogotaDay(eta) !== bogotaDay();
  const typicalText = typical ? `típico ${formatTimeOfDay(typical)}` : null;
  const secondary = "whitespace-nowrap text-[13px] tabular-nums text-text-secondary";
  return (
    <span className="flex flex-col gap-0.5">
      {ready ? (
        <>
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{formatClock(ready)}</span>
          <span className={secondary}>Listos{typicalText && ` · ${typicalText}`}</span>
        </>
      ) : notToday ? (
        <>
          <span className="text-sm font-semibold">Hoy no quedaron listos</span>
          <span className={secondary}>Próxima estimada {formatWhen(eta)}</span>
        </>
      ) : eta ? (
        <>
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{formatWhen(eta)}</span>
          <span className={secondary}>Estimada{typicalText && ` · ${typicalText}`}</span>
        </>
      ) : (
        <>
          <span className="text-sm text-text-secondary">Sin estimación</span>
          {typicalText && <span className={secondary}>{typicalText.charAt(0).toUpperCase() + typicalText.slice(1)}</span>}
        </>
      )}
      {!ready && eta && <MeasuredRuns count={runs} />}
    </span>
  );
}
