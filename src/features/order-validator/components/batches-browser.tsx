"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudOff, FileSpreadsheet, FileX2, Loader2, MoreHorizontal, RefreshCw, Trash2, Upload } from "lucide-react";

import Pager from "@/shared/components/pager";
import StatePanel from "@/shared/components/state-panel";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Menu, MenuItem } from "@/shared/components/ui/menu";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useBatches, useCanManageValidations, useUploadBatch } from "../hooks/use-order-validator";
import {
  ACCEPTED_EXTENSIONS,
  THRESHOLD_MAX,
  THRESHOLD_MIN,
  formatDateTime,
  hasAcceptedExtension,
  parseThresholdPoints,
} from "../lib/format";
import type { ValidationBatch } from "../types/order-validator.types";
import DeleteBatchDialog from "./delete-batch-dialog";

const PAGE_SIZE = 20;
const numberFormat = new Intl.NumberFormat("es-CO");

/** Uploaded files, newest first, and where a manager adds the next one. */
export default function BatchesBrowser({ basePath }: { basePath: string }) {
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<ValidationBatch | null>(null);
  const canManage = useCanManageValidations();
  const batches = useBatches(page, PAGE_SIZE);
  const result = batches.data;
  const items = result?.items ?? [];

  return (
    <div className="space-y-4">
      {canManage && <UploadZone basePath={basePath} />}
      <DeleteBatchDialog batch={toDelete} onClose={() => setToDelete(null)} />

      {batches.isPending ? (
        <div className="h-48 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando archivos" />
      ) : batches.isError && !result ? (
        <LoadError error={batches.error} onRetry={() => batches.refetch()} />
      ) : items.length === 0 ? (
        <StatePanel icon={FileX2} title="Aún no hay archivos validados">
          {canManage
            ? "Sube el reporte de pedidos retenidos de SIESA y cada pedido se revisa contra el maestro de apoyos."
            : "Cuando alguien con permiso suba el reporte de pedidos retenidos, aparecerá aquí."}
        </StatePanel>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-max text-left text-sm">
              <caption className="sr-only">Archivos de pedidos retenidos</caption>
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2">Archivo</th>
                  <th scope="col" className="px-3 py-2">Subido</th>
                  <th scope="col" className="px-3 py-2 text-right">Pedidos listos</th>
                  <th scope="col" className="px-3 py-2 text-right">Pedidos pendientes</th>
                  <th scope="col" className="px-3 py-2 text-right">Líneas listas</th>
                  <th scope="col" className="px-3 py-2 text-right">Líneas pendientes</th>
                  {canManage && (
                    <th scope="col" className="w-12 px-3 py-2">
                      <span className="sr-only">Acciones</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((batch) => (
                  <tr key={batch.id} className="h-10 hover:bg-primary-subtle">
                    <td className="max-w-80 px-3 py-2">
                      <Link
                        href={`${basePath}/${batch.id}`}
                        className="block truncate rounded-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {batch.file_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span className="block whitespace-nowrap tabular-nums">{formatDateTime(batch.uploaded_at)}</span>
                      <span className="block text-xs text-text-secondary">{batch.uploaded_by}</span>
                    </td>
                    <Count value={batch.ready_order_count} of={batch.order_count} />
                    <Count value={batch.pending_order_count} of={batch.order_count} />
                    <Count value={batch.ready_line_count} of={batch.line_count} />
                    <Count value={batch.pending_line_count} of={batch.line_count} />
                    {canManage && (
                      <td className="px-3 py-1 text-right">
                        <Menu
                          align="end"
                          trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
                          triggerClassName={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                          triggerLabel={`Acciones del archivo ${batch.file_name}`}
                        >
                          <MenuItem onClick={() => setToDelete(batch)}>
                            <Trash2 aria-hidden="true" /> Eliminar archivo
                          </MenuItem>
                        </Menu>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs tabular-nums text-text-secondary">
                {numberFormat.format(result.total)} {result.total === 1 ? "archivo" : "archivos"}
              </span>
              <Pager page={result.page} size={result.size} total={result.total} count={items.length} onPageChange={setPage} />
            </div>
          )}
          {batches.isError && (
            <p role="alert" className="text-sm text-danger">
              {errorMessage(batches.error)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Count({ value, of }: { value: number; of: number }) {
  return (
    <td className="px-3 py-2 text-right tabular-nums">
      {numberFormat.format(value)}
      <span className="text-text-secondary"> de {numberFormat.format(of)}</span>
    </td>
  );
}

/**
 * Drop target and button for the SIESA report. The file is sent as soon as it
 * is chosen: there is nothing else to fill in, and the API validates every
 * line before it answers, so the button says so while it waits.
 */
function UploadZone({ basePath }: { basePath: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState("");
  const thresholdId = useId();
  const upload = useUploadBatch();

  const send = (file: File | undefined) => {
    if (!file || upload.isPending) return;
    if (!hasAcceptedExtension(file.name)) {
      setError(`El archivo debe ser ${ACCEPTED_EXTENSIONS.join(", ")}. Elegiste "${file.name}".`);
      return;
    }
    const thresholdPoints = parseThresholdPoints(threshold);
    if (thresholdPoints === "invalid") {
      setError(`El umbral de margen va de ${THRESHOLD_MIN} a ${THRESHOLD_MAX} puntos.`);
      return;
    }
    setError(null);
    upload.mutate({ file, thresholdPoints }, {
      onSuccess: (batch) => router.push(`${basePath}/${batch.id}`),
      onError: (failure) => setError(errorMessage(failure)),
    });
  };

  return (
    <section
      aria-labelledby="validator-upload-title"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        send(event.dataTransfer.files[0]);
      }}
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-dashed p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
        dragging ? "border-ring bg-primary-subtle" : "border-border-control"
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-text-secondary" aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          <h2 id="validator-upload-title" className="text-base font-semibold">
            Subir pedidos retenidos
          </h2>
          <p className="text-sm text-text-secondary">
            Reporte de SIESA en {ACCEPTED_EXTENSIONS.join(", ")}. Arrástralo aquí o elígelo; cada línea se valida contra el
            maestro de apoyos al subirlo.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44 space-y-1">
          <label htmlFor={thresholdId} className="block text-[13px] font-medium">
            Umbral de margen (pts) <span className="font-normal text-text-secondary">(opcional)</span>
          </label>
          <Input
            id={thresholdId}
            inputMode="decimal"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            placeholder="0,5"
            aria-describedby={`${thresholdId}-hint`}
          />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label="Archivo de pedidos retenidos"
          onChange={(event) => {
            send(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending} className="shrink-0">
          {upload.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
          {upload.isPending ? "Validando archivo…" : "Subir archivo"}
        </Button>
      </div>
      <p id={`${thresholdId}-hint`} className="w-full text-[13px] text-text-secondary sm:order-last">
        El umbral son los puntos de margen que una línea puede quedarse corta y aun así liberarse: con 0,5, un 19,5 % contra un 20 %
        se libera. Vacío usa el del servicio.
      </p>

      {error && (
        <p role="alert" className="w-full rounded-md bg-danger-surface px-3 py-2 text-sm text-danger sm:order-last">
          {error}
        </p>
      )}
    </section>
  );
}

function LoadError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const status = error instanceof ApiError ? error.status : null;
  const title =
    status === 404
      ? "El validador de pedidos todavía no está disponible"
      : status === 429
        ? "Demasiadas consultas seguidas"
        : "No se pudieron cargar los archivos";
  const description =
    status === 404
      ? "El API aún no publica este módulo. Cuando se despliegue, los archivos aparecerán aquí sin cambios en esta pantalla."
      : status === 429
        ? "Espera unos segundos y vuelve a intentarlo."
        : errorMessage(error);
  return (
    <StatePanel
      icon={CloudOff}
      tone="danger"
      title={title}
      action={
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" /> Reintentar
        </Button>
      }
    >
      {description}
    </StatePanel>
  );
}
