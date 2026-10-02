"use client";

import { useId, useState } from "react";
import { Archive, ArchiveRestore, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useSetArchived, useUpdateProject, type ProjectChange } from "../hooks/use-projects";
import { formatDateTime } from "../lib/format";
import type { Project, ProjectFolder, UpdateProjectInput } from "../types/project.types";
import OwnerSelect from "./owner-select";
import PresenceAvatars from "./presence-avatars";
import { ColorSwatches } from "./project-color";
import { useProjectsContext } from "./projects-context";

/**
 * A project's page. Every field saves on its own, the moment it changes
 * (text fields when they lose focus), so there is no "Guardar" to forget.
 * Someone else's edit lands here live; a field being typed in keeps the
 * typed text until it is left, and then the last save wins.
 */
export default function ProjectDetailDialog({
  project,
  isOpen,
  folders,
  onClose,
  onDelete,
}: {
  /** null while open means it was deleted from under us. */
  project: Project | null;
  isOpen: boolean;
  folders: ProjectFolder[];
  onClose: () => void;
  onDelete: (project: Project) => void;
}) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      isForm
      title={project?.name ?? "Proyecto no disponible"}
    >
      {isOpen &&
        (project ? (
          <ProjectFields
            key={project.id}
            project={project}
            folders={folders}
            onDelete={() => onDelete(project)}
          />
        ) : (
          <StatePanel
            icon={SearchX}
            title="Este proyecto ya no existe"
            action={
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            }
          >
            Alguien lo borró mientras lo tenías abierto.
          </StatePanel>
        ))}
    </Dialog>
  );
}

function ProjectFields({
  project,
  folders,
  onDelete,
}: {
  project: Project;
  folders: ProjectFolder[];
  onDelete: () => void;
}) {
  const id = useId();
  const { slug, statuses, priorities, colors, canDelete, peopleWhere } = useProjectsContext();
  const update = useUpdateProject(slug);
  const setArchived = useSetArchived(slug);
  const [dateError, setDateError] = useState<string | null>(null);

  const viewers = peopleWhere((member) => member.project_id === project.id);

  const save = (input: UpdateProjectInput, optimistic?: ProjectChange["optimistic"]) =>
    update.mutate({
      id: project.id,
      input,
      optimistic: optimistic ?? (input as ProjectChange["optimistic"]),
    });

  const saveDates = (start: string, end: string | null) => {
    if (!start) {
      setDateError("El proyecto necesita una fecha de inicio.");
      return;
    }
    if (end && end < start) {
      setDateError("La fecha de fin no puede ser anterior a la de inicio.");
      return;
    }
    setDateError(null);
    const input: UpdateProjectInput = {};
    if (start !== project.start_date) input.start_date = start;
    if (end !== project.end_date) input.end_date = end;
    if (Object.keys(input).length > 0) save(input);
  };

  const toggleArchived = () => {
    const archived = !project.is_archived;
    setArchived.mutate(
      { id: project.id, archived },
      {
        onSuccess: () =>
          toast.success(archived ? `«${project.name}» archivado.` : `«${project.name}» restaurado.`),
      }
    );
  };

  const failure = update.error ?? setArchived.error;

  return (
    <div className="space-y-4">
      {(project.is_archived || viewers.length > 0) && (
        <div className="flex flex-wrap items-center gap-3">
          {project.is_archived && <Badge>Archivado</Badge>}
          {viewers.length > 0 && (
            <span className="flex items-center gap-2 text-[13px] text-text-secondary">
              <PresenceAvatars people={viewers} label="también tiene abierto este proyecto" />
              {viewers.length === 1
                ? `${viewers[0]!.name} también lo tiene abierto`
                : `${viewers.length} personas más lo tienen abierto`}
            </span>
          )}
        </div>
      )}

      <Field label="Nombre" htmlFor={`${id}-name`}>
        <SavedOnBlurInput
          id={`${id}-name`}
          value={project.name}
          maxLength={200}
          onCommit={(text) => {
            const trimmed = text.trim();
            // An empty name is not a name: the field goes back to the saved one.
            if (trimmed && trimmed !== project.name) save({ name: trimmed });
          }}
        />
      </Field>

      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field label="Estado" htmlFor={`${id}-status`}>
          <Dropdown
            id={`${id}-status`}
            value={project.status}
            onValueChange={(status) => status !== project.status && save({ status })}
            options={statuses}
          />
        </Field>
        <Field label="Prioridad" htmlFor={`${id}-priority`}>
          <Dropdown
            id={`${id}-priority`}
            value={project.priority}
            onValueChange={(priority) => priority !== project.priority && save({ priority })}
            options={priorities}
          />
        </Field>

        <Field label="Responsable" htmlFor={`${id}-owner`} optional>
          <OwnerSelect
            id={`${id}-owner`}
            value={project.owner}
            onChange={(owner) => {
              if ((owner?.id ?? null) === (project.owner?.id ?? null)) return;
              save({ owner_user_id: owner?.id ?? null }, { owner });
            }}
          />
        </Field>
        <Field label="Carpeta" htmlFor={`${id}-folder`}>
          <Dropdown
            id={`${id}-folder`}
            value={project.folder_id}
            onValueChange={(folderId) => {
              if (!folderId || folderId === project.folder_id) return;
              // Without a position the API puts it at the end of the folder.
              save({ folder_id: folderId }, { folder_id: folderId, position: Number.MAX_SAFE_INTEGER });
              const target = folders.find((folder) => folder.id === folderId);
              if (target) toast.success(`Movido a «${target.name}».`);
            }}
            options={folders.map((folder) => ({ value: folder.id, label: folder.name }))}
          />
        </Field>

        <DateFields
          id={id}
          start={project.start_date}
          end={project.end_date}
          error={dateError}
          onCommit={saveDates}
        />
      </div>

      <ColorSwatches
        legend="Color"
        value={project.color}
        onChange={(color) => color !== project.color && save({ color })}
        options={colors}
      />

      <Field label="Descripción" htmlFor={`${id}-description`} optional>
        <SavedOnBlurTextarea
          id={`${id}-description`}
          value={project.description ?? ""}
          maxLength={5000}
          onCommit={(text) => {
            const next = text.trim() || null;
            if (next !== project.description) save({ description: next });
          }}
        />
      </Field>

      <DialogError message={failure ? errorMessage(failure) : null} />

      <p className="text-[13px] text-text-secondary">
        {/* No closing period: the time already ends in "p. m.". */}
        Creado por {project.created_by}. Último cambio de {project.updated_by} el{" "}
        <time dateTime={project.updated_at}>{formatDateTime(project.updated_at)}</time>
      </p>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-between [&>*]:w-full sm:[&>*]:w-auto">
        {canDelete(project) ? (
          <Button variant="danger" onClick={onDelete} className="max-md:h-11">
            <Trash2 aria-hidden="true" />
            Borrar para siempre
          </Button>
        ) : (
          <span />
        )}
        <Button
          variant="secondary"
          onClick={toggleArchived}
          disabled={setArchived.isPending}
          className="max-md:h-11"
        >
          {project.is_archived ? (
            <>
              <ArchiveRestore aria-hidden="true" />
              Restaurar proyecto
            </>
          ) : (
            <>
              <Archive aria-hidden="true" />
              Archivar proyecto
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Dates commit when the field loses focus, not on change: typing a year in
 * a date input passes through dates nobody meant (0002-…), and saving each
 * one would publish it to everyone watching.
 */
function DateFields({
  id,
  start,
  end,
  error,
  onCommit,
}: {
  id: string;
  start: string;
  end: string | null;
  error: string | null;
  onCommit: (start: string, end: string | null) => void;
}) {
  const [draft, setDraft] = useState<{ start: string; end: string } | null>(null);
  const shown = draft ?? { start, end: end ?? "" };

  const commit = () => {
    if (!draft) return;
    onCommit(draft.start, draft.end || null);
    setDraft(null);
  };

  return (
    <>
      <Field label="Fecha de inicio" htmlFor={`${id}-start`} error={error}>
        <Input
          id={`${id}-start`}
          type="date"
          value={shown.start}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-start-error` : undefined}
          onChange={(event) => setDraft({ ...shown, start: event.target.value })}
          onBlur={commit}
        />
      </Field>
      <Field label="Fecha de fin" htmlFor={`${id}-end`} optional>
        <Input
          id={`${id}-end`}
          type="date"
          value={shown.end}
          min={shown.start || undefined}
          onChange={(event) => setDraft({ ...shown, end: event.target.value })}
          onBlur={commit}
        />
      </Field>
    </>
  );
}

/**
 * Shows the saved value until the field is edited; from the first keystroke
 * to leaving it, the typed text wins over anything arriving live.
 */
function useDraft(value: string, onCommit: (text: string) => void) {
  const [draft, setDraft] = useState<string | null>(null);
  return {
    value: draft ?? value,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(event.target.value),
    onBlur: () => {
      if (draft !== null) onCommit(draft);
      setDraft(null);
    },
  };
}

function SavedOnBlurInput({
  value,
  onCommit,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "onBlur"> & {
  value: string;
  onCommit: (text: string) => void;
}) {
  const draft = useDraft(value, onCommit);
  return (
    <Input
      {...props}
      {...draft}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}

function SavedOnBlurTextarea({
  value,
  onCommit,
  ...props
}: Omit<React.ComponentProps<"textarea">, "value" | "onChange" | "onBlur"> & {
  value: string;
  onCommit: (text: string) => void;
}) {
  const draft = useDraft(value, onCommit);
  return <Textarea {...props} {...draft} className="min-h-28" />;
}
