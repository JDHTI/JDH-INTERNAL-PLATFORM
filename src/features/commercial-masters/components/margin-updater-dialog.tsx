"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { errorMessage } from "@/shared/lib/api-client";

import { useDownloadMarginTemplate, useUploadMargins } from "../hooks/use-commercial-masters";
import { MARGIN_LABELS, formatMargin } from "../lib/margins";
import type { MarginChange, MarginField, MarginReport } from "../types/commercial-master.types";

const numberFormat = new Intl.NumberFormat("es-CO");
const ACCEPT = ".xlsx,.csv";
const LISTED_SKUS = 30;

/**
 * Updates margins from a file in two steps. Choosing the file only simulates
 * and reports what would change; "Aplicar cambios" sends the same file again
 * with `apply`. Nothing is written until then.
 */
export default function MarginUpdaterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} isForm wide title="Actualizar márgenes" description="Descarga la hoja, edítala y súbela: primero se simula y ves qué cambia.">
      {open && <Updater onClose={onClose} />}
    </Dialog>
  );
}

function Updater({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [report, setReport] = useState<MarginReport | null>(null);
  const upload = useUploadMargins();
  const template = useDownloadMarginTemplate();

  const choose = (chosen: File | undefined) => {
    if (!chosen) return;
    if (!/\.(xlsx|csv)$/i.test(chosen.name)) {
      setLocalError(`El archivo debe ser .xlsx o .csv. Elegiste "${chosen.name}".`);
      return;
    }
    setLocalError(null);
    setFile(chosen);
    setReport(null);
    upload.reset();
    upload.mutate({ file: chosen, apply: false }, { onSuccess: setReport });
  };

  const apply = () => {
    if (!file) return;
    upload.mutate(
      { file, apply: true },
      {
        onSuccess: (applied) => {
          toast.success(`Márgenes actualizados: ${numberFormat.format(applied.updated)} productos.`);
          setReport(applied);
        },
      }
    );
  };

  const applied = report?.applied === true;
  const error = localError ?? (upload.isError ? errorMessage(upload.error) : null);

  return (
    <div className="space-y-5">
      <section className="space-y-2 rounded-lg border border-border p-4 text-sm">
        <h3 className="font-semibold">Cómo funciona</h3>
        <ul className="list-disc space-y-1 pl-5 text-text-secondary">
          <li>Una celda vacía no cambia el margen. Un 0 lo borra.</li>
          <li>Acepta 0,18, 18 o 18 %.</li>
          <li>Una fila inválida no se aplica, pero las demás sí.</li>
          <li>La referencia es el SKU del producto; los SKU que no existen se listan y se ignoran.</li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => template.mutate(true)} disabled={template.isPending}>
            <Download aria-hidden="true" /> Descargar plantilla
          </Button>
          <Button variant="ghost" size="sm" onClick={() => template.mutate(false)} disabled={template.isPending}>
            Plantilla vacía
          </Button>
        </div>
        {template.isError && (
          <p role="alert" className="text-danger">
            {errorMessage(template.error)}
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-label="Archivo de márgenes"
          onChange={(event) => {
            choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button variant={report ? "outline" : "primary"} onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending && !applied ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
          {file ? "Elegir otro archivo" : "Subir archivo"}
        </Button>
        {file && (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-text-secondary">
            <FileSpreadsheet className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{file.name}</span>
          </span>
        )}
      </div>

      <DialogError message={error} />

      {upload.isPending && !report && <div className="h-24 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Simulando los cambios" />}

      {report && <Report report={report} />}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {applied ? "Cerrar" : "Cancelar"}
        </Button>
        {!applied && (
          <Button onClick={apply} disabled={!report || report.updated === 0 || upload.isPending}>
            {upload.isPending && report ? "Aplicando…" : "Aplicar cambios"}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

function Report({ report }: { report: MarginReport }) {
  return (
    <section className="space-y-4" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">{report.applied ? "Cambios aplicados" : "Simulación: aún no se aplicó nada"}</h3>
        {report.applied ? <Badge tone="success">Aplicado</Badge> : <Badge tone="info">Simulación</Badge>}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Count label="Filas leídas" value={report.rows_read} />
        <Count label={report.applied ? "Actualizados" : "Cambian"} value={report.updated} />
        <Count label="Sin cambios" value={report.unchanged} />
        <Count label="Repetidos en el archivo" value={report.duplicated} />
      </dl>

      {report.unknown_skus.length > 0 && (
        <div className="space-y-1.5 text-sm">
          <h4 className="font-semibold">SKU que no existen ({report.unknown_skus.length})</h4>
          <p className="font-mono text-[13px] text-text-secondary">
            {report.unknown_skus.slice(0, LISTED_SKUS).join(", ")}
            {report.unknown_skus.length > LISTED_SKUS && ` y ${report.unknown_skus.length - LISTED_SKUS} más`}
          </p>
        </div>
      )}

      {report.issues.length > 0 && (
        <div className="space-y-1.5 text-sm">
          <h4 className="font-semibold">Filas inválidas ({report.issues.length}): no se aplican</h4>
          <div className="max-h-40 overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-1.5">Fila</th>
                  <th scope="col" className="px-3 py-1.5">SKU</th>
                  <th scope="col" className="px-3 py-1.5">Problema</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.issues.map((issue, index) => (
                  <tr key={`${issue.row_number}-${index}`}>
                    <td className="px-3 py-1.5 tabular-nums">{issue.row_number}</td>
                    <td className="px-3 py-1.5 font-mono text-[13px]">{issue.sku ?? "—"}</td>
                    <td className="px-3 py-1.5">{issue.problem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {report.changes.length > 0 && (
        <div className="space-y-1.5 text-sm">
          <h4 className="font-semibold">{report.applied ? "Qué cambió" : "Qué cambiaría"}</h4>
          <div className="max-h-72 overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-1.5">Producto</th>
                  <th scope="col" className="px-3 py-1.5">Antes → después</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.changes.map((change) => (
                  <ChangeRow key={change.sku} change={change} />
                ))}
              </tbody>
            </table>
          </div>
          {report.changes_truncated && (
            <p className="text-xs text-text-secondary">Se muestran los primeros {report.changes.length} productos; el resto también se aplica.</p>
          )}
        </div>
      )}

      {report.updated === 0 && !report.applied && report.issues.length === 0 && (
        <p className="text-sm text-text-secondary">Ningún producto cambiaría con este archivo.</p>
      )}
    </section>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{numberFormat.format(value)}</dd>
    </div>
  );
}

function ChangeRow({ change }: { change: MarginChange }) {
  const margins = Object.entries(change.margins) as [MarginField, { from: string | null; to: string | null }][];
  return (
    <tr className="align-top">
      <td className="max-w-64 px-3 py-1.5">
        <span className="block font-mono text-[13px]">{change.sku}</span>
        <span className="block truncate text-xs text-text-secondary">{change.description ?? ""}</span>
      </td>
      <td className="px-3 py-1.5">
        <ul className="space-y-0.5">
          {margins.map(([field, value]) => (
            <li key={field} className="tabular-nums">
              <span className="text-text-secondary">{MARGIN_LABELS[field] ?? field}: </span>
              {formatMargin(value.from)} → {formatMargin(value.to)}
            </li>
          ))}
          {change.notes && (
            <li>
              <span className="text-text-secondary">Notas: </span>
              {change.notes.from ?? "—"} → {change.notes.to ?? "—"}
            </li>
          )}
        </ul>
      </td>
    </tr>
  );
}
