"use client";

import { useRef, type ChangeEvent } from "react";
import { Camera, Paperclip, Video, X } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";

import {
  acceptAttribute,
  describeLimits,
  formatFileSize,
  kindOf,
  mergeFiles,
  validateFiles,
} from "../lib/attachments";
import type { AttachmentLimits } from "../types/pqrsf-public.types";
import { FormField, describedBy } from "./form-field";

/**
 * Evidence picker: photos and, when the catalog allows, a short video. The
 * browser's own file inputs are hidden: they cannot be told what was chosen
 * through the camera, or removed one by one, so they kept saying «Ningún
 * archivo seleccionado» next to a list that had files. Everything shown here
 * comes from `files`, and the hidden inputs only hand files over.
 *
 * Without `limits` (an API that does not publish them) the form shows no caps
 * it cannot back up, takes photos only, and leaves the checks to the server.
 */
export default function AttachmentsField({
  files,
  limits,
  error,
  onFilesChange,
  onError,
}: {
  files: File[];
  limits: AttachmentLimits | null;
  error?: string;
  onFilesChange: (files: File[]) => void;
  onError: (message: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const takesVideo = Boolean(limits && limits.max_videos > 0);

  const receive = (event: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.currentTarget.files ?? []);
    // Emptied right away so choosing the same file again still fires a change.
    event.currentTarget.value = "";
    if (incoming.length === 0) return;

    const merged = mergeFiles(files, incoming);
    const message = limits ? validateFiles(merged, limits) : null;
    if (message) {
      onError(message);
      return;
    }
    onFilesChange(merged);
    onError(null);
  };

  const remove = (target: File) => {
    onFilesChange(files.filter((file) => file !== target));
    onError(null);
  };

  const hasHint = Boolean(limits);
  const hintId = describedBy("pqrsf-images", hasHint, Boolean(error));

  return (
    <FormField
      id="pqrsf-images"
      label="Evidencias"
      optional
      error={error}
      hint={limits ? describeLimits(limits) : undefined}
      className="sm:col-span-2"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={limits ? acceptAttribute(limits) : "image/*"}
        onChange={receive}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
      {/* `image/*` and `video/*`, not the extension list: some Android browsers
          only open the camera straight away with the generic type. The extension
          is still checked when the file comes back. */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={receive}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
      {takesVideo && (
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={receive}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
      )}

      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-md border border-border-control px-2 py-1.5",
          error && "border-danger"
        )}
      >
        <Button
          id="pqrsf-images"
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          aria-describedby={hintId}
          className="h-11 sm:h-9"
        >
          <Paperclip aria-hidden="true" />
          Elegir archivos
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => photoInputRef.current?.click()}
          aria-describedby={hintId}
          className="h-11 sm:h-9"
        >
          <Camera aria-hidden="true" />
          Tomar foto
        </Button>
        {takesVideo && (
          <Button
            type="button"
            variant="outline"
            onClick={() => videoInputRef.current?.click()}
            aria-describedby={hintId}
            className="h-11 sm:h-9"
          >
            <Video aria-hidden="true" />
            Grabar video
          </Button>
        )}
        <span className="text-sm text-text-secondary" aria-live="polite">
          {files.length === 0
            ? "Ningún archivo seleccionado"
            : files.length === 1
              ? "1 archivo"
              : `${files.length} archivos`}
        </span>
      </div>

      <p className="text-[13px] text-text-secondary">
        {takesVideo
          ? "En el celular, «Tomar foto» y «Grabar video» abren la cámara y piden permiso si hace falta."
          : "En el celular, «Tomar foto» abre la cámara y pide permiso si hace falta."}
      </p>

      {files.length > 0 && (
        <ul
          className="flex flex-col gap-1 rounded-md bg-canvas-subtle p-3 text-[13px]"
          aria-label="Archivos seleccionados"
        >
          {files.map((file) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex min-w-0 items-center justify-between gap-3"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {limits && kindOf(file, limits) === "video" ? (
                  <Video className="size-4 shrink-0 text-text-secondary" aria-label="Video" />
                ) : (
                  <Camera className="size-4 shrink-0 text-text-secondary" aria-label="Foto" />
                )}
                <span className="min-w-0 truncate">{file.name}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="tabular text-text-secondary">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  onClick={() => remove(file)}
                  aria-label={`Quitar ${file.name}`}
                  className="flex size-11 items-center justify-center rounded-sm text-text-secondary hover:bg-canvas hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring-control sm:size-8"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </FormField>
  );
}
