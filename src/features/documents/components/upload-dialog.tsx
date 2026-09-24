"use client";

import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useUploadDocument } from "../hooks/use-documents";
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  fileExtension,
  formatBytes,
  parseTags,
} from "../lib/format";
import type { Folder } from "../types/document.types";

export default function UploadDialog({
  slug,
  folder,
  open,
  onOpenChange,
}: {
  slug: string;
  folder: Folder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      isForm
      title="Subir documento"
      description={
        <>
          Se guarda en la carpeta{" "}
          <span className="font-medium text-text-primary">{folder.name}</span>.
        </>
      }
    >
      {open && (
        <UploadForm
          slug={slug}
          folder={folder}
          onDone={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}

/** Local checks for the two limits the API enforces with 413 and 415. */
function validateFile(file: File | null): string | null {
  if (!file) return "Elige el archivo que vas a subir.";
  const ext = fileExtension(file.name);
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return `Los archivos .${ext || "sin extensión"} no se admiten. Usa PDF, Word, Excel, PowerPoint, CSV, TXT, PNG, JPG o ZIP.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `El archivo pesa ${formatBytes(file.size)}. El máximo es ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }
  return null;
}

function UploadForm({
  slug,
  folder,
  onDone,
}: {
  slug: string;
  folder: Folder;
  onDone: () => void;
}) {
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const upload = useUploadDocument(slug);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const problem = validateFile(file);
    setFileError(problem);
    if (problem || !file) return;

    upload.mutate(
      {
        folderId: folder.id,
        input: {
          file,
          name: name.trim() || undefined,
          description: description.trim() || undefined,
          tags: parseTags(tags).join(",") || undefined,
        },
      },
      {
        onSuccess: (document) => {
          toast.success(`«${document.name}» quedó en ${folder.name}.`);
          onDone();
        },
      }
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field
        label="Archivo"
        htmlFor={`${id}-file`}
        hint="PDF, Word, Excel, PowerPoint, CSV, TXT, PNG, JPG o ZIP. Máximo 25 MB."
        error={fileError}
      >
        <input
          id={`${id}-file`}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          aria-invalid={fileError ? true : undefined}
          aria-describedby={fileError ? `${id}-file-error` : `${id}-file-hint`}
          onChange={(event) => {
            const picked = event.target.files?.[0] ?? null;
            setFile(picked);
            setFileError(picked ? validateFile(picked) : null);
          }}
          className={
            "block w-full rounded-md border border-border-control text-sm text-text-secondary " +
            "file:mr-3 file:h-9 file:border-0 file:border-r file:border-border-control file:bg-canvas-subtle " +
            "file:px-3 file:text-sm file:font-medium file:text-text-primary " +
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
            "aria-invalid:border-danger"
          }
        />
      </Field>

      <Field
        label="Nombre"
        htmlFor={`${id}-name`}
        optional
        hint="Si lo dejas vacío, se usa el nombre del archivo."
      >
        <Input
          id={`${id}-name`}
          value={name}
          maxLength={255}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field label="Descripción" htmlFor={`${id}-description`} optional>
        <Textarea
          id={`${id}-description`}
          value={description}
          maxLength={2000}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      <Field
        label="Etiquetas"
        htmlFor={`${id}-tags`}
        optional
        hint="Separadas por comas, por ejemplo: contratos, 2026."
      >
        <Input
          id={`${id}-tags`}
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
      </Field>

      <DialogError message={upload.error ? errorMessage(upload.error) : null} />

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={upload.isPending}>
          {upload.isPending ? "Subiendo…" : "Subir documento"}
        </Button>
      </DialogFooter>
    </form>
  );
}
