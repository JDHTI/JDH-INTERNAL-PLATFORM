"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, RefreshCw } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";
import FileTypeIcon from "@/features/documents/components/file-type-icon";

import { useAttachmentView } from "../hooks/use-supports";
import { viewAttachment } from "../services/supports.service";
import type { SupportAttachment } from "../types/support.types";

const IMAGE = /^(png|jpe?g)$/i;

/**
 * Shows a support's documents one at a time, inside the support's detail:
 * images and PDF in place, anything else as a download. The arrows (and the
 * keyboard's) walk the same list the detail shows.
 */
export default function AttachmentViewer({
  supportId,
  items,
  index,
  onIndexChange,
  onClose,
}: {
  supportId: string;
  items: SupportAttachment[];
  /** null while closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const item = index === null ? undefined : items[index];
  const total = items.length;
  const go = (step: number) => {
    if (index !== null && total > 1) onIndexChange((index + step + total) % total);
  };

  return (
    <Dialog
      open={item !== undefined}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={item?.name ?? "Soporte"}
      description={
        item && (
          <>
            <span className="uppercase">{item.extension}</span> · <span className="tabular-nums">{formatBytes(item.size_bytes)}</span>
            {total > 1 && <span className="tabular-nums"> · {(index ?? 0) + 1} de {total}</span>}
          </>
        )
      }
      wide
    >
      {item && (
        <div
          className="space-y-4"
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") go(-1);
            if (event.key === "ArrowRight") go(1);
          }}
        >
          <Preview key={item.document_id} supportId={supportId} item={item} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {total > 1 ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => go(-1)} className="max-sm:h-11 max-sm:flex-1">
                  <ChevronLeft aria-hidden="true" /> Anterior
                </Button>
                <Button variant="outline" onClick={() => go(1)} className="max-sm:h-11 max-sm:flex-1">
                  Siguiente <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <span />
            )}
            <DownloadButton supportId={supportId} item={item} />
          </div>
        </div>
      )}
    </Dialog>
  );
}

function Preview({ supportId, item }: { supportId: string; item: SupportAttachment }) {
  const view = useAttachmentView(supportId, item.document_id);
  // The link lives five minutes; an image left open past that fails to reload, and asks again.
  const [broken, setBroken] = useState(false);
  const retry = () => {
    setBroken(false);
    view.refetch();
  };

  if (view.isPending) {
    return <div className="h-[60vh] animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando el soporte" />;
  }
  if (view.isError || broken) {
    const gone = view.error instanceof ApiError && view.error.status === 404;
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-border p-6 text-sm">
        <p className="text-danger">
          {gone
            ? "Este documento ya no está vinculado al apoyo."
            : broken
              ? "No se pudo mostrar el archivo; el enlace pudo vencer."
              : errorMessage(view.error)}
        </p>
        {!gone && (
          <Button variant="outline" onClick={retry}>
            <RefreshCw aria-hidden="true" /> Volver a cargar
          </Button>
        )}
      </div>
    );
  }

  const { url, extension, name } = view.data;
  if (IMAGE.test(extension)) {
    return (
      <div className="flex justify-center rounded-lg bg-canvas-subtle p-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- a signed link from storage, not an optimizable asset */}
        <img src={url} alt={name} onError={() => setBroken(true)} className="max-h-[70vh] w-auto max-w-full object-contain" />
      </div>
    );
  }
  if (extension.toLowerCase() === "pdf") {
    return <iframe src={url} title={name} className="h-[70vh] w-full rounded-lg border border-border bg-surface" />;
  }
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-6 text-sm">
      <FileTypeIcon extension={extension} className="h-9 w-7.5" />
      <p className="text-text-secondary">
        Los archivos {extension.toUpperCase()} no se pueden mostrar aquí. Descárgalo para abrirlo en el equipo.
      </p>
    </div>
  );
}

function DownloadButton({ supportId, item }: { supportId: string; item: SupportAttachment }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setPending(true);
    setError(null);
    try {
      // Asked for on click and used at once: the signed link expires in minutes.
      const link = await viewAttachment(supportId, item.document_id, true);
      window.location.assign(link.url);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-1 sm:text-right">
      <Button variant="outline" onClick={download} disabled={pending} className="max-sm:h-11 max-sm:w-full">
        <Download aria-hidden="true" /> {pending ? "Preparando" : "Descargar"}
      </Button>
      {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}
