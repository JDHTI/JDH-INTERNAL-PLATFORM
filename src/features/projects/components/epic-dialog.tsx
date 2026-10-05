"use client";

import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useCreateEpic, useUpdateEpic } from "../hooks/use-projects";
import type { ProjectEpic } from "../types/project.types";
import { dateRangeError } from "./editable-fields";
import { ColorSwatches } from "./project-color";
import { useProjectsContext } from "./projects-context";

/**
 * Create when `epic` is null, edit when it is given. An epic groups the tasks
 * that serve one outcome; it has no column of its own, its progress is
 * counted from its tasks.
 */
export default function EpicDialog({
  projectId,
  epic,
  open,
  onOpenChange,
}: {
  projectId: string;
  epic: ProjectEpic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      isForm
      title={epic ? "Editar épica" : "Nueva épica"}
      description={
        epic
          ? undefined
          : "Agrupa las tareas que sirven a un mismo resultado: una fase, un entregable o un frente de trabajo. Las tareas pueden existir sin épica."
      }
    >
      {open && (
        <EpicForm
          key={epic?.id ?? "new"}
          projectId={projectId}
          epic={epic}
          onDone={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}

function EpicForm({
  projectId,
  epic,
  onDone,
}: {
  projectId: string;
  epic: ProjectEpic | null;
  onDone: () => void;
}) {
  const id = useId();
  const { slug, colors } = useProjectsContext();
  const create = useCreateEpic(slug, projectId);
  const update = useUpdateEpic(slug, projectId);
  const mutation = epic ? update : create;

  const [name, setName] = useState(epic?.name ?? "");
  const [description, setDescription] = useState(epic?.description ?? "");
  const [color, setColor] = useState(epic?.color ?? "default");
  const [start, setStart] = useState(epic?.start_date ?? "");
  const [end, setEnd] = useState(epic?.end_date ?? "");
  const [errors, setErrors] = useState<{ name?: string; end?: string }>({});

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = {
      name: name.trim() ? undefined : "Escribe un nombre para la épica.",
      end: dateRangeError(start || null, end || null) ?? undefined,
    };
    setErrors(found);
    if (found.name || found.end) return;

    const input = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      start_date: start || null,
      end_date: end || null,
    };
    if (epic) {
      update.mutate(
        { id: epic.id, input, optimistic: input },
        {
          onSuccess: () => {
            toast.success("Épica actualizada.");
            onDone();
          },
        }
      );
    } else {
      create.mutate(input, {
        onSuccess: (saved) => {
          toast.success(`Épica «${saved.name}» creada.`);
          onDone();
        },
      });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Nombre" htmlFor={`${id}-name`} error={errors.name}>
        <Input
          id={`${id}-name`}
          value={name}
          maxLength={200}
          autoFocus
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
          onChange={(event) => {
            setName(event.target.value);
            if (errors.name) setErrors({ ...errors, name: undefined });
          }}
        />
      </Field>

      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field label="Fecha de inicio" htmlFor={`${id}-start`} optional>
          <DatePicker id={`${id}-start`} value={start} clearable onChange={setStart} />
        </Field>
        <Field label="Fecha de fin" htmlFor={`${id}-end`} optional error={errors.end}>
          <DatePicker
            id={`${id}-end`}
            value={end}
            min={start || undefined}
            clearable
            aria-invalid={errors.end ? true : undefined}
            aria-describedby={errors.end ? `${id}-end-error` : undefined}
            onChange={(next) => {
              setEnd(next);
              if (errors.end) setErrors({ ...errors, end: undefined });
            }}
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

      <DialogError message={mutation.error ? errorMessage(mutation.error) : null} />

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {epic ? "Guardar cambios" : "Crear épica"}
        </Button>
      </DialogFooter>
    </form>
  );
}
