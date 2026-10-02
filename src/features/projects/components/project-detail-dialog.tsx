"use client";

import { useId, useState } from "react";
import { Archive, ArchiveRestore, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field } from "@/shared/components/ui/field";
import { errorMessage } from "@/shared/lib/api-client";

import { useSetArchived, useUpdateProject, type ProjectChange } from "../hooks/use-projects";
import { formatDateTime } from "../lib/format";
import type { Project, ProjectFolder, UpdateProjectInput } from "../types/project.types";
import {
  DateFields,
  dateRangeError,
  SavedOnBlurInput,
  SavedOnBlurTextarea,
} from "./editable-fields";
import OwnerSelect from "./owner-select";
import PresenceAvatars from "./presence-avatars";
import { ColorSwatches } from "./project-color";
import { useProjectsContext } from "./projects-context";

/**
 * A project's settings: everything but its blocks and tasks, which live on
 * its board. Every field saves on its own, the moment it changes (text
 * fields when they lose focus), so there is no "Guardar" to forget.
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
      title={project ? "Ajustes del proyecto" : "Proyecto no disponible"}
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

  const saveDates = (start: string | null, end: string | null) => {
    if (!start) {
      setDateError("El proyecto necesita una fecha de inicio.");
      return;
    }
    const rangeError = dateRangeError(start, end);
    setDateError(rangeError);
    if (rangeError) return;
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
        Creado por {project.created_by}. Última actualización de {project.updated_by} el{" "}
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
