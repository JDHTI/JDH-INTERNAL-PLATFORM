"use client";

import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useUpdateDocument } from "../hooks/use-documents";
import { parseTags } from "../lib/format";
import type { DocumentItem } from "../types/document.types";

export default function EditDocumentDialog({
  slug,
  document,
  onOpenChange,
}: {
  slug: string;
  /** Null keeps the dialog closed. */
  document: DocumentItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={document !== null}
      onOpenChange={onOpenChange}
      isForm
      title="Editar documento"
      description={document?.original_filename}
    >
      {document && (
        <EditForm
          key={document.id}
          slug={slug}
          document={document}
          onDone={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}

function EditForm({
  slug,
  document,
  onDone,
}: {
  slug: string;
  document: DocumentItem;
  onDone: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(document.name);
  const [description, setDescription] = useState(document.description ?? "");
  const [tags, setTags] = useState(document.tags.join(", "));
  const [nameError, setNameError] = useState<string | null>(null);
  const update = useUpdateDocument(slug);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Escribe un nombre para el documento.");
      return;
    }
    update.mutate(
      {
        id: document.id,
        input: {
          name: trimmed,
          description: description.trim() || null,
          tags: parseTags(tags),
        },
      },
      {
        onSuccess: () => {
          toast.success("Documento actualizado.");
          onDone();
        },
      }
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Nombre" htmlFor={`${id}-name`} error={nameError}>
        <Input
          id={`${id}-name`}
          value={name}
          maxLength={255}
          autoFocus
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? `${id}-name-error` : undefined}
          onChange={(event) => {
            setName(event.target.value);
            if (nameError) setNameError(null);
          }}
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
        hint="Separadas por comas. Déjalo vacío para quitarlas todas."
      >
        <Input
          id={`${id}-tags`}
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
      </Field>

      <DialogError message={update.error ? errorMessage(update.error) : null} />

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={update.isPending}>
          Guardar cambios
        </Button>
      </DialogFooter>
    </form>
  );
}
