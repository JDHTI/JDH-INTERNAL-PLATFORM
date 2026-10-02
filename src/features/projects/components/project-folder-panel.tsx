"use client";

import { useState } from "react";
import { CloudOff, Folder as FolderIcon, FolderPlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Menu, MenuItem } from "@/shared/components/ui/menu";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import type { ProjectFolder } from "../types/project.types";
import PresenceAvatars from "./presence-avatars";
import { ColorDot } from "./project-color";
import { useProjectsContext } from "./projects-context";

export default function ProjectFolderPanel({
  folders,
  isPending,
  error,
  onRetry,
  counts,
  selectedId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  draggingProjectId,
  onDropProject,
}: {
  folders: ProjectFolder[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  /** Active projects per folder, recounted locally as projects move. */
  counts: Map<string, number>;
  selectedId: string | undefined;
  onSelect: (folder: ProjectFolder) => void;
  onCreate: () => void;
  onEdit: (folder: ProjectFolder) => void;
  onDelete: (folder: ProjectFolder) => void;
  /** Set while a project row is being dragged: folders become drop targets. */
  draggingProjectId: string | null;
  onDropProject: (projectId: string, folder: ProjectFolder) => void;
}) {
  const { canDelete, peopleWhere } = useProjectsContext();
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  return (
    <section aria-labelledby="project-folders-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="project-folders-heading" className="text-base font-semibold">
          Carpetas
        </h2>
        {folders && folders.length > 0 && (
          <Button variant="secondary" size="sm" onClick={onCreate} className="max-md:h-11">
            <FolderPlus aria-hidden="true" />
            Nueva carpeta
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="space-y-1" aria-busy="true" aria-label="Cargando carpetas">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-11 animate-pulse rounded-md bg-canvas-subtle" />
          ))}
        </div>
      ) : error ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se cargaron las carpetas"
          action={
            <Button variant="outline" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(error)}
        </StatePanel>
      ) : !folders || folders.length === 0 ? (
        <StatePanel
          icon={FolderIcon}
          title="Aún no hay carpetas"
          action={
            <Button variant="secondary" onClick={onCreate}>
              <FolderPlus aria-hidden="true" />
              Crear la primera carpeta
            </Button>
          }
        >
          Los proyectos del área viven dentro de carpetas. Crea una por equipo,
          cliente interno o año.
        </StatePanel>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {folders.map((folder) => {
            const isSelected = folder.id === selectedId;
            const isDropTarget = dropTargetId === folder.id;
            const count = counts.get(folder.id) ?? 0;
            const viewers = peopleWhere((member) => member.folder_id === folder.id);
            return (
              <li
                key={folder.id}
                onDragOver={(event) => {
                  if (!draggingProjectId) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dropTargetId !== folder.id) setDropTargetId(folder.id);
                }}
                onDragLeave={() => setDropTargetId(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDropTargetId(null);
                  const projectId = event.dataTransfer.getData("text/plain") || draggingProjectId;
                  if (projectId) onDropProject(projectId, folder);
                }}
                className={cn(
                  "flex items-center gap-1 pr-1",
                  // The bar marks the selected folder: state, not decoration.
                  isSelected
                    ? "bg-primary-subtle shadow-[inset_2px_0_0_var(--primary)]"
                    : "hover:bg-canvas-subtle",
                  // A dashed ring says "drop here" while a project is dragged.
                  isDropTarget && "outline-2 -outline-offset-2 outline-dashed outline-primary"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(folder)}
                  aria-current={isSelected ? "true" : undefined}
                  title={folder.description ? `${folder.name}: ${folder.description}` : folder.name}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <FolderIcon className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
                  <ColorDot color={folder.color} />
                  <span className={cn("min-w-0 flex-1 truncate text-sm", isSelected && "font-semibold")}>
                    {folder.name}
                  </span>
                  <PresenceAvatars people={viewers} max={2} label="viendo esta carpeta" />
                  <span className="tabular shrink-0 text-[13px] text-text-secondary">
                    {count}
                    <span className="sr-only">{count === 1 ? " proyecto activo" : " proyectos activos"}</span>
                  </span>
                </button>
                <Menu
                  align="end"
                  triggerLabel={`Acciones de la carpeta ${folder.name}`}
                  triggerTitle="Acciones de la carpeta"
                  triggerClassName="flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:size-11"
                  trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
                >
                  <MenuItem onClick={() => onEdit(folder)}>
                    <Pencil aria-hidden="true" />
                    Editar carpeta
                  </MenuItem>
                  {canDelete(folder) && (
                    <MenuItem onClick={() => onDelete(folder)}>
                      <Trash2 aria-hidden="true" />
                      Borrar carpeta
                    </MenuItem>
                  )}
                </Menu>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
