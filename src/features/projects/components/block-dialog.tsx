"use client";

import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useCreateBlock, useUpdateBlock } from "../hooks/use-projects";
import type { ProjectBlock } from "../types/project.types";
import { dateRangeError } from "./editable-fields";
import { ColorSwatches } from "./project-color";
import { useProjectsContext } from "./projects-context";

/**
 * Create when `block` is null, edit when it is given. A block is whatever
 * big piece the project splits into: a phase, a deliverable, a feature.
 */
export default function BlockDialog({
  projectId,
  block,
  open,
  onOpenChange,
}: {
  projectId: string;
  block: ProjectBlock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      isForm
      title={block ? "Editar bloque" : "Nuevo bloque"}
      description={
        block
          ? undefined
          : "Una parte grande del proyecto: una fase, un entregable o un frente de trabajo. Sus tareas se mueven en el tablero."
      }
    >
      {open && (
        <BlockForm
          key={block?.id ?? "new"}
          projectId={projectId}
          block={block}
          onDone={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}

function BlockForm({
  projectId,
  block,
  onDone,
}: {
  projectId: string;
  block: ProjectBlock | null;
  onDone: () => void;
}) {
  const id = useId();
  const { slug, colors } = useProjectsContext();
  const create = useCreateBlock(slug, projectId);
  const update = useUpdateBlock(slug, projectId);
  const mutation = block ? update : create;

  const [name, setName] = useState(block?.name ?? "");
  const [description, setDescription] = useState(block?.description ?? "");
  const [color, setColor] = useState(block?.color ?? "default");
  const [start, setStart] = useState(block?.start_date ?? "");
  const [end, setEnd] = useState(block?.end_date ?? "");
  const [errors, setErrors] = useState<{ name?: string; end?: string }>({});

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = {
      name: name.trim() ? undefined : "Escribe un nombre para el bloque.",
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
    if (block) {
      update.mutate(
        { id: block.id, input, optimistic: input },
        {
          onSuccess: () => {
            toast.success("Bloque actualizado.");
            onDone();
          },
        }
      );
    } else {
      create.mutate(input, {
        onSuccess: (saved) => {
          toast.success(`Bloque «${saved.name}» creado.`);
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
          <Input id={`${id}-start`} type="date" value={start} onChange={(event) => setStart(event.target.value)} />
        </Field>
        <Field label="Fecha de fin" htmlFor={`${id}-end`} optional error={errors.end}>
          <Input
            id={`${id}-end`}
            type="date"
            value={end}
            min={start || undefined}
            aria-invalid={errors.end ? true : undefined}
            aria-describedby={errors.end ? `${id}-end-error` : undefined}
            onChange={(event) => {
              setEnd(event.target.value);
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
          {block ? "Guardar cambios" : "Crear bloque"}
        </Button>
      </DialogFooter>
    </form>
  );
}
