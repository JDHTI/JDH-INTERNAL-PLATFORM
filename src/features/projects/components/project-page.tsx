"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CloudOff,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  SearchX,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { Menu, MenuItem } from "@/shared/components/ui/menu";
import { errorMessage } from "@/shared/lib/api-client";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";
import { cn } from "@/shared/lib/utils";

import {
  useDeleteBlock,
  useDeleteTask,
  useProjectBlocks,
  useProjectTasks,
  useUpdateTask,
} from "../hooks/use-projects";
import {
  byPosition,
  dateRange,
  formatDate,
  formatDateTime,
  labelOf,
  personName,
  positionAt,
  statusTone,
} from "../lib/format";
import type { Project, ProjectBlock, ProjectTask } from "../types/project.types";
import BlockDialog from "./block-dialog";
import LiveStatus from "./live-status";
import PresenceAvatars from "./presence-avatars";
import { colorStyle, colorTint, ColorDot, hasColor } from "./project-color";
import { useProjectsContext } from "./projects-context";
import { deleteError, persistentError } from "./projects-shell";
import TaskBoard from "./task-board";
import { NewTaskDialog, TaskDetailDialog } from "./task-dialogs";

/** A project's own page: its dates, its blocks, and the board of its tasks. */
export default function ProjectPage({ projectId }: { projectId: string }) {
  const { slug, projects } = useProjectsContext();
  const project = projects.data?.find((item) => item.id === projectId);
  useBreadcrumbLabel(`/${slug}/proyectos/${projectId}`, project?.name);

  if (projects.isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Cargando proyecto">
        <div className="h-8 w-72 max-w-full animate-pulse rounded-md bg-canvas-subtle" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-sm bg-canvas-subtle" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((column) => (
            <div key={column} className="h-64 animate-pulse rounded-lg bg-canvas-subtle" />
          ))}
        </div>
      </div>
    );
  }

  if (projects.error) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se cargó el proyecto"
        action={
          <Button variant="outline" onClick={() => projects.refetch()}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(projects.error)}
      </StatePanel>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Proyecto no disponible</h1>
        <StatePanel
          icon={SearchX}
          title="Este proyecto no existe o lo borraron"
          action={
            <Link
              href={`/${slug}/proyectos`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-control px-3 text-sm font-medium hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver a los proyectos
            </Link>
          }
        >
          Si alguien lo borró mientras lo tenías abierto, sus bloques y tareas se fueron con él.
        </StatePanel>
      </div>
    );
  }

  return <ProjectBoard key={project.id} project={project} />;
}

function ProjectBoard({ project }: { project: Project }) {
  const {
    slug,
    statuses,
    priorities,
    taskStatuses,
    peopleWhere,
    liveStatus,
    openProjectSettings,
    canDelete,
  } = useProjectsContext();
  const blocks = useProjectBlocks(slug, project.id);
  const tasks = useProjectTasks(slug, project.id);
  const updateTask = useUpdateTask(slug, project.id);
  const deleteTask = useDeleteTask(slug, project.id);
  const deleteBlock = useDeleteBlock(slug, project.id);

  const [blockFilter, setBlockFilter] = useState<string | null>(null);
  const [blockDialog, setBlockDialog] = useState<{ block: ProjectBlock | null } | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<ProjectBlock | null>(null);
  const [newTask, setNewTask] = useState<{ status: string; blockId?: string } | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<ProjectTask | null>(null);

  const viewers = peopleWhere((member) => member.project_id === project.id);
  const blockList = useMemo(() => (blocks.data ?? []).slice().sort(byPosition), [blocks.data]);
  const blockMap = useMemo(() => new Map(blockList.map((block) => [block.id, block])), [blockList]);
  // A block deleted live (or never there) stops filtering.
  const activeFilter = blockFilter && blockMap.has(blockFilter) ? blockFilter : null;

  const taskList = useMemo(() => tasks.data ?? [], [tasks.data]);
  const tasksByStatus = useMemo(() => {
    const map = new Map<string, ProjectTask[]>();
    for (const column of taskStatuses) map.set(column.value, []);
    for (const task of tasks.data ?? []) {
      if (activeFilter && task.block_id !== activeFilter) continue;
      map.get(task.status)?.push(task);
    }
    for (const list of map.values()) list.sort(byPosition);
    return map;
  }, [tasks.data, taskStatuses, activeFilter]);

  // Counted from the tasks we hold, so a move shows in the block at once.
  const progress = useMemo(() => {
    const counts = new Map<string, { total: number; done: number }>();
    for (const task of taskList) {
      const entry = counts.get(task.block_id) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (task.status === "done") entry.done += 1;
      counts.set(task.block_id, entry);
    }
    return counts;
  }, [taskList]);
  const doneTotal = taskList.filter((task) => task.status === "done").length;

  const moveTask = (task: ProjectTask, status: string, toIndex: number) => {
    const column = (tasksByStatus.get(status) ?? []).filter((t) => t.id !== task.id);
    const index = Math.max(0, Math.min(toIndex, column.length));
    const position = positionAt(column, index);
    if (status === task.status && position === task.position) return;
    updateTask.mutate(
      {
        id: task.id,
        input: status === task.status ? { position } : { status, position },
        optimistic: { status, position },
      },
      { onError: (error) => persistentError(errorMessage(error)) }
    );
  };

  const openTask = taskList.find((task) => task.id === openTaskId) ?? null;
  const tasksInBlockToDelete = blockToDelete ? (progress.get(blockToDelete.id)?.total ?? 0) : 0;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
              <ColorDot color={project.color} className="size-2.5" />
              <span className="min-w-0 break-words">{project.name}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-text-secondary">
              <Badge tone={statusTone(project.status)}>{labelOf(statuses, project.status)}</Badge>
              {project.is_archived && <Badge>Archivado</Badge>}
              <span>Prioridad {labelOf(priorities, project.priority).toLowerCase()}</span>
              <span>{project.owner ? `Responsable: ${personName(project.owner)}` : "Sin responsable"}</span>
              {taskList.length > 0 && (
                <span className="tabular">
                  {doneTotal} de {taskList.length} {taskList.length === 1 ? "tarea hecha" : "tareas hechas"}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 [&>*]:max-sm:flex-1">
            <Button variant="secondary" size="lg" onClick={() => openProjectSettings(project)}>
              <Settings2 aria-hidden="true" />
              Ajustes
            </Button>
            <Button
              size="lg"
              disabled={blockList.length === 0}
              title={blockList.length === 0 ? "Crea un bloque primero" : undefined}
              onClick={() => setNewTask({ status: "todo", blockId: activeFilter ?? undefined })}
            >
              <Plus aria-hidden="true" />
              Nueva tarea
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:flex sm:flex-wrap">
          <DateItem label="Fecha de inicio" value={formatDate(project.start_date)} />
          <DateItem label="Fecha de fin" value={project.end_date ? formatDate(project.end_date) : "Sin definir"} />
          <DateItem
            label="Última actualización"
            value={formatDateTime(project.updated_at)}
            title={`Por ${project.updated_by}`}
            dateTime={project.updated_at}
          />
        </dl>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <LiveStatus status={liveStatus} />
          {viewers.length > 0 && (
            <span className="flex items-center gap-2 text-[13px] text-text-secondary">
              <PresenceAvatars people={viewers} max={5} label="en este proyecto" size="md" />
              {viewers.length === 1
                ? `${viewers[0]!.name} también está en este proyecto`
                : `${viewers.length} personas más en este proyecto`}
            </span>
          )}
        </div>
      </header>

      <section aria-labelledby="blocks-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="blocks-heading" className="text-base font-semibold">
            Bloques
          </h2>
          {blockList.length > 0 && (
            <Button variant="secondary" size="sm" onClick={() => setBlockDialog({ block: null })} className="max-md:h-11">
              <Plus aria-hidden="true" />
              Nuevo bloque
            </Button>
          )}
        </div>

        {blocks.isPending ? (
          <div className="flex gap-2" aria-busy="true" aria-label="Cargando bloques">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-14 w-48 animate-pulse rounded-md bg-canvas-subtle" />
            ))}
          </div>
        ) : blocks.error ? (
          <StatePanel
            icon={CloudOff}
            tone="danger"
            title="No se cargaron los bloques"
            action={
              <Button variant="outline" onClick={() => blocks.refetch()}>
                Reintentar
              </Button>
            }
          >
            {errorMessage(blocks.error)}
          </StatePanel>
        ) : blockList.length === 0 ? (
          <StatePanel
            icon={Layers}
            title="Divide el proyecto en bloques"
            action={
              <Button variant="secondary" onClick={() => setBlockDialog({ block: null })}>
                <Plus aria-hidden="true" />
                Crear el primer bloque
              </Button>
            }
          >
            Un bloque es una parte grande del proyecto: una fase, un entregable o un frente de
            trabajo. Cada tarea pertenece a un bloque.
          </StatePanel>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2" aria-label="Filtrar el tablero por bloque">
              <li>
                <FilterChip isActive={activeFilter === null} onClick={() => setBlockFilter(null)}>
                  Todos
                </FilterChip>
              </li>
              {blockList.map((block) => {
                const count = progress.get(block.id) ?? { total: 0, done: 0 };
                const dates = dateRange(block.start_date, block.end_date);
                return (
                  <li key={block.id} className="flex">
                    <FilterChip
                      isActive={activeFilter === block.id}
                      onClick={() => setBlockFilter(activeFilter === block.id ? null : block.id)}
                      color={block.color}
                      title={[block.description, dates].filter(Boolean).join(" · ") || undefined}
                    >
                      <ColorDot color={block.color} />
                      <span className="max-w-48 truncate">{block.name}</span>
                      <span className="tabular text-text-secondary">
                        {count.done}/{count.total}
                        <span className="sr-only"> tareas hechas</span>
                      </span>
                    </FilterChip>
                    <Menu
                      align="end"
                      triggerLabel={`Acciones del bloque ${block.name}`}
                      triggerTitle="Acciones del bloque"
                      triggerClassName="-ml-px flex w-8 items-center justify-center rounded-r-md border border-l-0 border-border text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:w-11"
                      trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
                    >
                      <MenuItem onClick={() => setBlockDialog({ block })}>
                        <Pencil aria-hidden="true" />
                        Editar bloque
                      </MenuItem>
                      <MenuItem onClick={() => setNewTask({ status: "todo", blockId: block.id })}>
                        <Plus aria-hidden="true" />
                        Nueva tarea en este bloque
                      </MenuItem>
                      {canDelete(block) && (
                        <MenuItem
                          onClick={() => {
                            deleteBlock.reset();
                            setBlockToDelete(block);
                          }}
                        >
                          <Trash2 aria-hidden="true" />
                          Borrar bloque
                        </MenuItem>
                      )}
                    </Menu>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {blockList.length > 0 && (
        <section aria-labelledby="board-heading" className="space-y-3">
          <h2 id="board-heading" className="text-base font-semibold">
            Tablero
            {activeFilter && (
              <span className="font-normal text-text-secondary"> · {blockMap.get(activeFilter)?.name}</span>
            )}
          </h2>
          {tasks.isPending ? (
            <div className="grid gap-4 md:grid-cols-3" aria-busy="true" aria-label="Cargando tareas">
              {[0, 1, 2].map((column) => (
                <div key={column} className="h-48 animate-pulse rounded-lg bg-canvas-subtle" />
              ))}
            </div>
          ) : tasks.error ? (
            <StatePanel
              icon={CloudOff}
              tone="danger"
              title="No se cargaron las tareas"
              action={
                <Button variant="outline" onClick={() => tasks.refetch()}>
                  Reintentar
                </Button>
              }
            >
              {errorMessage(tasks.error)}
            </StatePanel>
          ) : (
            <>
              <TaskBoard
                columns={taskStatuses}
                tasksByStatus={tasksByStatus}
                blocks={blockMap}
                onOpen={(task) => setOpenTaskId(task.id)}
                onMove={moveTask}
                onAdd={(status) => setNewTask({ status, blockId: activeFilter ?? undefined })}
                onDelete={(task) => {
                  deleteTask.reset();
                  setTaskToDelete(task);
                }}
              />
              {taskList.length === 0 && (
                <p className="text-[13px] text-text-secondary">
                  Aún no hay tareas. Agrega la primera en la columna donde va: las tareas se arrastran
                  entre columnas a medida que avanzan.
                </p>
              )}
            </>
          )}
        </section>
      )}

      <BlockDialog
        projectId={project.id}
        block={blockDialog?.block ?? null}
        open={blockDialog !== null}
        onOpenChange={(open) => !open && setBlockDialog(null)}
      />

      <NewTaskDialog
        projectId={project.id}
        blocks={blockList}
        taskStatuses={taskStatuses}
        preset={newTask}
        onOpenChange={(open) => !open && setNewTask(null)}
      />

      <TaskDetailDialog
        projectId={project.id}
        task={openTask}
        isOpen={openTaskId !== null}
        blocks={blockList}
        taskStatuses={taskStatuses}
        onClose={() => setOpenTaskId(null)}
        onDelete={(task) => {
          setOpenTaskId(null);
          deleteTask.reset();
          setTaskToDelete(task);
        }}
      />

      <ConfirmDeleteDialog
        open={taskToDelete !== null}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        title="¿Borrar la tarea?"
        confirmLabel="Borrar tarea"
        isPending={deleteTask.isPending}
        error={deleteTask.error ? errorMessage(deleteTask.error) : null}
        onConfirm={() =>
          taskToDelete &&
          deleteTask.mutate(taskToDelete.id, {
            onSuccess: () => {
              toast.success(`Tarea «${taskToDelete.name}» borrada.`);
              setTaskToDelete(null);
            },
          })
        }
      >
        Se borra «{taskToDelete?.name}» para todo el equipo. Esta acción no se puede deshacer.
      </ConfirmDeleteDialog>

      <ConfirmDeleteDialog
        open={blockToDelete !== null}
        onOpenChange={(open) => !open && setBlockToDelete(null)}
        title={tasksInBlockToDelete > 0 ? "El bloque tiene tareas" : "¿Borrar el bloque?"}
        blocked={tasksInBlockToDelete > 0}
        confirmLabel="Borrar bloque"
        isPending={deleteBlock.isPending}
        error={deleteError(deleteBlock.error, "bloque")}
        onConfirm={() =>
          blockToDelete &&
          deleteBlock.mutate(blockToDelete.id, {
            onSuccess: () => {
              toast.success(`Bloque «${blockToDelete.name}» borrado.`);
              setBlockToDelete(null);
            },
          })
        }
      >
        {tasksInBlockToDelete > 0 ? (
          <>
            «{blockToDelete?.name}» tiene {tasksInBlockToDelete}{" "}
            {tasksInBlockToDelete === 1 ? "tarea" : "tareas"}. Solo se borran bloques vacíos:
            mueve sus tareas a otro bloque o bórralas primero.
          </>
        ) : (
          <>Se borra «{blockToDelete?.name}» para todo el equipo. Esta acción no se puede deshacer.</>
        )}
      </ConfirmDeleteDialog>
    </div>
  );
}

function DateItem({
  label,
  value,
  title,
  dateTime,
}: {
  label: string;
  value: string;
  title?: string;
  dateTime?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="tabular font-medium" title={title}>
        {dateTime ? <time dateTime={dateTime}>{value}</time> : value}
      </dd>
    </div>
  );
}

/** A block as a filter: pressed while the board shows only its tasks. */
function FilterChip({
  isActive,
  onClick,
  color,
  title,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  color?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      title={title}
      style={colorStyle(color)}
      className={cn(
        "flex min-h-9 items-center gap-2 border px-3 text-[13px] font-medium max-md:min-h-11",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        // A block chip leaves its right corners to the menu attached to it.
        color !== undefined ? "rounded-l-md" : "rounded-md",
        hasColor(color) ? colorTint : "bg-surface",
        isActive ? "border-primary" : "border-border hover:bg-canvas-subtle"
      )}
    >
      {children}
    </button>
  );
}
