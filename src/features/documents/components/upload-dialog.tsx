"use client";

import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useSaveTagColor, useTagColors, useUploadDocument } from "../hooks/use-documents";
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  fileExtension,
  formatBytes,
  normalizeTag,
  parseTags,
} from "../lib/format";
import type { Folder } from "../types/document.types";
import { TagColorButton } from "./tag-chip";

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
  // Colors picked here wait for the upload: coloring a tag of a document
  // that was never created would change the area for nothing. null means
  // "remove the color the area has".
  const [pendingColors, setPendingColors] = useState<Record<string, string | null>>({});
  const upload = useUploadDocument(slug);
  const areaColors = useTagColors(slug);
  const saveTagColor = useSaveTagColor(slug);

  const tagList = [...new Set(parseTags(tags).map(normalizeTag))];
  const colorOf = (tag: string) =>
    tag in pendingColors
      ? (pendingColors[tag] ?? undefined)
      : areaColors.data?.get(tag);

  const saveColors = async (uploadedTags: string[]) => {
    const changes = uploadedTags.filter(
      (tag) => tag in pendingColors && pendingColors[tag] !== (areaColors.data?.get(tag) ?? null)
    );
    const results = await Promise.allSettled(
      changes.map((tag) => saveTagColor.mutateAsync({ tag, color: pendingColors[tag] }))
    );
    const failed = changes.filter((_, index) => results[index].status === "rejected");
    if (failed.length > 0) {
      toast.error(
        `El documento se subió, pero no se guardó el color de: ${failed.join(", ")}. Cámbialo desde la tabla.`,
        { duration: Infinity }
      );
    }
  };

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
        onSuccess: async (document) => {
          // The API's tags, not the typed ones: they are what colors key on.
          await saveColors(document.tags);
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

      {tagList.length > 0 && (
        <div className="space-y-1.5">
          <p id={`${id}-colors`} className="text-[13px] font-medium">
            Color de las etiquetas
            <span className="font-normal text-text-secondary"> (opcional)</span>
          </p>
          <ul aria-labelledby={`${id}-colors`} className="flex flex-wrap gap-1">
            {tagList.map((tag) => (
              <li key={tag} className="min-w-0">
                <TagColorButton
                  tag={tag}
                  color={colorOf(tag)}
                  onSave={(color) =>
                    setPendingColors((current) => ({ ...current, [tag]: color }))
                  }
                  scopeNote="Se guarda al subir el documento y aplica en todo el área."
                />
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-text-secondary">
            Haz clic en una etiqueta para elegir su color. Las que ya tienen
            color en el área lo muestran.
          </p>
        </div>
      )}

      <DialogError message={upload.error ? errorMessage(upload.error) : null} />

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={upload.isPending || saveTagColor.isPending}>
          {upload.isPending || saveTagColor.isPending ? "Subiendo…" : "Subir documento"}
        </Button>
      </DialogFooter>
    </form>
  );
}
