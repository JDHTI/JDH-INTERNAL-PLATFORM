"use client";

import { useId, useState } from "react";
import { SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useCreateTask, useUpdateTask, type TaskChange } from "../hooks/use-projects";
import { formatDateTime } from "../lib/format";
import type {
  CatalogOption,
  Person,
  ProjectEpic,
  ProjectTask,
  UpdateTaskInput,
} from "../types/project.types";
import {
  DateFields,
  dateRangeError,
  SavedOnBlurInput,
  SavedOnBlurTextarea,
} from "./editable-fields";
import OwnerSelect from "./owner-select";
import PresenceAvatars from "./presence-avatars";
import { useProjectsContext } from "./projects-context";

const epicOptions = (epics: ProjectEpic[]) =>
  epics.map((epic) => ({ value: epic.id, label: epic.name }));

// ── New task ──

export function NewTaskDialog({
  projectId,
  epics,
  taskStatuses,
  preset,
  onOpenChange,
}: {
  projectId: string;
  epics: ProjectEpic[];
  taskStatuses: CatalogOption[];
  /** Open when set: the column and epic the dialog was opened from. */
  preset: { status: string; epicId?: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={preset !== null} onOpenChange={onOpenChange} isForm title="Nueva tarea">
      {preset && (
        <NewTaskForm
          projectId={projectId}
          epics={epics}
          taskStatuses={taskStatuses}
          initialStatus={preset.status}
          initialEpicId={preset.epicId ?? ""}
          onDone={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}

function NewTaskForm({
  projectId,
  epics,
  taskStatuses,
  initialStatus,
  initialEpicId,
  onDone,
}: {
  projectId: string;
  epics: ProjectEpic[];
  taskStatuses: CatalogOption[];
  initialStatus: string;
  initialEpicId: string;
  onDone: () => void;
}) {
  const id = useId();
  const { slug, priorities } = useProjectsContext();
  const create = useCreateTask(slug, projectId);

  const [name, setName] = useState("");
  const [epicId, setEpicId] = useState(initialEpicId);
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState("medium");
  const [owner, setOwner] = useState<Person | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ name?: string; end?: string }>({});

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = {
      name: name.trim() ? undefined : "Escribe qué hay que hacer.",
      end: dateRangeError(start || null, end || null) ?? undefined,
    };
    setErrors(found);
    if (found.name || found.end) return;

    create.mutate(
      {
        epic_id: epicId || null,
        name: name.trim(),
        status,
        priority,
        owner_user_id: owner?.id ?? null,
        start_date: start || null,
        end_date: end || null,
        description: description.trim() || null,
      },
      {
        onSuccess: (task) => {
          toast.success(`Tarea «${task.name}» creada.`);
          onDone();
        },
      }
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Tarea" htmlFor={`${id}-name`} error={errors.name}>
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
        <Field label="Épica" htmlFor={`${id}-epic`} optional>
          <Dropdown
            id={`${id}-epic`}
            value={epicId}
            onValueChange={setEpicId}
            options={epicOptions(epics)}
            placeholder="Sin épica"
            clearable
            clearLabel="Quitar la épica"
          />
        </Field>
        <Field label="Responsable" htmlFor={`${id}-owner`} optional>
          <OwnerSelect id={`${id}-owner`} value={owner} onChange={setOwner} />
        </Field>
        <Field label="Estado" htmlFor={`${id}-status`}>
          <Dropdown id={`${id}-status`} value={status} onValueChange={setStatus} options={taskStatuses} />
        </Field>
        <Field label="Prioridad" htmlFor={`${id}-priority`}>
          <Dropdown id={`${id}-priority`} value={priority} onValueChange={setPriority} options={priorities} />
        </Field>
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
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={create.isPending}>
          Crear tarea
        </Button>
      </DialogFooter>
    </form>
  );
}

// ── Task detail ──

/**
 * One task, editable field by field like the project's settings. Moving it
 * to another column from here sends it to the end of that column.
 */
export function TaskDetailDialog({
  projectId,
  task,
  isOpen,
  epics,
  taskStatuses,
  onClose,
  onDelete,
}: {
  projectId: string;
  /** null while open means someone deleted it. */
  task: ProjectTask | null;
  isOpen: boolean;
  epics: ProjectEpic[];
  taskStatuses: CatalogOption[];
  onClose: () => void;
  onDelete: (task: ProjectTask) => void;
}) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      isForm
      title={task ? "Tarea" : "Tarea no disponible"}
    >
      {isOpen &&
        (task ? (
          <TaskFields
            key={task.id}
            projectId={projectId}
            task={task}
            epics={epics}
            taskStatuses={taskStatuses}
            onDelete={() => onDelete(task)}
          />
        ) : (
          <StatePanel
            icon={SearchX}
            title="Esta tarea ya no existe"
            action={
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            }
          >
            Alguien la borró mientras la tenías abierta.
          </StatePanel>
        ))}
    </Dialog>
  );
}

function TaskFields({
  projectId,
  task,
  epics,
  taskStatuses,
  onDelete,
}: {
  projectId: string;
  task: ProjectTask;
  epics: ProjectEpic[];
  taskStatuses: CatalogOption[];
  onDelete: () => void;
}) {
  const id = useId();
  const { slug, priorities, peopleWhere } = useProjectsContext();
  const update = useUpdateTask(slug, projectId);
  const [dateError, setDateError] = useState<string | null>(null);

  const viewers = peopleWhere((member) => member.project_id === projectId);

  const save = (input: UpdateTaskInput, optimistic?: TaskChange["optimistic"]) =>
    update.mutate({
      id: task.id,
      input,
      optimistic: optimistic ?? (input as TaskChange["optimistic"]),
    });

  return (
    <div className="space-y-4">
      {viewers.length > 0 && (
        <span className="flex items-center gap-2 text-[13px] text-text-secondary">
          <PresenceAvatars people={viewers} label="en el tablero de este proyecto" />
          {viewers.length === 1
            ? `${viewers[0]!.name} también está en este tablero`
            : `${viewers.length} personas más en este tablero`}
        </span>
      )}

      <Field label="Tarea" htmlFor={`${id}-name`}>
        <SavedOnBlurInput
          id={`${id}-name`}
          value={task.name}
          maxLength={200}
          onCommit={(text) => {
            const trimmed = text.trim();
            if (trimmed && trimmed !== task.name) save({ name: trimmed });
          }}
        />
      </Field>

      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field label="Épica" htmlFor={`${id}-epic`} optional>
          <Dropdown
            id={`${id}-epic`}
            value={task.epic_id ?? ""}
            onValueChange={(epicId) => (epicId || null) !== task.epic_id && save({ epic_id: epicId || null })}
            options={epicOptions(epics)}
            placeholder="Sin épica"
            clearable
            clearLabel="Quitar la épica"
          />
        </Field>
        <Field label="Responsable" htmlFor={`${id}-owner`} optional>
          <OwnerSelect
            id={`${id}-owner`}
            value={task.owner}
            onChange={(owner) => {
              if ((owner?.id ?? null) === (task.owner?.id ?? null)) return;
              save({ owner_user_id: owner?.id ?? null }, { owner });
            }}
          />
        </Field>
        <Field label="Estado" htmlFor={`${id}-status`}>
          <Dropdown
            id={`${id}-status`}
            value={task.status}
            onValueChange={(status) =>
              status !== task.status &&
              // Without a position the API puts it last in the new column.
              save({ status }, { status, position: Number.MAX_SAFE_INTEGER })
            }
            options={taskStatuses}
          />
        </Field>
        <Field label="Prioridad" htmlFor={`${id}-priority`}>
          <Dropdown
            id={`${id}-priority`}
            value={task.priority}
            onValueChange={(priority) => priority !== task.priority && save({ priority })}
            options={priorities}
          />
        </Field>
        <DateFields
          id={id}
          start={task.start_date}
          end={task.end_date}
          error={dateError}
          startOptional
          onCommit={(start, end) => {
            const rangeError = dateRangeError(start, end);
            setDateError(rangeError);
            if (rangeError) return;
            const input: UpdateTaskInput = {};
            if (start !== task.start_date) input.start_date = start;
            if (end !== task.end_date) input.end_date = end;
            if (Object.keys(input).length > 0) save(input);
          }}
        />
      </div>

      {task.status === "blocked" && (
        <Field label="Motivo del bloqueo" htmlFor={`${id}-blocked`} optional>
          <SavedOnBlurInput
            id={`${id}-blocked`}
            value={task.blocked_reason ?? ""}
            maxLength={500}
            placeholder="Qué espera esta tarea para seguir"
            onCommit={(text) => {
              const next = text.trim() || null;
              if (next !== task.blocked_reason) save({ blocked_reason: next });
            }}
          />
        </Field>
      )}

      <Field label="Descripción" htmlFor={`${id}-description`} optional>
        <SavedOnBlurTextarea
          id={`${id}-description`}
          value={task.description ?? ""}
          maxLength={5000}
          onCommit={(text) => {
            const next = text.trim() || null;
            if (next !== task.description) save({ description: next });
          }}
        />
      </Field>

      <DialogError message={update.error ? errorMessage(update.error) : null} />

      <p className="text-[13px] text-text-secondary">
        {/* No closing period: the time already ends in "p. m.". */}
        Creada por {task.created_by}. Última actualización de {task.updated_by} el{" "}
        <time dateTime={task.updated_at}>{formatDateTime(task.updated_at)}</time>
      </p>

      <div className="flex border-t border-border pt-4">
        <Button variant="danger" onClick={onDelete} className="max-md:h-11 max-sm:w-full">
          <Trash2 aria-hidden="true" />
          Borrar tarea
        </Button>
      </div>
    </div>
  );
}
