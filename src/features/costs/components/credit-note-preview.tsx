"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { buttonVariants } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { errorMessage } from "@/shared/lib/api-client";

import { getCreditNoteBlob } from "../services/costs.service";
import type { CreditNote } from "../types/costs.types";

/** The credit note's PDF or picture inside the platform, with its download beside it. */
export default function CreditNotePreview({
  noveltyId,
  note,
  onClose,
}: {
  noveltyId: string;
  note: CreditNote;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    getCreditNoteBlob(noveltyId)
      .then((blob) => {
        if (cancelled) return;
        // The viewer picks the renderer from the type, so it comes from the API's record.
        objectUrl = URL.createObjectURL(new Blob([blob], { type: note.content_type }));
        setUrl(objectUrl);
      })
      .catch((cause) => !cancelled && setError(errorMessage(cause)));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [noveltyId, note.content_type]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={`Nota crédito ${note.number}`} description={note.original_filename} wide>
      <div className="space-y-3">
        <div className="flex min-h-48 items-center justify-center rounded-md bg-canvas-subtle">
          {error ? (
            <p role="alert" className="p-4 text-sm text-danger">
              No se pudo abrir el soporte: {error}
            </p>
          ) : !url ? (
            <Loader2 className="size-6 animate-spin text-text-secondary" aria-label="Cargando el soporte" />
          ) : note.content_type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element -- object URL, next/image cannot optimize it
            <img src={url} alt={`Soporte de la nota crédito ${note.number}`} className="max-h-[70dvh] max-w-full object-contain" />
          ) : (
            <iframe src={url} title={`Soporte de la nota crédito ${note.number}`} className="h-[70dvh] w-full rounded-md" />
          )}
        </div>
        {url && (
          <div className="flex justify-end">
            <a href={url} download={note.original_filename} className={buttonVariants({ variant: "outline" })}>
              <Download aria-hidden="true" />
              Descargar
            </a>
          </div>
        )}
      </div>
    </Dialog>
  );
}
