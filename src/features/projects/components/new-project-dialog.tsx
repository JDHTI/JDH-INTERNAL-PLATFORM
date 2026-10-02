"use client";

import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useCreateProject } from "../hooks/use-projects";
import { todayIso } from "../lib/format";
import type { Person, Project, ProjectFolder } from "../types/project.types";
import OwnerSelect from "./owner-select";
import { ColorSwatches } from "./project-color";
import { useProjectsContext } from "./projects-context";

export default function NewProjectDialog({
  open,
  onOpenChange,
  folders,
  folderId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: ProjectFolder[];
  /** Where the dialog opened from; the user can still pick another. */
  folderId: string | undefined;
  onCreated: (project: Project) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} isForm title="Nuevo proyecto">
      {open && (
        <ProjectForm
          folders={folders}
          initialFolderId={folderId ?? folders[0]?.id ?? ""}
          onCancel={() => onOpenChange(false)}
          onDone={(project) => {
            onOpenChange(false);
            onCreated(project);
          }}
        />
      )}
    </Dialog>
  );
}

interface Errors {
  name?: string;
  folder?: string;
  start?: string;
  end?: string;
}

function ProjectForm({
  folders,
  initialFolderId,
  onCancel,
  onDone,
}: {
  folders: ProjectFolder[];
  initialFolderId: string;
  onCancel: () => void;
  onDone: (project: Project) => void;
}) {
  const id = useId();
  const { slug, statuses, priorities, colors } = useProjectsContext();
  const create = useCreateProject(slug);

  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState(initialFolderId);
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("created");
  const [priority, setPriority] = useState("medium");
  const [owner, setOwner] = useState<Person | null>(null);
  const [color, setColor] = useState("default");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const validate = (): Errors => {
    const next: Errors = {};
    if (!name.trim()) next.name = "Escribe un nombre para el proyecto.";
    if (!folderId) next.folder = "Elige la carpeta donde va el proyecto.";
    if (!startDate) next.start = "Elige la fecha de inicio.";
    // ISO dates compare correctly as strings.
    if (startDate && endDate && endDate < startDate) {
      next.end = "La fecha de fin no puede ser anterior a la de inicio.";
    }
    return next;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    create.mutate(
      {
        folder_id: folderId,
        name: name.trim(),
        start_date: startDate,
        end_date: endDate || null,
        status,
        priority,
        owner_user_id: owner?.id ?? null,
        color,
        description: description.trim() || null,
      },
      {
        onSuccess: (project) => {
          toast.success(`Proyecto «${project.name}» creado.`);
          onDone(project);
        },
      }
    );
  };

  const errorProps = (key: keyof Errors, fieldId: string) =>
    errors[key]
      ? { "aria-invalid": true as const, "aria-describedby": `${fieldId}-error` }
      : {};

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Nombre" htmlFor={`${id}-name`} error={errors.name}>
        <Input
          id={`${id}-name`}
          value={name}
          maxLength={200}
          autoFocus
          {...errorProps("name", `${id}-name`)}
          onChange={(event) => {
            setName(event.target.value);
            if (errors.name) setErrors({ ...errors, name: undefined });
          }}
        />
      </Field>

      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field label="Carpeta" htmlFor={`${id}-folder`} error={errors.folder}>
          <Dropdown
            id={`${id}-folder`}
            value={folderId}
            onValueChange={setFolderId}
            options={folders.map((folder) => ({ value: folder.id, label: folder.name }))}
            placeholder="Elige una carpeta"
          />
        </Field>
        <Field label="Responsable" htmlFor={`${id}-owner`} optional>
          <OwnerSelect id={`${id}-owner`} value={owner} onChange={setOwner} />
        </Field>

        <Field label="Fecha de inicio" htmlFor={`${id}-start`} error={errors.start}>
          <Input
            id={`${id}-start`}
            type="date"
            value={startDate}
            {...errorProps("start", `${id}-start`)}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </Field>
        <Field label="Fecha de fin" htmlFor={`${id}-end`} optional error={errors.end}>
          <Input
            id={`${id}-end`}
            type="date"
            value={endDate}
            min={startDate || undefined}
            {...errorProps("end", `${id}-end`)}
            onChange={(event) => {
              setEndDate(event.target.value);
              if (errors.end) setErrors({ ...errors, end: undefined });
            }}
          />
        </Field>

        <Field label="Estado" htmlFor={`${id}-status`}>
          <Dropdown id={`${id}-status`} value={status} onValueChange={setStatus} options={statuses} />
        </Field>
        <Field label="Prioridad" htmlFor={`${id}-priority`}>
          <Dropdown
            id={`${id}-priority`}
            value={priority}
            onValueChange={setPriority}
            options={priorities}
          />
        </Field>
      </div>

      <ColorSwatches legend="Color" value={color} onChange={setColor} options={colors} />

      <Field label="Descripción" htmlFor={`${id}-description`} optional>
        <Textarea
          id={`${id}-description`}
          value={description}
          maxLength={5000}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      <DialogError message={create.error ? errorMessage(create.error) : null} />

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={create.isPending}>
          Crear proyecto
        </Button>
      </DialogFooter>
    </form>
  );
}
