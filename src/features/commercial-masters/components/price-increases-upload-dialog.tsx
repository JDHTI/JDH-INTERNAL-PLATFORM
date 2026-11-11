"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { errorMessage } from "@/shared/lib/api-client";

import { useUploadPriceIncreases } from "../hooks/use-commercial-masters";
import type { PriceIncreaseReport } from "../types/price-increases.types";

const numberFormat = new Intl.NumberFormat("es-CO");

/**
 * Loads the purchasing area's `Acumulado Alza Precios` in two steps: choosing
 * the file simulates and says what would be added or changed; «Aplicar» sends
 * it again with `apply`. Rows are upserted by reference, increase date and
 * notification date; the product's own columns are left to the master.
 */
export default function PriceIncreasesUploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} isForm wide title="Cargar alzas">
      {open && <Uploader onClose={onClose} />}
    </Dialog>
  );
}

function Uploader({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [report, setReport] = useState<PriceIncreaseReport | null>(null);
  const upload = useUploadPriceIncreases();

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
    upload.mutate({ file: chosen, apply: false }, { onSuccess: setReport });
  };

  const apply = () => {
    if (!file) return;
    upload.mutate(
      { file, apply: true },
      {
        onSuccess: (applied) => {
          toast.success(`Alzas cargadas: ${numberFormat.format(applied.inserted)} nuevas y ${numberFormat.format(applied.updated)} actualizadas.`);
          setReport(applied);
        },
      }
    );
  };

  const applied = report?.applied === true;
  const changes = report ? report.inserted + report.updated : 0;
  const error = localError ?? (upload.isError ? errorMessage(upload.error) : null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xlsm"
          className="sr-only"
          tabIndex={-1}
          aria-label="Acumulado de alzas"
          onChange={(event) => {
            choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <Button variant={report ? "outline" : "primary"} onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending && !report ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
          {file ? "Elegir otro archivo" : "Elegir el acumulado (.xlsx)"}
        </Button>
        {file && (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-text-secondary">
            <FileSpreadsheet className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{file.name}</span>
          </span>
        )}
      </div>

      <DialogError message={error} />
      {upload.isPending && !report && <div className="h-20 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Leyendo el archivo" />}
      {report && <Report report={report} />}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {applied ? "Cerrar" : "Cancelar"}
        </Button>
        {!applied && (
          <Button onClick={apply} disabled={!report || changes === 0 || upload.isPending}>
            {upload.isPending && report ? "Aplicando…" : "Aplicar"}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

function Report({ report }: { report: PriceIncreaseReport }) {
  const extras = [
    report.duplicated > 0 ? `${numberFormat.format(report.duplicated)} repetidas (queda la última)` : null,
    report.unknown_skus > 0 ? `${numberFormat.format(report.unknown_skus)} referencias fuera del maestro` : null,
    report.pending > 0 ? `${numberFormat.format(report.pending)} pendientes en SIESA` : null,
  ].filter(Boolean);
  return (
    <section className="space-y-3" aria-live="polite">
      <div className="flex items-center gap-2">
        {report.applied ? <Badge tone="success">Aplicado</Badge> : <Badge tone="info">Simulación</Badge>}
        <span className="text-sm text-text-secondary">{numberFormat.format(report.rows_read)} filas leídas</span>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <Count label="Nuevas" value={report.inserted} />
        <Count label={report.applied ? "Actualizadas" : "Cambian"} value={report.updated} />
        <Count label="Sin cambios" value={report.unchanged} />
      </dl>
      {extras.length > 0 && <p className="text-[13px] text-text-secondary">{extras.join(" · ")}</p>}
      {report.issues.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            Celdas que no se pudieron leer ({numberFormat.format(report.issues.length)}
            {report.issues_truncated ? "+" : ""}): esa celda queda vacía, la fila sí se carga
          </summary>
          <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-[13px]">
              <thead className="sticky top-0 bg-canvas-subtle text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-1.5">Fila</th>
                  <th scope="col" className="px-3 py-1.5">Referencia</th>
                  <th scope="col" className="px-3 py-1.5">Problema</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.issues.map((issue, index) => (
                  <tr key={`${issue.row_number}-${index}`}>
                    <td className="px-3 py-1 tabular-nums">{issue.row_number}</td>
                    <td className="px-3 py-1 font-mono">{issue.sku ?? "—"}</td>
                    <td className="px-3 py-1">{issue.problem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{numberFormat.format(value)}</dd>
    </div>
  );
}
