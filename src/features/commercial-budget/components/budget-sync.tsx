"use client";

import { useEffect, useRef } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";

import { isSyncing, useBudgetSync, useStartSync } from "../hooks/use-commercial-budget";
import { formatMoment } from "../lib/format";
import type { SyncRun } from "../types/commercial-budget.types";

/** «N meses», for the end of a run. */
const monthsText = (run: SyncRun) => `${run.months.length} ${run.months.length === 1 ? "mes" : "meses"}`;

/** Who ran it: the person on a manual run, «automática» when it ran by itself. */
const whoText = (run: SyncRun) => (run.trigger === "manual" ? (run.triggered_by ?? "manual") : "automática");

/**
 * «Sincronizar ventas»: the copy runs in the background (API #139), so the button only queues
 * it and the latest run is read every 5 seconds while it lasts. When the run started here
 * ends, a toast says how it went; the board reloads whoever started it. Next to the button,
 * the last finished sync and who ran it.
 */
export default function BudgetSync({ canManage }: { canManage: boolean }) {
  const latest = useBudgetSync();
  const start = useStartSync();
  const run = latest.data ?? null;
  const running = isSyncing(run?.status);
  // The run started from this button: only its end is announced.
  const startedHere = useRef<string | null>(null);

  useEffect(() => {
    if (!run || run.id !== startedHere.current || isSyncing(run.status)) return;
    startedHere.current = null;
    if (run.status === "failed") {
      toast.error(`La sincronización falló: ${run.error ?? "sin detalle"}.`, { duration: Infinity });
    } else {
      const pending = run.pending.length;
      toast.success(
        `Ventas sincronizadas: ${monthsText(run)}.${
          pending > 0 ? ` Faltan ${pending} ${pending === 1 ? "mes" : "meses"} de historia; se copian en las próximas sincronizaciones.` : ""
        }`
      );
    }
  }, [run]);

  const begin = () =>
    start.mutate(undefined, {
      onSuccess: (queued) => {
        startedHere.current = queued.id;
      },
      onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
    });

  const progress = running ? (run?.status === "queued" ? "En cola" : "Sincronizando…") : null;
  const last = run?.finished_at ? `Última sincronización: ${formatMoment(run.finished_at)}, ${whoText(run)}` : null;
  // A failed run reads in the page until the next one, not only in a toast.
  const failed = !running && run?.status === "failed";

  if (!canManage && !last) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {canManage && (
        <Button
          variant="outline"
          onClick={begin}
          disabled={running || start.isPending}
          title="Copia del DWH el maestro de vendedores y las ventas del mes en curso, el anterior y la historia que falte. Corre en segundo plano: puedes seguir trabajando."
          className="max-md:h-11"
        >
          {running || start.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
          {progress ?? "Sincronizar ventas"}
        </Button>
      )}
      <span className="sr-only" aria-live="polite">
        {progress ? `Sincronización de ventas: ${progress}` : ""}
      </span>
      {last && <span className="text-xs text-text-secondary">{last}</span>}
      {failed && (
        <span role="alert" className="text-xs text-danger">
          Falló: {run?.error ?? "sin detalle"}
        </span>
      )}
    </div>
  );
}
