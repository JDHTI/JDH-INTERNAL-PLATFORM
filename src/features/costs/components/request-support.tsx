"use client";

import { useRef, useState } from "react";
import { Download, ExternalLink, Loader2, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { formatWhen } from "@/features/supports/lib/format";
import { Button } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { errorMessage, saveBlob } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";

import { useDeleteRequestSupport, usePutRequestSupport } from "../hooks/use-increase-requests";
import { getRequestSupport } from "../services/increase-requests.service";
import type { IncreaseRequestDetail } from "../types/increase-requests.types";
import { SUPPORT_ACCEPT, supportProblem } from "./support-file";

const failed = (failure: unknown) => toast.error(errorMessage(failure), { duration: Infinity });

/**
 * The supplier's support of a request. Anyone who reads the request sees it
 * and downloads it; while it is in review, whoever manages attaches,
 * replaces or removes it. After the decision it is read-only.
 */
export default function RequestSupport({ request, reviewing }: { request: IncreaseRequestDetail; reviewing: boolean }) {
  const support = request.support;
  const inputRef = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState<"ver" | "descargar" | null>(null);
  const attach = usePutRequestSupport();
  const detach = useDeleteRequestSupport();

  if (!support && !reviewing) return null;

  const view = async () => {
    // Opened before the fetch, so the browser treats it as the click's own tab.
    const tab = window.open("", "_blank");
    setBusy("ver");
    try {
      const { blob } = await getRequestSupport(request.id, true);
      const href = URL.createObjectURL(blob);
      if (tab) tab.location.href = href;
      else window.location.assign(href);
      setTimeout(() => URL.revokeObjectURL(href), 60_000);
    } catch (failure) {
      tab?.close();
      failed(failure);
    } finally {
      setBusy(null);
    }
  };

  const download = async () => {
    setBusy("descargar");
    try {
      const { blob, filename } = await getRequestSupport(request.id, false);
      saveBlob(blob, filename ?? support?.file_name ?? "soporte");
    } catch (failure) {
      failed(failure);
    } finally {
      setBusy(null);
    }
  };

  const choose = (file: File | undefined) => {
    if (!file) return;
    const problem = supportProblem(file);
    if (problem) {
      toast.error(problem, { duration: Infinity });
      return;
    }
    attach.mutate(
      { id: request.id, file },
      { onSuccess: () => toast.success(support ? "Soporte reemplazado." : "Soporte adjuntado."), onError: failed }
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-3 text-sm">
      <span className="inline-flex min-w-0 items-center gap-1.5">
        <Paperclip className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
        <span className="text-text-secondary">Soporte del proveedor:</span>
        {support ? (
          <span className="min-w-0 truncate" title={`Adjuntado por ${support.uploaded_by}, ${formatWhen(support.uploaded_at)}`}>
            {support.file_name} <span className="text-text-secondary">· {formatBytes(support.size_bytes)}</span>
          </span>
        ) : (
          <span className="text-text-secondary">sin adjuntar</span>
        )}
      </span>
      <span className="flex flex-wrap gap-2">
        {support && (
          <>
            <Button variant="outline" size="sm" className="max-md:h-11" onClick={view} disabled={busy !== null}>
              {busy === "ver" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ExternalLink aria-hidden="true" />} Ver
            </Button>
            <Button variant="outline" size="sm" className="max-md:h-11" onClick={download} disabled={busy !== null}>
              {busy === "descargar" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />} Descargar
            </Button>
          </>
        )}
        {reviewing && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={SUPPORT_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-label="Soporte del proveedor"
              onChange={(event) => {
                choose(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11"
              onClick={() => inputRef.current?.click()}
              disabled={attach.isPending}
              title="PDF, imagen, Excel o Word, hasta 10 MB"
            >
              {attach.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Paperclip aria-hidden="true" />}
              {support ? "Reemplazar" : "Adjuntar"}
            </Button>
            {support && (
              <Button variant="ghost" size="sm" className="max-md:h-11" onClick={() => setRemoving(true)}>
                <Trash2 aria-hidden="true" /> Quitar
              </Button>
            )}
          </>
        )}
      </span>

      <ConfirmDeleteDialog
        open={removing}
        onOpenChange={(open) => {
          setRemoving(open);
          if (!open) detach.reset();
        }}
        title="¿Quitar el soporte del proveedor?"
        confirmLabel={detach.isPending ? "Quitando…" : "Quitar soporte"}
        isPending={detach.isPending}
        error={detach.isError ? errorMessage(detach.error) : null}
        onConfirm={() => detach.mutate(request.id, { onSuccess: () => setRemoving(false) })}
      >
        {support ? `«${support.file_name}» deja de estar en la solicitud. Puedes adjuntar otro mientras siga en revisión.` : ""}
      </ConfirmDeleteDialog>
    </div>
  );
}
