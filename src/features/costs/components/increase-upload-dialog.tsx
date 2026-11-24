"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { errorMessage } from "@/shared/lib/api-client";

import { useUploadIncreaseWorkbook } from "../hooks/use-increase-requests";
import type { IncreaseUploadReport } from "../types/increase-requests.types";
import IncreaseLinesTable from "./increase-lines-table";

const numberFormat = new Intl.NumberFormat("es-CO");

/**
 * The supplier's MAESTRA, back with its new costs. Choosing the file reads it
 * and reports what it would create and every problem by sheet row; any
 * problem blocks it. «Crear solicitud» sends it again to create the request
 * in review, and opens it.
 */
export default function IncreaseUploadDialog({
  supplier,
  basePath,
  onClose,
}: {
  supplier: { code: string; name: string } | null;
  /** The view's path, to open the created request under it. */
  basePath: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={supplier !== null}
      onOpenChange={(next) => !next && onClose()}
      isForm
      wide
      title="Cargar la MAESTRA del proveedor"
      description={supplier ? `${supplier.name} · código ${supplier.code}` : undefined}
    >
      {supplier && <Uploader key={supplier.code} supplierCode={supplier.code} basePath={basePath} onClose={onClose} />}
    </Dialog>
  );
}

function Uploader({ supplierCode, basePath, onClose }: { supplierCode: string; basePath: string; onClose: () => void }) {
  const router = useRouter();
  const noteId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [report, setReport] = useState<IncreaseUploadReport | null>(null);
  const upload = useUploadIncreaseWorkbook();

  const choose = (chosen: File | undefined) => {
    if (!chosen) return;
    if (!/\.(xlsx|xlsm)$/i.test(chosen.name)) {
      setLocalError(`El archivo debe ser .xlsx. Elegiste «${chosen.name}».`);
      return;
    }
    setLocalError(null);
    setFile(chosen);
    setReport(null);
    upload.reset();
    upload.mutate({ supplier: supplierCode, file: chosen, note, apply: false }, { onSuccess: setReport });
  };

  const apply = () => {
    if (!file) return;
    upload.mutate(
      { supplier: supplierCode, file, note, apply: true },
      {
        onSuccess: (applied) => {
          toast.success(`Solicitud creada con ${numberFormat.format(applied.lines.length)} líneas, en revisión.`);
          onClose();
          if (applied.request_id) router.push(`${basePath}/${applied.request_id}`);
        },
      }
    );
  };

  const error = localError ?? (upload.isError ? errorMessage(upload.error) : null);
  const canApply = report !== null && !report.blocked && report.lines.length > 0 && !upload.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xlsm"
          className="sr-only"
          tabIndex={-1}
          aria-label="MAESTRA diligenciada por el proveedor"
          onChange={(event) => {
            choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button variant={report ? "outline" : "primary"} onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending && !report ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
          {file ? "Otro archivo" : "Elegir archivo .xlsx"}
        </Button>
        {file && (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-text-secondary">
            <FileSpreadsheet className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{file.name}</span>
          </span>
        )}
      </div>

      <Field label="Nota para la revisión" htmlFor={noteId} optional>
        <Textarea id={noteId} value={note} maxLength={500} rows={2} onChange={(event) => setNote(event.target.value)} />
      </Field>

      <DialogError message={error} />
      {upload.isPending && !report && <div className="h-24 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Leyendo el archivo" />}
      {report && <Report report={report} />}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={apply} disabled={!canApply}>
          {upload.isPending && report ? "Creando…" : "Crear solicitud"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function Report({ report }: { report: IncreaseUploadReport }) {
  return (
    <section className="space-y-3" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        {report.blocked ? <Badge tone="danger">No se puede cargar</Badge> : <Badge tone="info">Lectura sin guardar</Badge>}
        <span className="text-sm text-text-secondary">
          {numberFormat.format(report.rows_read)} filas leídas · {numberFormat.format(report.lines.length)} con costo nuevo
          {report.issues.length > 0 && <> · {numberFormat.format(report.issues.length)} con problemas</>}
        </span>
      </div>
      {report.blocked && (
        <p className="text-sm">Corrige estas filas en el archivo y vuelve a elegirlo. Mientras haya un problema, la solicitud no se crea.</p>
      )}
      {!report.blocked && report.lines.length === 0 && (
        <p className="text-sm">Ninguna fila trae costo nuevo: no hay nada que revisar.</p>
      )}
      {report.issues.length > 0 && (
        <div className="max-h-56 overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">Problemas por fila de la hoja</caption>
            <thead className="sticky top-0 bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
              <tr>
                <th scope="col" className="px-3 py-1.5 text-right">Fila</th>
                <th scope="col" className="px-3 py-1.5">Referencia</th>
                <th scope="col" className="px-3 py-1.5">Problema</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.issues.map((issue, index) => (
                <tr key={`${issue.row_number}-${index}`}>
                  <td className="px-3 py-1 text-right tabular-nums">{issue.row_number}</td>
                  <td className="px-3 py-1 font-mono">{issue.sku ?? "—"}</td>
                  <td className="px-3 py-1">{issue.problem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {report.lines.length > 0 && (
        <div className="max-h-96 overflow-auto">
          <IncreaseLinesTable lines={report.lines} caption="Referencias que trae el archivo" showRow />
        </div>
      )}
    </section>
  );
}
