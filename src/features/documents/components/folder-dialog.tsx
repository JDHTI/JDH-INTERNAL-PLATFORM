"use client";

import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useCreateFolder, useUpdateFolder } from "../hooks/use-documents";
import type { Folder } from "../types/document.types";

/** Create when `folder` is null, rename/describe when it is given. */
export default function FolderDialog({
  slug,
  folder,
  open,
  onOpenChange,
  onSaved,
}: {
  slug: string;
  folder: Folder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (folder: Folder) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      isForm
      title={folder ? "Editar carpeta" : "Nueva carpeta"}
    >
      {/* Keyed so reopening starts from the folder's current values. */}
      {open && (
        <FolderForm
          key={folder?.id ?? "new"}
          slug={slug}
          folder={folder}
          onDone={(saved) => {
            onOpenChange(false);
            onSaved?.(saved);
          }}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}

function FolderForm({
  slug,
  folder,
  onDone,
  onCancel,
}: {
  slug: string;
  folder: Folder | null;
  onDone: (folder: Folder) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(folder?.name ?? "");
  const [description, setDescription] = useState(folder?.description ?? "");
  const [nameError, setNameError] = useState<string | null>(null);

  const create = useCreateFolder(slug);
  const update = useUpdateFolder(slug);
  const mutation = folder ? update : create;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Escribe un nombre para la carpeta.");
      return;
    }
    const input = { name: trimmed, description: description.trim() || null };
    const onSuccess = (saved: Folder) => {
      toast.success(folder ? "Carpeta actualizada." : "Carpeta creada.");
      onDone(saved);
    };
    if (folder) {
      update.mutate({ id: folder.id, input }, { onSuccess });
    } else {
      create.mutate(input, { onSuccess });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field
        label="Nombre"
        htmlFor={`${id}-name`}
        error={nameError}
      >
        <Input
          id={`${id}-name`}
          value={name}
          maxLength={150}
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
          maxLength={1000}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      <DialogError message={mutation.error ? errorMessage(mutation.error) : null} />

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {folder ? "Guardar cambios" : "Crear carpeta"}
        </Button>
      </DialogFooter>
    </form>
  );
}
