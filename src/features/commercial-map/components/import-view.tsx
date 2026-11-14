"use client";

import { useRef, useState } from "react";
import { CloudOff, FileSpreadsheet, RefreshCw } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import TableSkeleton from "@/shared/components/table-skeleton";
import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { useImportProspects, useProspectLoads } from "../hooks/use-commercial-map";
import { formatCount, formatDateTime } from "../lib/format";
import type { ImportError, ImportReport } from "../types/commercial-map.types";

const HEAD = "px-3 py-2 text-left text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase";
const NUMBER = "px-3 py-2 text-right tabular";

function Figure({ label, value }: { label: string; value: number }) {
  return (
    // The label may wrap to two lines; the figures still share one baseline.
    <div className="flex flex-col justify-between gap-1 rounded-lg border border-border px-3 py-2">
      <dt className="text-[13px] text-text-secondary">{label}</dt>
      <dd className="tabular text-xl font-semibold">{formatCount(value)}</dd>
    </div>
  );
}

/**
 * The monthly load: the file is simulated first, and only a simulation without
 * errors can be applied. Applying is all or nothing.
 */
export default function ImportView() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const run = useImportProspects();
  const loads = useProspectLoads(true);

  const submit = (apply: boolean) => {
    if (!file) return;
    run.mutate({ file, apply }, { onSuccess: setReport });
  };
  const reset = () => {
    setFile(null);
    setReport(null);
    run.reset();
    if (input.current) input.current.value = "";
  };

  const simulated = report !== null && !report.applied;
  const canApply = simulated && !report.blocked;

  return (
    <div className="space-y-8">
      <section aria-labelledby="import-title" className="max-w-3xl space-y-4">
        <div className="space-y-1">
          <h2 id="import-title" className="text-base font-semibold">
            Cargar el archivo mensual
          </h2>
          <p className="max-w-prose text-sm text-text-secondary">
            Un Excel con una hoja por zona. La carga crea los prospectos nuevos y actualiza por ID los que ya existen. No
            borra los que el archivo ya no trae, y respeta las ubicaciones corregidas a mano y los resultados de visita.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="prospect-file" className="block text-[13px] font-medium">
            Archivo de prospectos (.xlsx)
          </label>
          <input
            ref={input}
            id="prospect-file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={run.isPending}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setReport(null);
              run.reset();
            }}
            className={cn(
              "block w-full max-w-md rounded-md border border-border-control text-sm text-text-secondary",
              "file:mr-3 file:h-9 file:cursor-pointer file:border-0 file:border-r file:border-border-control file:bg-canvas-subtle file:px-3 file:text-sm file:font-medium file:text-text-primary",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              "disabled:opacity-50 max-md:file:h-11"
            )}
          />
          {file && (
            <p className="text-[13px] text-text-secondary">
              {file.name} · {formatBytes(file.size)}
            </p>
          )}
        </div>

        {run.isError && (
          <Alert severity="danger">
            <p className="font-medium">El archivo no se pudo procesar</p>
            <p>{errorMessage(run.error)}</p>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant={canApply ? "outline" : "primary"}
            disabled={!file || run.isPending}
            onClick={() => submit(false)}
            className="max-md:h-11"
          >
            {simulated ? "Simular de nuevo" : "Simular la carga"}
          </Button>
          {canApply && (
            <Button disabled={run.isPending} onClick={() => submit(true)} className="max-md:h-11">
              Aplicar la carga
            </Button>
          )}
          {(file || report) && (
            <Button variant="ghost" disabled={run.isPending} onClick={reset} className="max-md:h-11">
              Elegir otro archivo
            </Button>
          )}
        </div>
        {run.isPending && (
          <p className="text-sm text-text-secondary" role="status">
            Leyendo el archivo. Con dos mil filas tarda unos segundos.
          </p>
        )}
      </section>

      {report && <Report report={report} />}

      <section aria-labelledby="loads-title" className="space-y-3">
        <h2 id="loads-title" className="text-base font-semibold">
          Últimas cargas
        </h2>
        {loads.isPending ? (
          <TableSkeleton rows={3} label="Cargando las últimas cargas" />
        ) : loads.isError ? (
          <StatePanel
            icon={CloudOff}
            tone="danger"
            title="No se pudo cargar el historial de cargas"
            action={
              <Button variant="outline" onClick={() => void loads.refetch()}>
                <RefreshCw aria-hidden="true" /> Reintentar
              </Button>
            }
          >
            {errorMessage(loads.error)}
          </StatePanel>
        ) : loads.data.length === 0 ? (
          <StatePanel icon={FileSpreadsheet} title="Todavía no se ha cargado ningún archivo">
            Elige el Excel del mes arriba y simula la carga para ver qué traería.
          </StatePanel>
        ) : (
          <>
          {/* A phone gets each load as a card: six columns do not fit and a table that scrolls sideways hides half. */}
          <ul className="space-y-2 md:hidden">
            {loads.data.map((load) => (
              <li key={load.id} className="space-y-1 rounded-lg border border-border p-3 text-sm">
                <p className="font-medium [overflow-wrap:anywhere]">{load.file_name}</p>
                <p className="text-[13px] text-text-secondary">
                  {formatDateTime(load.loaded_at)}
                  {load.loaded_by ? ` · ${load.loaded_by}` : ""}
                </p>
                <p className="tabular">
                  {formatCount(load.rows_read)} filas: {formatCount(load.created)} nuevos,{" "}
                  {formatCount(load.updated)} actualizados, {formatCount(load.unchanged)} sin cambio
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <table className="w-full text-sm">
              <thead className="bg-canvas-subtle">
                <tr>
                  <th scope="col" className={HEAD}>Archivo</th>
                  <th scope="col" className={HEAD}>Cargado</th>
                  <th scope="col" className={cn(HEAD, "text-right")}>Filas</th>
                  <th scope="col" className={cn(HEAD, "text-right")}>Nuevos</th>
                  <th scope="col" className={cn(HEAD, "text-right")}>Actualizados</th>
                  <th scope="col" className={cn(HEAD, "text-right")}>Sin cambio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loads.data.map((load) => (
                  <tr key={load.id}>
                    <td className="px-3 py-2 [overflow-wrap:anywhere]">{load.file_name}</td>
                    <td className="px-3 py-2">
                      {formatDateTime(load.loaded_at)}
                      {load.loaded_by && <span className="block text-[13px] text-text-secondary">{load.loaded_by}</span>}
                    </td>
                    <td className={NUMBER}>{formatCount(load.rows_read)}</td>
                    <td className={NUMBER}>{formatCount(load.created)}</td>
                    <td className={NUMBER}>{formatCount(load.updated)}</td>
                    <td className={NUMBER}>{formatCount(load.unchanged)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </div>
  );
}

/** Rows of the file with something to say about them: errors, which block, or warnings, which do not. */
function IssueList({ issues, messageHeading }: { issues: ImportError[]; messageHeading: string }) {
  const key = (issue: ImportError, index: number) => `${issue.sheet}-${issue.row_number}-${issue.field}-${index}`;
  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border md:hidden">
        {issues.map((issue, index) => (
          <li key={key(issue, index)} className="space-y-0.5 p-3 text-sm">
            <p className="text-[13px] text-text-secondary">
              {[
                issue.sheet ? `Hoja ${issue.sheet}` : null,
                issue.row_number !== null ? `fila ${issue.row_number}` : null,
                issue.field ? `columna ${issue.field}` : null,
              ]
                .filter(Boolean)
                .join(", ") || "Archivo"}
            </p>
            <p>{issue.message}</p>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-canvas-subtle">
            <tr>
              <th scope="col" className={HEAD}>Hoja</th>
              <th scope="col" className={cn(HEAD, "text-right")}>Fila</th>
              <th scope="col" className={HEAD}>Columna</th>
              <th scope="col" className={HEAD}>{messageHeading}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {issues.map((issue, index) => (
              <tr key={key(issue, index)}>
                <td className="px-3 py-2 whitespace-nowrap">{issue.sheet ?? "—"}</td>
                <td className={NUMBER}>{issue.row_number ?? "—"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{issue.field ?? "—"}</td>
                <td className="px-3 py-2">{issue.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Report({ report }: { report: ImportReport }) {
  const warnings = report.warnings ?? [];
  return (
    <section aria-labelledby="report-title" className="space-y-4">
      <h2 id="report-title" className="text-base font-semibold">
        {report.applied ? "Resultado de la carga" : "Resultado de la simulación"}
      </h2>

      {report.applied ? (
        <Alert severity="success">
          Carga aplicada. Los prospectos nuevos y los actualizados ya están en el mapa.
        </Alert>
      ) : report.blocked ? (
        <Alert severity="danger">
          <p className="font-medium">La carga está bloqueada y no se guardó nada</p>
          <p>Corrige en el Excel los errores de la lista de abajo y vuelve a simular.</p>
        </Alert>
      ) : (
        <Alert severity="info">
          La simulación no encontró errores y todavía no se guardó nada. Revisa las cifras y aplica la carga.
        </Alert>
      )}

      <dl className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
        <Figure label="Filas leídas" value={report.rows_read} />
        <Figure label="Con ubicación" value={report.with_location} />
        <Figure label="Sin ubicación" value={report.without_location} />
        <Figure label="Ubicación aproximada" value={report.approximate} />
        <Figure label="Puntos descartados" value={report.discarded_points ?? 0} />
        <Figure label={report.applied ? "Nuevos" : "Por crear"} value={report.to_create} />
        <Figure label={report.applied ? "Actualizados" : "Por actualizar"} value={report.to_update} />
        <Figure label="Sin cambio" value={report.unchanged} />
      </dl>

      {report.errors.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            {report.errors.length === 1 ? "1 error" : `${formatCount(report.errors.length)} errores`}
            {report.errors_truncated ? " (hay más: la lista muestra los primeros)" : ""}
          </h3>
          <IssueList issues={report.errors} messageHeading="Qué corregir" />
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">
            {warnings.length === 1 ? "1 aviso" : `${formatCount(warnings.length)} avisos`}
            {report.warnings_truncated ? " (hay más: la lista muestra los primeros)" : ""}
          </h3>
          <p className="max-w-prose text-sm text-text-secondary">
            Los avisos no bloquean la carga. Son filas cuyo punto no es confiable (el archivo las marca «Por
            ubicar», o la dirección nombra un municipio y el punto cae en otro): entran sin ubicación y quedan en la
            pestaña Por ubicar para ponerlas a mano.
          </p>
          <IssueList issues={warnings} messageHeading="Aviso" />
        </div>
      )}

      {report.sheets.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Por hoja</h3>
          {/* Four short columns: they fit a phone once the headings are allowed to wrap. */}
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-canvas-subtle">
                <tr>
                  <th scope="col" className={HEAD}>Hoja</th>
                  <th scope="col" className={cn(HEAD, "text-right")}>Filas</th>
                  <th scope="col" className={cn(HEAD, "text-right")}>Con ubicación</th>
                  <th scope="col" className={cn(HEAD, "text-right")}>Sin ubicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.sheets.map((sheet) => (
                  <tr key={sheet.name}>
                    <td className="px-3 py-2">{sheet.name}</td>
                    <td className={NUMBER}>{formatCount(sheet.rows)}</td>
                    <td className={NUMBER}>{formatCount(sheet.with_location)}</td>
                    <td className={NUMBER}>{formatCount(sheet.without_location)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
