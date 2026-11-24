"use client";

import { useId, useRef } from "react";
import { Paperclip, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { formatBytes } from "@/shared/lib/format";

/** What the API takes as a supplier's support: PDF, picture, Excel or Word, up to 10 MB. */
export const SUPPORT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.doc";
export const SUPPORT_MAX_BYTES = 10 * 1024 * 1024;
const SUPPORT_PATTERN = /\.(pdf|png|jpe?g|webp|xlsx|xls|docx|doc)$/i;

/** Why the file cannot be a support, or null. The API checks again and has the last word. */
export function supportProblem(file: File): string | null {
  if (!SUPPORT_PATTERN.test(file.name)) return `El soporte debe ser PDF, imagen, Excel o Word. Elegiste «${file.name}».`;
  if (file.size > SUPPORT_MAX_BYTES) return `El soporte pesa ${formatBytes(file.size)}: el máximo es 10 MB.`;
  return null;
}

/**
 * The optional support of a request, picked before it is created: a button
 * that opens the file chooser and, once chosen, the file's name and size with
 * a way to drop it.
 */
export function SupportPicker({
  file,
  onChange,
  onProblem,
  disabled = false,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  /** Called with the reason a chosen file was refused, or null when it was taken. */
  onProblem: (problem: string | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">
        Soporte del proveedor <span className="font-normal text-text-secondary">(opcional)</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={SUPPORT_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-label="Soporte del proveedor"
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            event.target.value = "";
            if (!chosen) return;
            const problem = supportProblem(chosen);
            onProblem(problem);
            if (!problem) onChange(chosen);
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={disabled} aria-describedby={hintId}>
          <Paperclip aria-hidden="true" /> {file ? "Otro soporte" : "Elegir soporte"}
        </Button>
        {file && (
          <span className="inline-flex min-w-0 items-center gap-1 text-sm">
            <span className="truncate">{file.name}</span>
            <span className="shrink-0 text-text-secondary">· {formatBytes(file.size)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 max-md:size-11"
              onClick={() => onChange(null)}
              disabled={disabled}
              aria-label={`Quitar el soporte ${file.name}`}
            >
              <X aria-hidden="true" />
            </Button>
          </span>
        )}
      </div>
      <p id={hintId} className="text-xs text-text-secondary">
        PDF, imagen, Excel o Word, hasta 10 MB.
      </p>
    </div>
  );
}
