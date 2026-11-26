"use client";

import { useId, useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useUploadBudget } from "../hooks/use-commercial-budget";
import { formatCount, periodLabel } from "../lib/format";
import { downloadBudgetTemplate } from "../services/commercial-budget.service";
import type { BudgetUploadReport, Period, UploadProblem } from "../types/commercial-budget.types";

/**
 * The month's budget from a workbook in two steps: choosing the file only simulates and reports
 * what would change; «Aplicar» sends the same file again with `apply`.
 */
export default function BudgetUploadDialog({ open, onClose, period }: { open: boolean; onClose: () => void; period: Period }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      isForm
      wide
      title={`Cargar el presupuesto de ${periodLabel(period)}`}
      description="Descarga la plantilla, diligénciala y súbela: primero se simula y ves qué cambia. Nada se guarda hasta aplicar."
    >
      {open && <Uploader period={period} onClose={onClose} />}
    </Dialog>
  );
}

function Uploader({ period, onClose }: { period: Period; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const noteId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [report, setReport] = useState<BudgetUploadReport | null>(null);
  const [template, setTemplate] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const upload = useUploadBudget(period);

  const choose = (chosen: File | undefined) => {
    if (!chosen) return;
    if (!/\.xlsx$/i.test(chosen.name)) {
      setLocalError(`El archivo debe ser un .xlsx. Elegiste «${chosen.name}».`);
      return;
    }
    setLocalError(null);
    setFile(chosen);
    setReport(null);
    upload.reset();
    upload.mutate({ file: chosen, apply: false, note }, { onSuccess: setReport });
  };

  const apply = () => {
    if (!file) return;
    upload.mutate(
      { file, apply: true, note },
      {
        onSuccess: (applied) => {
          toast.success(`Presupuesto cargado: ${formatCount(applied.changed)} vendedores con cambios.`);
          setReport(applied);
        },
      }
    );
  };

  const downloadTemplate = async () => {
    setTemplate({ busy: true, error: null });
    try {
      await downloadBudgetTemplate(period);
      setTemplate({ busy: false, error: null });
    } catch (failure) {
      setTemplate({ busy: false, error: errorMessage(failure) });
    }
  };

  const applied = report?.applied === true;
  const error = localError ?? (upload.isError ? errorMessage(upload.error) : null);

  return (
    <div className="space-y-5">
      <section className="space-y-2 rounded-lg border border-border p-4 text-sm">
        <h3 className="font-semibold">Cómo funciona</h3>
        <ul className="list-disc space-y-1 pl-5 text-text-secondary">
          <li>Las columnas se buscan por encabezado: CÓDIGO VENDEDOR (o el nombre), PPTO VENTA, PPTO MARGEN, PPTO # CLIENTES y PPTO RECAUDO.</li>
          <li>Una celda vacía deja el campo como está. Las filas «TOTAL …» se saltan.</li>
          <li>El margen va como 0,18, 18 % o 18.</li>
          <li>También lee el archivo plano de BI con el nombre del vendedor: avisa con qué código lo encontró.</li>
        </ul>
        <div className="pt-1">
          <Button variant="outline" size="sm" onClick={downloadTemplate} disabled={template.busy}>
            {template.busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />} Plantilla del mes
          </Button>
        </div>
        {template.error && (
          <p role="alert" className="text-danger">
            {template.error}
          </p>
        )}
      </section>

      <div className="space-y-1.5">
        <label htmlFor={noteId} className="text-sm font-medium">
          Nota <span className="font-normal text-text-secondary">(opcional, queda en el historial)</span>
        </label>
        <Input id={noteId} value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} disabled={applied} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          tabIndex={-1}
          aria-label="Archivo del presupuesto"
          onChange={(event) => {
            choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button variant={report ? "outline" : "primary"} onClick={() => inputRef.current?.click()} disabled={upload.isPending || applied}>
          {upload.isPending && !report ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
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

      {upload.isPending && !report && <div className="h-24 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Simulando la carga" />}

      {report && <Report report={report} />}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {applied ? "Cerrar" : "Cancelar"}
        </Button>
        {!applied && (
          <Button onClick={apply} disabled={!report || report.changed === 0 || upload.isPending}>
            {upload.isPending && report ? "Aplicando…" : "Aplicar cambios"}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

function Report({ report }: { report: BudgetUploadReport }) {
  return (
    <section className="space-y-4" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">{report.applied ? "Cambios aplicados" : "Simulación: aún no se guardó nada"}</h3>
        {report.applied ? <Badge tone="success">Aplicado</Badge> : <Badge tone="info">Simulación</Badge>}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Count label="Filas leídas" value={report.rows} />
        <Count label="Vendedores encontrados" value={report.matched} />
        <Count label={report.applied ? "Actualizados" : "Cambian"} value={report.changed} />
        <Count label="Sin cambios" value={report.unchanged} />
      </dl>
      <Problems title={`Filas que no se cargan (${report.problems.length})`} items={report.problems} />
      <Problems title={`Advertencias (${report.warnings.length}): la fila sí se carga`} items={report.warnings} />
      {report.changed === 0 && !report.applied && report.problems.length === 0 && (
        <p className="text-sm text-text-secondary">Ningún presupuesto cambiaría con este archivo.</p>
      )}
    </section>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{formatCount(value)}</dd>
    </div>
  );
}

function Problems({ title, items }: { title: string; items: UploadProblem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5 text-sm">
      <h4 className="font-semibold">{title}</h4>
      <div className="max-h-48 overflow-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
            <tr>
              <th scope="col" className="px-3 py-1.5">Fila</th>
              <th scope="col" className="px-3 py-1.5">Valor</th>
              <th scope="col" className="px-3 py-1.5">Motivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item, index) => (
              <tr key={`${item.row}-${index}`}>
                <td className="px-3 py-1.5 tabular-nums">{item.row}</td>
                <td className="max-w-48 truncate px-3 py-1.5" title={item.value ?? undefined}>{item.value ?? "—"}</td>
                <td className="px-3 py-1.5">{item.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
