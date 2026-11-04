"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { errorMessage } from "@/shared/lib/api-client";

import { useUploadTemplate } from "../hooks/use-quotations";
import { formatCount } from "../lib/format";
import { downloadQuotationTemplate } from "../services/quotations.service";
import type { Quotation, TemplateResult } from "../types/quotations.types";

const ACCEPTED = ".xlsx";

/**
 * Many prices at once: download the quotation as a workbook, change the new
 * price or the new margin of whatever rows, and upload it whole. The result
 * stays on screen row by row, so the advisor can fix what did not go in.
 */
export default function TemplateDialog({ quotation, open, onOpenChange }: { quotation: Quotation; open: boolean; onOpenChange: (open: boolean) => void }) {
  const upload = useUploadTemplate(quotation.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<TemplateResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setResult(null);
    setFileName(null);
    setError(null);
  };

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadQuotationTemplate(quotation.id);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setDownloading(false);
    }
  };

  const send = (file: File | undefined) => {
    if (!file || upload.isPending) return;
    if (!file.name.toLowerCase().endsWith(ACCEPTED)) {
      setError(`La plantilla es un archivo ${ACCEPTED}. Elegiste «${file.name}».`);
      return;
    }
    setError(null);
    setResult(null);
    setFileName(file.name);
    upload.mutate(
      { version: quotation.version, file },
      {
        onSuccess: (updated) => setResult(updated.template_result ?? null),
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (upload.isPending) return;
        if (!next) reset();
        onOpenChange(next);
      }}
      isForm
      wide
      title="Cambios masivos con plantilla"
      description="Descarga la cotización en Excel, cambia los precios o márgenes que quieras y súbela completa."
    >
      <div className="space-y-5 text-sm">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Descarga la plantilla: trae todas las referencias con su costo, objetivo, precio mínimo y óptimo.</li>
          <li>
            Cambia el <strong>precio nuevo</strong> o el <strong>margen nuevo</strong> (por ejemplo 30 % o 0,30); por fila se toma la
            celda que cambiaste. Las dos vacías quitan el precio. Una referencia nueva al final se agrega.
          </li>
          <li>Súbela completa. Lo que no se pueda leer o calcular se informa con su fila y el resto se guarda.</li>
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void download()} disabled={downloading} className="max-md:h-11">
            {downloading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
            Descargar plantilla
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="sr-only"
            tabIndex={-1}
            aria-label="Plantilla editada"
            onChange={(event) => {
              send(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending} className="max-md:h-11">
            {upload.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
            {upload.isPending ? "Aplicando cambios…" : "Subir plantilla"}
          </Button>
        </div>

        {fileName && (
          <p className="flex items-center gap-1.5 text-text-secondary">
            <FileSpreadsheet className="size-4" aria-hidden="true" /> {fileName}
          </p>
        )}
        {result && <TemplateSummary result={result} />}
        <DialogError message={error} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={upload.isPending} className="max-md:h-11">
          Cerrar
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

/** One line per outcome with its references, then the rows that could not be applied. */
function TemplateSummary({ result }: { result: TemplateResult }) {
  const groups: [string, string[]][] = [
    ["Precio actualizado", result.updated ?? []],
    ["Precio quitado", result.cleared ?? []],
    ["Agregadas", result.added ?? []],
    ["No existen en el maestro", result.not_found ?? []],
    ["Inactivas, no se agregan", result.inactive ?? []],
  ];
  const changed = groups.slice(0, 3).reduce((total, [, skus]) => total + skus.length, 0);
  return (
    <section aria-labelledby="template-result" className="space-y-3" role="status">
      <h3 id="template-result" className="text-base font-semibold">Resultado</h3>
      <p>
        {changed === 0
          ? "La plantilla no cambió ningún precio."
          : `${changed === 1 ? "1 referencia cambió" : `${formatCount(changed)} referencias cambiaron`}.`}{" "}
        <span className="text-text-secondary">
          Sin cambio: <span className="tabular-nums">{formatCount(result.unchanged ?? 0)}</span>.
        </span>
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        {groups
          .filter(([, skus]) => skus.length > 0)
          .map(([label, skus]) => (
            <div key={label} className="contents">
              <dt className="text-text-secondary">
                {label} <span className="tabular-nums">({formatCount(skus.length)})</span>
              </dt>
              <dd className="min-w-0 font-mono text-[13px]">{skus.join(", ")}</dd>
            </div>
          ))}
      </dl>
      {result.skipped.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="font-medium">No se aplicaron ({formatCount(result.skipped.length)})</h4>
          <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-md border border-border">
            {result.skipped.map((row, index) => (
              <li key={`${row.row_number ?? "x"}-${row.sku ?? index}`} className="flex gap-3 px-3 py-1.5">
                <span className="w-16 shrink-0 tabular-nums text-text-secondary">{row.row_number ? `Fila ${row.row_number}` : "—"}</span>
                <span className="w-16 shrink-0 font-mono text-[13px]">{row.sku ?? "—"}</span>
                <span className="min-w-0">{row.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
