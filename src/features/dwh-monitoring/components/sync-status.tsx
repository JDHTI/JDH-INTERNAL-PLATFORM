"use client";

import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";

import { useRequestSync, useSyncStatus } from "../hooks/use-dwh-monitoring";
import { formatDuration, formatWhen, LOAD_STATUS } from "../lib/format";
import type { EstadoCargaDwh } from "../types/dwh-monitoring.types";

/**
 * How current the screen is. Everything here is a copy the API refreshes in
 * the background, so the time of the last good copy sits on every page, and a
 * failed or partial last cycle is said out loud next to it. Only the summary
 * offers «Actualizar ahora»: one primary action per screen.
 */
export default function SyncStatus({ withAction = false }: { withAction?: boolean }) {
  const sync = useSyncStatus();
  const request = useRequestSync();
  const status = sync.data;

  if (!status) {
    return sync.isPending ? <div className="h-9 w-56 animate-pulse rounded-md bg-canvas-subtle" aria-hidden="true" /> : null;
  }

  const ask = () =>
    request.mutate(undefined, {
      onSuccess: () => toast.success("Carga pedida. Los datos se actualizan en unos minutos."),
      onError: (error) => toast.error(errorMessage(error), { duration: Infinity }),
    });

  return (
    <div className="flex shrink-0 flex-col gap-1 md:items-end">
      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        <p className="text-sm text-text-secondary" aria-live="polite">
          {status.ultima_exitosa ? (
            <>
              Datos actualizados <span className="font-medium text-text-primary tabular-nums">{formatWhen(status.ultima_exitosa)}</span>
            </>
          ) : (
            "Sin carga todavía"
          )}
        </p>
        {withAction && (
          <Button onClick={ask} disabled={request.isPending || !status.habilitada} className="max-md:h-11">
            {request.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
            Actualizar ahora
          </Button>
        )}
      </div>
      {withAction && !status.habilitada && (
        <p className="text-[13px] text-text-secondary">La carga automática está apagada en la API.</p>
      )}
      {withAction && status.habilitada && (
        <p className="text-[13px] text-text-secondary">Se actualiza sola cada {formatDuration(status.intervalo_s)}.</p>
      )}
    </div>
  );
}

/** A failed or partial last cycle, said in a band above the content. Quiet when the last cycle went well. */
export function LoadWarning({ status }: { status: EstadoCargaDwh | undefined }) {
  const last = status?.ultima;
  if (!last || !last.estado || last.estado === "success") return null;
  const failedViews = Object.entries(last.detalle)
    .filter(([, view]) => view.error)
    .map(([name]) => name);
  const { label } = LOAD_STATUS[last.estado];
  return (
    <div role="alert" className="flex gap-3 rounded-lg bg-warning-surface px-4 py-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold text-text-primary">
          La última carga desde el datawarehouse ({formatWhen(last.iniciado_en)}) quedó {label.toLowerCase()}
        </p>
        <p className="text-text-secondary">
          {last.estado === "failed"
            ? "Las pantallas muestran la última copia buena."
            : "Las vistas que fallaron conservan su copia anterior."}
          {failedViews.length > 0 && (
            <>
              {" "}
              Fallaron: <span className="font-mono text-[13px] text-text-primary">{failedViews.join(", ")}</span>.
            </>
          )}
        </p>
        {last.error && <p className="break-words font-mono text-[13px] text-text-primary">{last.error}</p>}
      </div>
    </div>
  );
}
