"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  FolderInput,
  GripVertical,
  MoreHorizontal,
  PanelRightOpen,
  Trash2,
} from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/shared/components/ui/menu";
import { cn } from "@/shared/lib/utils";

import { formatDate, labelOf, personName, statusTone } from "../lib/format";
import type { Project, ProjectFolder } from "../types/project.types";
import PresenceAvatars from "./presence-avatars";
import { ColorDot } from "./project-color";
import { useProjectsContext } from "./projects-context";

export interface ProjectRowActions {
  onOpen: (project: Project) => void;
  /** Index inside the visible list; the caller turns it into a position. */
  onReorder: (project: Project, toIndex: number) => void;
  onMove: (project: Project, folder: ProjectFolder) => void;
  onToggleArchived: (project: Project) => void;
  onDelete: (project: Project) => void;
}

/**
 * The folder's projects in their saved order. Rows drag to reorder or onto
 * a folder in the rail to move; the row menu does the same for keyboard and
 * touch, where drag and drop does not reach.
 */
export default function ProjectsList({
  projects,
  folders,
  canReorder,
  draggingId,
  onDraggingChange,
  ...actions
}: ProjectRowActions & {
  projects: Project[];
  folders: ProjectFolder[];
  /** Off while filtered or showing archived: hidden rows would break the order. */
  canReorder: boolean;
  draggingId: string | null;
  onDraggingChange: (id: string | null) => void;
}) {
  const { statuses, priorities, peopleWhere } = useProjectsContext();
  // Where the dragged row would land: before the row at this index.
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const endDrag = () => {
    onDraggingChange(null);
    setDropIndex(null);
  };

  return (
    // Sized by its container, not the viewport: beside the folder rail on a
    // 1440px screen the list is narrower than on a 1024px one without it.
    <div className="@container overflow-hidden rounded-lg border border-border">
      <div
        aria-hidden="true"
        className="hidden h-9 items-center gap-3 bg-canvas-subtle px-3 text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase @4xl:grid @4xl:grid-cols-[1.25rem_minmax(0,1fr)_8.5rem_5rem_10rem_12.5rem_2rem]"
      >
        <span />
        <span>Proyecto</span>
        <span>Estado</span>
        <span>Prioridad</span>
        <span>Responsable</span>
        <span className="text-right">Fechas</span>
        <span />
      </div>

      <ul
        aria-label="Proyectos de la carpeta"
        onDragOver={(event) => {
          if (draggingId && canReorder) event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          const dragged = projects.find((project) => project.id === draggingId);
          if (dragged && dropIndex !== null) {
            const from = projects.indexOf(dragged);
            // Dropping right above or below itself is not a move.
            if (dropIndex !== from && dropIndex !== from + 1) {
              actions.onReorder(dragged, dropIndex > from ? dropIndex - 1 : dropIndex);
            }
          }
          endDrag();
        }}
      >
        {projects.map((project, index) => {
          const viewers = peopleWhere((member) => member.project_id === project.id);
          const statusLabel = labelOf(statuses, project.status);
          const dates = project.end_date
            ? `${formatDate(project.start_date)} – ${formatDate(project.end_date)}`
            : `Desde ${formatDate(project.start_date)}`;

          return (
            <li
              key={project.id}
              draggable={canReorder || folders.length > 1}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", project.id);
                onDraggingChange(project.id);
              }}
              onDragEnd={endDrag}
              onDragOver={(event) => {
                if (!draggingId || !canReorder) return;
                const box = event.currentTarget.getBoundingClientRect();
                const after = event.clientY > box.top + box.height / 2;
                const next = after ? index + 1 : index;
                if (next !== dropIndex) setDropIndex(next);
              }}
              className={cn(
                "group relative border-t border-border first:border-t-0 hover:bg-primary-subtle",
                draggingId === project.id && "opacity-50",
                // The line shows where the row lands: it is the drop, not decoration.
                dropIndex === index && "shadow-[inset_0_2px_0_var(--primary)]",
                dropIndex === index + 1 &&
                  index === projects.length - 1 &&
                  "shadow-[inset_0_-2px_0_var(--primary)]"
              )}
            >
              <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_2.75rem] items-center gap-x-3 gap-y-1 px-3 py-2 @4xl:min-h-10 @4xl:grid-cols-[1.25rem_minmax(0,1fr)_8.5rem_5rem_10rem_12.5rem_2rem] @4xl:py-1">
                <GripVertical
                  className={cn(
                    // Drag and drop does not run on touch: there the row menu moves it.
                    "size-4 text-text-secondary pointer-coarse:invisible",
                    canReorder || folders.length > 1 ? "cursor-grab" : "opacity-0"
                  )}
                  aria-hidden="true"
                />

                <button
                  type="button"
                  onClick={() => actions.onOpen(project)}
                  className="flex min-h-11 min-w-0 items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring @4xl:min-h-8"
                >
                  <ColorDot color={project.color} />
                  <span className="min-w-0 truncate text-sm font-medium">{project.name}</span>
                  <PresenceAvatars people={viewers} max={2} label="viendo este proyecto" />
                </button>

                <span className="col-start-3 row-start-1 @4xl:hidden">
                  <RowMenu project={project} index={index} total={projects.length} folders={folders} canReorder={canReorder} {...actions} />
                </span>

                {/* Phone and tablet: the essentials under the name (DESIGN.md §10). */}
                <div className="col-span-2 col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 @4xl:contents">
                  <span className="@4xl:block">
                    <Badge tone={statusTone(project.status)}>{statusLabel}</Badge>
                  </span>
                  <span className="text-[13px] text-text-secondary @4xl:text-sm @4xl:text-text-primary">
                    <span className="@4xl:hidden">Prioridad </span>
                    {labelOf(priorities, project.priority)}
                  </span>
                  <span className="min-w-0 truncate text-[13px] text-text-secondary @4xl:text-sm @4xl:text-text-primary">
                    {project.owner ? (
                      personName(project.owner)
                    ) : (
                      <span className="text-text-secondary">Sin responsable</span>
                    )}
                  </span>
                  <span className="tabular text-[13px] whitespace-nowrap text-text-secondary @4xl:text-right @4xl:text-sm @4xl:text-text-primary">
                    {dates}
                  </span>
                </div>

                <span className="hidden @4xl:block">
                  <RowMenu project={project} index={index} total={projects.length} folders={folders} canReorder={canReorder} {...actions} />
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RowMenu({
  project,
  index,
  total,
  folders,
  canReorder,
  onOpen,
  onReorder,
  onMove,
  onToggleArchived,
  onDelete,
}: ProjectRowActions & {
  project: Project;
  index: number;
  total: number;
  folders: ProjectFolder[];
  canReorder: boolean;
}) {
  const { canDelete } = useProjectsContext();
  const otherFolders = folders.filter((folder) => folder.id !== project.folder_id);

  return (
    <Menu
      align="end"
      triggerLabel={`Acciones de ${project.name}`}
      triggerTitle="Acciones del proyecto"
      triggerClassName="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-lg:size-11"
      trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
    >
      <MenuItem onClick={() => onOpen(project)}>
        <PanelRightOpen aria-hidden="true" />
        Abrir
      </MenuItem>
      {canReorder && (
        <>
          <MenuItem onClick={() => onReorder(project, index - 1)} disabled={index === 0}>
            <ArrowUp aria-hidden="true" />
            Subir
          </MenuItem>
          <MenuItem onClick={() => onReorder(project, index + 1)} disabled={index === total - 1}>
            <ArrowDown aria-hidden="true" />
            Bajar
          </MenuItem>
        </>
      )}
      {otherFolders.length > 0 && (
        <>
          <MenuSeparator />
          <MenuLabel>Mover a</MenuLabel>
          {otherFolders.map((folder) => (
            <MenuItem key={folder.id} onClick={() => onMove(project, folder)}>
              <FolderInput aria-hidden="true" />
              <span className="truncate">{folder.name}</span>
            </MenuItem>
          ))}
        </>
      )}
      <MenuSeparator />
      <MenuItem onClick={() => onToggleArchived(project)}>
        {project.is_archived ? (
          <>
            <ArchiveRestore aria-hidden="true" />
            Restaurar
          </>
        ) : (
          <>
            <Archive aria-hidden="true" />
            Archivar
          </>
        )}
      </MenuItem>
      {canDelete(project) && (
        <MenuItem onClick={() => onDelete(project)}>
          <Trash2 aria-hidden="true" />
          Borrar para siempre
        </MenuItem>
      )}
    </Menu>
  );
}
