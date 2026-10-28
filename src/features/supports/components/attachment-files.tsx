"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_EXTENSIONS,
  fileExtension,
  formatBytes,
  MAX_UPLOAD_BYTES,
} from "@/features/documents/lib/format";

/** The API takes up to 10 files per upload. */
export const MAX_FILES = 10;

const IMAGE = /^(png|jpe?g)$/;

/** Every pasted screenshot is called "image.png"; the time tells them apart in the list. */
function named(file: File): File {
  if (file.name !== "image.png" && file.name !== "") return file;
  const time = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return new File([file], `captura ${time.replace(/:/g, "-")}.${fileExtension(file.name) || "png"}`, { type: file.type });
}

function problem(file: File): string | null {
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(fileExtension(file.name))) {
    return `${file.name}: el gestor documental no recibe ese tipo de archivo.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name} pesa ${formatBytes(file.size)}; el máximo es ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }
  return null;
}

/**
 * Files for a support: dropped on the box, pasted with Ctrl+V anywhere while
 * it is on screen (most supports are screenshots of an email), or chosen
 * from the computer. Wrong types and sizes are caught here, before upload.
 */
export default function AttachmentFiles({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);

  const add = (incoming: File[]) => {
    const problems: string[] = [];
    const accepted: File[] = [];
    for (const raw of incoming) {
      const file = named(raw);
      const reason = problem(file);
      if (reason) problems.push(reason);
      else accepted.push(file);
    }
    const room = MAX_FILES - files.length;
    if (accepted.length > room) problems.push(`Se pueden subir hasta ${MAX_FILES} archivos a la vez.`);
    setRejected(problems);
    if (room > 0 && accepted.length > 0) onChange([...files, ...accepted.slice(0, room)]);
  };
  // The paste listener lives on the document, so it calls the latest `add` through a ref.
  const addRef = useRef(add);
  useEffect(() => {
    addRef.current = add;
  });

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const pasted = Array.from(event.clipboardData?.files ?? []);
      // Text pasted into a field is left alone; only files are taken.
      if (pasted.length === 0) return;
      event.preventDefault();
      addRef.current(pasted);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="space-y-2">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          add(Array.from(event.dataTransfer.files));
        }}
        className={cn(
          "flex flex-col items-start gap-2 rounded-lg border border-dashed border-border-control p-4 text-sm transition-colors duration-150",
          dragging && "border-ring bg-primary-subtle"
        )}
      >
        <p>
          Arrastra los archivos aquí o pega una captura con <kbd className="rounded-sm bg-canvas-subtle px-1 font-mono text-[13px]">Ctrl+V</kbd>.
        </p>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} className="max-sm:h-11">
          <Upload aria-hidden="true" /> Elegir archivos
        </Button>
        <input
          ref={inputRef}
          id={id}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            add(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <p className="text-[13px] text-text-secondary">
          Imágenes, PDF, Excel, Word o ZIP de hasta {formatBytes(MAX_UPLOAD_BYTES)}; máximo {MAX_FILES} archivos.
        </p>
      </div>

      {rejected.length > 0 && (
        <ul role="alert" className="space-y-0.5 text-[13px] text-danger">
          {rejected.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Archivos por subir">
          {files.map((file, index) => (
            <FileRow
              key={`${file.name}-${file.size}-${index}`}
              file={file}
              onRemove={() => onChange(files.filter((_, i) => i !== index))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FileRow({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const isImage = IMAGE.test(fileExtension(file.name));

  // A data URL instead of an object URL: nothing to revoke, so nothing leaks or breaks on re-render.
  useEffect(() => {
    if (!isImage) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file, isImage]);

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local preview of a file not uploaded yet
        <img src={preview} alt="" className="size-10 shrink-0 rounded-sm border border-border object-cover" />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-canvas-subtle">
          <FileText className="size-5 text-text-secondary" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{file.name}</span>
        <span className="block text-xs tabular-nums text-text-secondary">{formatBytes(file.size)}</span>
      </span>
      <Button variant="ghost" size="icon-sm" aria-label={`Quitar ${file.name}`} onClick={onRemove} className="max-sm:size-11">
        <X aria-hidden="true" />
      </Button>
    </li>
  );
}
