"use client";

import { useId, useState } from "react";
import { ChevronDown, Download, FileUp, Loader2, ListMinus } from "lucide-react";
import { toast } from "sonner";

import { buttonVariants, Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { InfoPopover } from "@/shared/components/ui/info-popover";
import { Menu, MenuItem } from "@/shared/components/ui/menu";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useListTemplateUpload } from "../hooks/use-quotations";
import { formatCount } from "../lib/format";
import { downloadListTemplate } from "../services/quotations.service";
import type { ListTemplateResult, Quotation } from "../types/quotations.types";

const references = (count: number) => `${formatCount(count)} ${count === 1 ? "referencia" : "referencias"}`;

/**
 * For a big list update (Sodexo's list 5 has thousands of references): download its template,
 * delete the rows that do not belong and upload it back to take those references out. Anyone who
 * sees the update downloads it (it has no costs); uploading is for whoever edits it, in draft.
 */
export function ListTemplateMenu({ quotation, canUpload }: { quotation: Quotation; canUpload: boolean }) {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      await downloadListTemplate(quotation.id);
    } catch (failure) {
      toast.error(errorMessage(failure));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Menu
        align="end"
        trigger={
          <>
            {downloading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ListMinus aria-hidden="true" />}
            Quitar referencias
            <ChevronDown aria-hidden="true" />
          </>
        }
        triggerClassName={cn(buttonVariants({ variant: "outline" }), "max-md:h-11")}
        triggerTitle="Descarga la plantilla, borra las filas que sobran y súbela"
      >
        <MenuItem onClick={() => void download()} disabled={downloading}>
          <Download aria-hidden="true" /> Descargar plantilla
        </MenuItem>
        {canUpload && (
          <MenuItem onClick={() => setUploading(true)}>
            <FileUp aria-hidden="true" /> Subir plantilla
          </MenuItem>
        )}
      </Menu>
      <Dialog
        open={uploading}
        onOpenChange={setUploading}
        title="Subir plantilla"
        description="Borra en el Excel las filas de las referencias que no van en la actualización. Solo cuenta la columna Referencia: los precios del archivo no se leen."
        isForm
      >
        {uploading && <UploadForm quotation={quotation} onDone={() => setUploading(false)} />}
      </Dialog>
    </>
  );
}

function UploadForm({ quotation, onDone }: { quotation: Quotation; onDone: () => void }) {
  const inputId = useId();
  const upload = useListTemplateUpload(quotation.id);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ListTemplateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Choosing a file previews it at once: nothing changes until «Quitar». */
  const choose = (next: File | null) => {
    setFile(next);
    setPreview(null);
    setError(null);
    if (!next) return;
    upload.mutate(
      { file: next, version: quotation.version, apply: false },
      { onSuccess: setPreview, onError: (failure) => setError(errorMessage(failure)) }
    );
  };

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !preview || preview.removed_count === 0) return;
    setError(null);
    upload.mutate(
      { file, version: quotation.version, apply: true },
      {
        onSuccess: (result) => {
          toast.success(`Se quitaron ${references(result.removed_count)}. Quedan ${formatCount(result.kept)}.`);
          onDone();
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  const previewing = upload.isPending && !preview;

  return (
    <form onSubmit={apply} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-[13px] font-medium">
          Plantilla (.xlsx)
        </label>
        <input
          id={inputId}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={upload.isPending}
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
          className={cn(
            "block w-full text-sm text-text-secondary",
            "file:mr-3 file:h-9 file:rounded-md file:border file:border-border-control file:bg-transparent file:px-3 file:text-sm file:font-medium file:text-text-primary",
            "hover:file:bg-canvas-subtle max-md:file:h-11",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          )}
        />
      </div>

      {previewing && (
        <p className="flex items-center gap-2 text-sm text-text-secondary" aria-live="polite">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Leyendo la plantilla…
        </p>
      )}

      {preview && <PreviewSummary preview={preview} />}

      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={upload.isPending} className="max-md:h-11">
          {preview?.removed_count === 0 ? "Cerrar" : "Cancelar"}
        </Button>
        {preview && preview.removed_count > 0 && (
          <Button type="submit" disabled={upload.isPending} className="max-md:h-11">
            {upload.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Quitar {references(preview.removed_count)}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}

function PreviewSummary({ preview }: { preview: ListTemplateResult }) {
  if (preview.removed_count === 0) {
    return (
      <p className="text-sm" aria-live="polite">
        El archivo trae todas las referencias: no hay nada que quitar.
      </p>
    );
  }
  return (
    <div className="space-y-3 text-sm" aria-live="polite">
      <div className="space-y-1.5">
        <p className="font-medium">Se quitarán {references(preview.removed_count)}</p>
        <ul className="max-h-60 divide-y divide-border overflow-y-auto overscroll-contain rounded-md border border-border">
          {preview.removed.map((item) => (
            <li key={item.sku} className="flex gap-2 px-3 py-1.5 text-[13px]">
              <span className="shrink-0 font-mono">{item.sku}</span>
              <span className="min-w-0 truncate text-text-secondary" title={item.description ?? undefined}>
                {item.description ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {preview.unknown_count > 0 && (
        <details className="rounded-md border border-border px-3 py-2">
          <summary className="cursor-pointer text-[13px] text-text-secondary">
            {references(preview.unknown_count)} del archivo no están en la actualización y se ignoran
          </summary>
          <p className="mt-1.5 max-h-32 overflow-y-auto font-mono text-xs break-words">{preview.unknown.join(", ")}</p>
        </details>
      )}
      <p>
        Quedan <span className="font-medium tabular-nums">{formatCount(preview.kept)}</span>. En SIESA las que se quitan no
        cambian de precio; siguen en la lista.
      </p>
    </div>
  );
}

/** In the header, so whoever validates sees that references were taken out with the template. */
export function ExcludedSkus({ quotation }: { quotation: Quotation }) {
  const skus = quotation.excluded_skus ?? [];
  if (skus.length === 0) return null;
  return (
    <InfoPopover label={`${references(skus.length)} quitadas con la plantilla`} title="Quitadas con la plantilla">
      <p className="mb-2">
        No van en esta actualización: en SIESA su precio no cambia. Un refresco no las trae de vuelta; agregarlas otra vez sí.
      </p>
      <p className="max-h-48 overflow-y-auto font-mono text-xs break-words">{skus.join(", ")}</p>
    </InfoPopover>
  );
}
