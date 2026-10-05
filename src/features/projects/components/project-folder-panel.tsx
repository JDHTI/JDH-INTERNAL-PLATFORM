"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  CloudOff,
  Folder as FolderIcon,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Menu, MenuItem } from "@/shared/components/ui/menu";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { byPosition } from "../lib/format";
import type { ProjectFolder } from "../types/project.types";
import PresenceAvatars from "./presence-avatars";
import { ColorDot } from "./project-color";
import { useProjectsContext } from "./projects-context";

/**
 * The area as a tree: folders open to show their active projects, and a
 * project opens its board. A folder opens on its own when it is the one
 * on screen; after that the chevron decides.
 */
export default function ProjectFolderPanel({
  counts,
  activeProjectId,
  onCreate,
  onEdit,
  onDelete,
  draggingProjectId,
  onDropProject,
}: {
  /** Active projects per folder, recounted locally as projects move. */
  counts: Map<string, number>;
  activeProjectId: string | null;
  onCreate: () => void;
  onEdit: (folder: ProjectFolder) => void;
  onDelete: (folder: ProjectFolder) => void;
  /** Set while a project row is being dragged: folders become drop targets. */
  draggingProjectId: string | null;
  onDropProject: (projectId: string, folder: ProjectFolder) => void;
}) {
  const { slug, folders, projects, selectedFolder, selectFolder, canDelete, peopleWhere } =
    useProjectsContext();
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  // Only what the person toggled; the rest follows the folder on screen.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const list = folders.data;

  return (
    <nav aria-labelledby="project-folders-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="project-folders-heading" className="text-base font-semibold">
          Carpetas
        </h2>
        {list && list.length > 0 && (
          <Button variant="secondary" size="sm" onClick={onCreate} className="max-md:h-11">
            <FolderPlus aria-hidden="true" />
            Nueva carpeta
          </Button>
        )}
      </div>

      {folders.isPending ? (
        <div className="space-y-1" aria-busy="true" aria-label="Cargando carpetas">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-11 animate-pulse rounded-md bg-canvas-subtle" />
          ))}
        </div>
      ) : folders.error ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se cargaron las carpetas"
          action={
            <Button variant="outline" size="sm" onClick={() => folders.refetch()}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(folders.error)}
        </StatePanel>
      ) : !list || list.length === 0 ? (
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
          {list.map((folder) => {
            const isSelected = !activeProjectId && folder.id === selectedFolder?.id;
            const isOpen = toggled[folder.id] ?? folder.id === selectedFolder?.id;
            const isDropTarget = dropTargetId === folder.id;
            const count = counts.get(folder.id) ?? 0;
            const viewers = peopleWhere((member) => member.folder_id === folder.id);
            const children = (projects.data ?? [])
              .filter((project) => project.folder_id === folder.id && !project.is_archived)
              .sort(byPosition);
            const childrenId = `folder-${folder.id}-projects`;

            return (
              <li key={folder.id}>
                <div
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
                    "flex items-center gap-0.5 pr-1",
                    // The bar marks the folder on screen: state, not decoration.
                    isSelected
                      ? "bg-primary-subtle shadow-[inset_2px_0_0_var(--primary)]"
                      : "hover:bg-canvas-subtle",
                    // A dashed ring says "drop here" while a project is dragged.
                    isDropTarget && "outline-2 -outline-offset-2 outline-dashed outline-primary"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setToggled({ ...toggled, [folder.id]: !isOpen })}
                    aria-expanded={isOpen}
                    aria-controls={childrenId}
                    aria-label={isOpen ? `Cerrar ${folder.name}` : `Abrir ${folder.name}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring max-md:size-11"
                  >
                    <ChevronRight
                      className={cn("size-4 transition-transform duration-150", isOpen && "rotate-90")}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      selectFolder(folder.id);
                      setToggled({ ...toggled, [folder.id]: true });
                    }}
                    aria-current={isSelected ? "true" : undefined}
                    title={folder.description ? `${folder.name}: ${folder.description}` : folder.name}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 py-2 pr-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
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
                </div>

                {isOpen && (
                  <ul id={childrenId} aria-label={`Proyectos de ${folder.name}`} className="pb-1">
                    {children.length === 0 ? (
                      <li className="py-2 pr-3 pl-11 text-[13px] text-text-secondary">
                        Sin proyectos activos
                      </li>
                    ) : (
                      children.map((project) => {
                        const isActive = project.id === activeProjectId;
                        const projectViewers = peopleWhere((member) => member.project_id === project.id);
                        return (
                          <li key={project.id}>
                            <Link
                              href={`/${slug}/proyectos/${project.id}`}
                              aria-current={isActive ? "page" : undefined}
                              className={cn(
                                "flex min-h-9 items-center gap-2 py-1.5 pr-3 pl-11 text-[13px] max-md:min-h-11",
                                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                                isActive
                                  ? "bg-primary-subtle font-semibold shadow-[inset_2px_0_0_var(--primary)]"
                                  : "hover:bg-canvas-subtle"
                              )}
                            >
                              <ColorDot color={project.color} />
                              <span className="min-w-0 flex-1 truncate">{project.name}</span>
                              <PresenceAvatars people={projectViewers} max={2} label="viendo este proyecto" />
                              {project.task_count ? (
                                <span className="tabular shrink-0 text-text-secondary">
                                  {project.done_count ?? 0}/{project.task_count}
                                  <span className="sr-only"> tareas hechas</span>
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
