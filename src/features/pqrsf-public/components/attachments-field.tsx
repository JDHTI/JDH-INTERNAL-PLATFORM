"use client";

import { useRef, type ChangeEvent } from "react";
import { Camera, Paperclip, X } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";

import {
  ACCEPT_ATTRIBUTE,
  MAX_FILE_COUNT,
  formatFileSize,
  mergeFiles,
  validateFiles,
} from "../lib/attachments";
import { FormField, describedBy } from "./form-field";

/**
 * Evidence picker. The browser's own file input is hidden: it cannot be told
 * what was chosen through the camera, or removed one by one, so it kept saying
 * «Ningún archivo seleccionado» next to a list that had files. Everything shown
 * here comes from `files`, and the hidden inputs only hand files over.
 */
export default function AttachmentsField({
  files,
  error,
  onFilesChange,
  onError,
}: {
  files: File[];
  error?: string;
  onFilesChange: (files: File[]) => void;
  onError: (message: string | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const receive = (event: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.currentTarget.files ?? []);
    // Emptied right away so choosing the same file again still fires a change.
    event.currentTarget.value = "";
    if (incoming.length === 0) return;

    const merged = mergeFiles(files, incoming);
    const message = validateFiles(merged);
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

  const hintId = describedBy("pqrsf-images", true, Boolean(error));

  return (
    <FormField
      id="pqrsf-images"
      label="Archivos adjuntos"
      optional
      error={error}
      hint="JPG, JPEG, PNG o WebP. Máximo 5 archivos de 5 MiB cada uno y 25 MiB en total."
      className="sm:col-span-2"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={receive}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
      {/* `image/*`, not the list: some Android browsers only open the camera
          straight away with the generic type. validateFiles still checks the format. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={receive}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />

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
          onClick={() => cameraInputRef.current?.click()}
          aria-describedby={hintId}
          className="h-11 sm:h-9"
        >
          <Camera aria-hidden="true" />
          Tomar foto
        </Button>
        <span className="text-sm text-text-secondary" aria-live="polite">
          {files.length === 0
            ? "Ningún archivo seleccionado"
            : `${files.length} de ${MAX_FILE_COUNT} archivos`}
        </span>
      </div>

      <p className="text-[13px] text-text-secondary">
        En el celular, “Tomar foto” abrirá la cámara y solicitará permiso si es necesario.
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
              <span className="min-w-0 truncate">{file.name}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-text-secondary">{formatFileSize(file.size)}</span>
                <button
                  type="button"
                  onClick={() => remove(file)}
                  aria-label={`Quitar ${file.name}`}
                  className="flex size-8 items-center justify-center rounded-sm text-text-secondary hover:bg-canvas hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring-control"
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
