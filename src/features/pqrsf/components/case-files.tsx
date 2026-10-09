"use client";

import { useEffect, useState } from "react";
import { Download, Eye, File, FileImage, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";

import { useCaseFiles } from "../hooks/use-pqrsf";
import { formatDateTime } from "../lib/format";
import { downloadCaseFile, getCaseFileBlob } from "../services/pqrsf.service";
import type { CaseFile } from "../types/pqrsf.types";

const isImage = (file: CaseFile) => file.content_type.startsWith("image/");
const isPdf = (file: CaseFile) => file.content_type === "application/pdf";
// Images and PDF open inside the platform; spreadsheets and the rest are downloaded.
export const canPreview = (file: CaseFile) => isImage(file) || isPdf(file);

export function FileIcon({ file }: { file: CaseFile }) {
  const Icon = isImage(file)
    ? FileImage
    : /(csv|spreadsheet|excel)/.test(file.content_type)
      ? FileSpreadsheet
      : isPdf(file) || file.content_type.startsWith("text/")
        ? FileText
        : File;
  return <Icon className="size-5 shrink-0 text-text-secondary" aria-hidden="true" />;
}

/**
 * Files that came with the case's emails. They sit behind the session, so they are
 * fetched with credentials: images and PDF are shown from a local object URL, and
 * everything can be downloaded.
 */
export default function CaseFiles({ caseId }: { caseId: string }) {
  const files = useCaseFiles(caseId);
  const [previewing, setPreviewing] = useState<CaseFile | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  if (files.isPending) return null;
  if (files.error) {
    return (
      <section aria-labelledby="files-heading" className="space-y-2">
        <h2 id="files-heading" className="text-base font-semibold">
          Archivos recibidos por correo
        </h2>
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar los archivos: {errorMessage(files.error)}{" "}
          <button type="button" className="underline" onClick={() => files.refetch()}>
            Reintentar
          </button>
        </p>
      </section>
    );
  }
  // Files attached to a comment are shown under that comment, not here.
  const received = files.data.filter((file) => !file.comment_event_id);
  if (received.length === 0) return null;

  const download = async (file: CaseFile) => {
    setDownloading(file.id);
    try {
      await downloadCaseFile(caseId, file.id, file.filename);
    } catch (error) {
      toast.error(errorMessage(error), { duration: Infinity });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section aria-labelledby="files-heading" className="space-y-3">
      <div className="space-y-0.5">
        <h2 id="files-heading" className="text-base font-semibold">
          Archivos recibidos por correo ({received.length})
        </h2>
        <p className="text-[13px] text-text-secondary">
          Las imágenes y los PDF se abren aquí; los demás archivos se descargan.
        </p>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {received.map((file) => (
          <li key={file.id} className="flex items-center gap-3 px-3 py-2.5">
            <FileIcon file={file} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={file.filename}>
                {file.filename}
              </p>
              <p className="tabular text-[13px] text-text-secondary">
                {formatBytes(file.size_bytes)} · {formatDateTime(file.created_at)}
              </p>
            </div>
            {canPreview(file) && (
              <Button
                variant="outline"
                size="sm"
                className="max-md:h-11"
                onClick={() => setPreviewing(file)}
                aria-label={`Abrir ${file.filename}`}
              >
                <Eye aria-hidden="true" />
                Abrir
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="max-md:h-11"
              disabled={downloading === file.id}
              onClick={() => download(file)}
              aria-label={`Descargar ${file.filename}`}
            >
              {downloading === file.id ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Download aria-hidden="true" />
              )}
              Descargar
            </Button>
          </li>
        ))}
      </ul>
      {previewing && (
        <Preview
          caseId={caseId}
          file={previewing}
          onDownload={() => download(previewing)}
          onClose={() => setPreviewing(null)}
        />
      )}
    </section>
  );
}

/**
 * `load` must be a stable function (a module-level service), since it keys the
 * effect: cases pass `getCaseFileBlob`, suggestions pass `getFeedbackFileBlob`.
 */
export function Preview({
  caseId,
  file,
  load = getCaseFileBlob,
  onDownload,
  onClose,
}: {
  /** Id of whatever owns the file: the case or the suggestion. */
  caseId: string;
  file: CaseFile;
  load?: (ownerId: string, fileId: string) => Promise<Blob>;
  onDownload: () => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    load(caseId, file.id)
      .then((blob) => {
        if (cancelled) return;
        // The viewer picks the renderer from the type, so it is set from the API's record.
        objectUrl = URL.createObjectURL(new Blob([blob], { type: file.content_type }));
        setUrl(objectUrl);
      })
      .catch((cause) => !cancelled && setError(errorMessage(cause)));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [load, caseId, file.id, file.content_type]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={file.filename} wide>
      <div className="space-y-3">
        <div className="flex min-h-48 items-center justify-center rounded-md bg-canvas-subtle">
          {error ? (
            <p role="alert" className="p-4 text-sm text-danger">
              No se pudo abrir el archivo: {error}
            </p>
          ) : !url ? (
            <Loader2 className="size-6 animate-spin text-text-secondary" aria-label="Cargando" />
          ) : isImage(file) ? (
            // eslint-disable-next-line @next/next/no-img-element -- object URL, next/image cannot optimize it
            <img src={url} alt={file.filename} className="max-h-[70dvh] max-w-full object-contain" />
          ) : (
            <iframe src={url} title={file.filename} className="h-[70dvh] w-full rounded-md" />
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onDownload}>
            <Download aria-hidden="true" />
            Descargar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
