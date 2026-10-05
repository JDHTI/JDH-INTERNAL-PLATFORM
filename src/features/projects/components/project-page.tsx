"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Tabs } from "@base-ui/react/tabs";
import {
  ArrowLeft,
  CloudOff,
  Inbox,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SearchX,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import StatePanel from "@/shared/components/state-panel";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { Input } from "@/shared/components/ui/input";
import { Menu, MenuItem } from "@/shared/components/ui/menu";
import { errorMessage } from "@/shared/lib/api-client";
import { useBreadcrumbLabel } from "@/shared/store/use-breadcrumb-store";
import { cn } from "@/shared/lib/utils";

import {
  useDeleteEpic,
  useDeleteTask,
  useProjectEpics,
  useProjectTasks,
  useUpdateTask,
} from "../hooks/use-projects";
import {
  byPosition,
  dateRange,
  formatDate,
  formatDateTime,
  labelOf,
  normalizeSearch,
  personName,
  positionAt,
  statusTone,
} from "../lib/format";
import {
  BACKLOG_STATUS,
  PULL_STATUS,
  type Project,
  type ProjectEpic,
  type ProjectTask,
} from "../types/project.types";
import EpicDialog from "./epic-dialog";
import LiveStatus from "./live-status";
import PresenceAvatars from "./presence-avatars";
import { colorStyle, colorTint, ColorDot, hasColor } from "./project-color";
import { useProjectsContext } from "./projects-context";
import { deleteError, persistentError } from "./projects-shell";
import PullFromBacklogDialog from "./pull-from-backlog-dialog";
import TaskBoard from "./task-board";
import { NewTaskDialog, TaskDetailDialog } from "./task-dialogs";

type View = "board" | "backlog";

/** A project's own page: its dates, its epics, the backlog and the board of its tasks. */
export default function ProjectPage({ projectId }: { projectId: string }) {
  const { slug, projects } = useProjectsContext();
  const project = projects.data?.find((item) => item.id === projectId);
  useBreadcrumbLabel(`/${slug}/proyectos/${projectId}`, project?.name);

  if (projects.isPending) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Cargando proyecto">
        <div className="h-8 w-72 max-w-full animate-pulse rounded-md bg-canvas-subtle" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-sm bg-canvas-subtle" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((column) => (
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
          Si alguien lo borró mientras lo tenías abierto, sus épicas y tareas se fueron con él.
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
  const epics = useProjectEpics(slug, project.id);
  const tasks = useProjectTasks(slug, project.id);
  const updateTask = useUpdateTask(slug, project.id);
  const deleteTask = useDeleteTask(slug, project.id);
  const deleteEpic = useDeleteEpic(slug, project.id);

  const [view, setView] = useState<View>("board");
  const [epicFilter, setEpicFilter] = useState<string | null>(null);
  const [epicDialog, setEpicDialog] = useState<{ epic: ProjectEpic | null } | null>(null);
  const [epicToDelete, setEpicToDelete] = useState<ProjectEpic | null>(null);
  const [newTask, setNewTask] = useState<{ status: string; epicId?: string } | null>(null);
  const [isPullOpen, setPullOpen] = useState(false);
  const [backlogQuery, setBacklogQuery] = useState("");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<ProjectTask | null>(null);

  // The catalog brings the backlog first and the board's columns after it.
  const backlogColumn = useMemo(
    () => taskStatuses.filter((status) => status.value === BACKLOG_STATUS),
    [taskStatuses]
  );
  const boardColumns = useMemo(
    () => taskStatuses.filter((status) => status.value !== BACKLOG_STATUS),
    [taskStatuses]
  );
  const pullTarget = boardColumns.find((status) => status.value === PULL_STATUS) ?? boardColumns[0];

  const viewers = peopleWhere((member) => member.project_id === project.id);
  const epicList = useMemo(() => (epics.data ?? []).slice().sort(byPosition), [epics.data]);
  const epicMap = useMemo(() => new Map(epicList.map((epic) => [epic.id, epic])), [epicList]);
  // An epic deleted live (or never there) stops filtering.
  const activeFilter = epicFilter && epicMap.has(epicFilter) ? epicFilter : null;

  const taskList = useMemo(() => tasks.data ?? [], [tasks.data]);
  const tasksByStatus = useMemo(() => {
    const map = new Map<string, ProjectTask[]>();
    for (const column of taskStatuses) map.set(column.value, []);
    for (const task of tasks.data ?? []) {
      if (activeFilter && task.epic_id !== activeFilter) continue;
      map.get(task.status)?.push(task);
    }
    for (const list of map.values()) list.sort(byPosition);
    return map;
  }, [tasks.data, taskStatuses, activeFilter]);

  const backlogTasks = useMemo(() => tasksByStatus.get(BACKLOG_STATUS) ?? [], [tasksByStatus]);
  const backlogTotal = taskList.filter((task) => task.status === BACKLOG_STATUS).length;

  // The search looks at what a person remembers of a task: its name, what it
  // says, its epic and who has it.
  const query = normalizeSearch(backlogQuery);
  const backlogMatches = useMemo(() => {
    if (!query) return backlogTasks;
    return backlogTasks.filter((task) =>
      normalizeSearch(
        [
          task.name,
          task.description ?? "",
          task.epic_id ? (epicMap.get(task.epic_id)?.name ?? "") : "",
          personName(task.owner),
        ].join(" ")
      ).includes(query)
    );
  }, [backlogTasks, query, epicMap]);
  const backlogShown = useMemo(
    () => new Map([[BACKLOG_STATUS, backlogMatches]]),
    [backlogMatches]
  );

  // Counted from the tasks we hold, so a move shows in the epic at once.
  const progress = useMemo(() => {
    const counts = new Map<string, { total: number; done: number }>();
    for (const task of taskList) {
      if (!task.epic_id) continue;
      const entry = counts.get(task.epic_id) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (task.status === "done") entry.done += 1;
      counts.set(task.epic_id, entry);
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

  // The API files a task that changes status at the end of the new column.
  const pullTasks = (picked: ProjectTask[]) => {
    if (!pullTarget) return;
    for (const task of picked) {
      updateTask.mutate(
        {
          id: task.id,
          input: { status: pullTarget.value },
          optimistic: { status: pullTarget.value, position: Number.MAX_SAFE_INTEGER },
        },
        { onError: (error) => persistentError(errorMessage(error)) }
      );
    }
    toast.success(
      picked.length === 1
        ? `«${picked[0]!.name}» pasó a ${pullTarget.label}.`
        : `${picked.length} tareas pasaron a ${pullTarget.label}.`
    );
  };

  const openTask = taskList.find((task) => task.id === openTaskId) ?? null;
  const tasksInEpicToDelete = epicToDelete ? (progress.get(epicToDelete.id)?.total ?? 0) : 0;

  const taskActions = {
    onOpen: (task: ProjectTask) => setOpenTaskId(task.id),
    onMove: moveTask,
    onDelete: (task: ProjectTask) => {
      deleteTask.reset();
      setTaskToDelete(task);
    },
  };

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
              onClick={() => setNewTask({ status: BACKLOG_STATUS, epicId: activeFilter ?? undefined })}
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

      <section aria-labelledby="epics-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="epics-heading" className="text-base font-semibold">
            Épicas
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEpicDialog({ epic: null })}
            className="max-md:h-11"
          >
            <Plus aria-hidden="true" />
            Nueva épica
          </Button>
        </div>

        {epics.isPending ? (
          <div className="flex gap-2" aria-busy="true" aria-label="Cargando épicas">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-14 w-48 animate-pulse rounded-md bg-canvas-subtle" />
            ))}
          </div>
        ) : epics.error ? (
          <StatePanel
            icon={CloudOff}
            tone="danger"
            title="No se cargaron las épicas"
            action={
              <Button variant="outline" onClick={() => epics.refetch()}>
                Reintentar
              </Button>
            }
          >
            {errorMessage(epics.error)}
          </StatePanel>
        ) : epicList.length === 0 ? (
          <p className="text-[13px] text-text-secondary">
            Una épica agrupa las tareas que sirven a un mismo resultado: una fase, un entregable o
            un frente de trabajo. Son opcionales: las tareas funcionan sin ella.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label="Filtrar el backlog y el tablero por épica">
            <li>
              <FilterChip isActive={activeFilter === null} onClick={() => setEpicFilter(null)}>
                Todas
              </FilterChip>
            </li>
            {epicList.map((epic) => {
              const count = progress.get(epic.id) ?? { total: 0, done: 0 };
              const dates = dateRange(epic.start_date, epic.end_date);
              return (
                <li key={epic.id} className="flex">
                  <FilterChip
                    isActive={activeFilter === epic.id}
                    onClick={() => setEpicFilter(activeFilter === epic.id ? null : epic.id)}
                    color={epic.color}
                    title={[epic.description, dates].filter(Boolean).join(" · ") || undefined}
                  >
                    <ColorDot color={epic.color} />
                    <span className="max-w-48 truncate">{epic.name}</span>
                    <span className="tabular text-text-secondary">
                      {count.done}/{count.total}
                      <span className="sr-only"> tareas hechas</span>
                    </span>
                  </FilterChip>
                  <Menu
                    align="end"
                    triggerLabel={`Acciones de la épica ${epic.name}`}
                    triggerTitle="Acciones de la épica"
                    triggerClassName="-ml-px flex w-8 items-center justify-center rounded-r-md border border-l-0 border-border text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:w-11"
                    trigger={<MoreHorizontal className="size-4" aria-hidden="true" />}
                  >
                    <MenuItem onClick={() => setEpicDialog({ epic })}>
                      <Pencil aria-hidden="true" />
                      Editar épica
                    </MenuItem>
                    <MenuItem onClick={() => setNewTask({ status: BACKLOG_STATUS, epicId: epic.id })}>
                      <Plus aria-hidden="true" />
                      Nueva tarea en esta épica
                    </MenuItem>
                    {canDelete(epic) && (
                      <MenuItem
                        onClick={() => {
                          deleteEpic.reset();
                          setEpicToDelete(epic);
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                        Borrar épica
                      </MenuItem>
                    )}
                  </Menu>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Tabs.Root value={view} onValueChange={(next) => setView(next as View)} className="space-y-4">
        <Tabs.List
          aria-label="Vista del proyecto"
          className="flex gap-1 border-b border-border"
        >
          <ViewTab value="board">Tablero</ViewTab>
          <ViewTab value="backlog">
            Backlog
            <span className="tabular rounded-sm bg-canvas-subtle px-1.5 text-[13px] font-normal text-text-secondary">
              {backlogTotal}
              <span className="sr-only">{backlogTotal === 1 ? " tarea" : " tareas"}</span>
            </span>
          </ViewTab>
        </Tabs.List>

        <Tabs.Panel value="board" className="space-y-3 outline-none">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">
              Tablero
              {activeFilter && (
                <span className="font-normal text-text-secondary"> · {epicMap.get(activeFilter)?.name}</span>
              )}
            </h2>
            {pullTarget && (
              <Button
                variant="secondary"
                size="sm"
                className="max-md:h-11"
                onClick={() => setPullOpen(true)}
              >
                <Inbox aria-hidden="true" />
                Traer del backlog
              </Button>
            )}
          </div>
          <TasksState isPending={tasks.isPending} error={tasks.error} onRetry={() => tasks.refetch()}>
            <TaskBoard
              columns={boardColumns}
              targets={taskStatuses}
              tasksByStatus={tasksByStatus}
              epics={epicMap}
              className="md:grid-cols-2 xl:grid-cols-4"
              onAdd={(status) => setNewTask({ status, epicId: activeFilter ?? undefined })}
              {...taskActions}
            />
            {taskList.length === 0 && (
              <p className="text-[13px] text-text-secondary">
                Aún no hay tareas. Agrégalas al backlog y tráelas al tablero cuando las empieces: se
                arrastran entre columnas a medida que avanzan.
              </p>
            )}
          </TasksState>
        </Tabs.Panel>

        <Tabs.Panel value="backlog" className="space-y-3 outline-none">
          <h2 className="text-base font-semibold">
            Backlog
            {activeFilter && (
              <span className="font-normal text-text-secondary"> · {epicMap.get(activeFilter)?.name}</span>
            )}
          </h2>
          <TasksState isPending={tasks.isPending} error={tasks.error} onRetry={() => tasks.refetch()}>
            {backlogTasks.length > 0 && (
              <div className="space-y-1.5">
                <div className="relative max-w-md">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-text-secondary"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    value={backlogQuery}
                    onChange={(event) => setBacklogQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape" && backlogQuery) {
                        event.preventDefault();
                        setBacklogQuery("");
                      }
                    }}
                    aria-label="Buscar en el backlog"
                    placeholder="Buscar por nombre, descripción, épica o responsable"
                    className="pr-9 pl-8 max-md:h-11 [&::-webkit-search-cancel-button]:appearance-none"
                  />
                  {backlogQuery && (
                    <button
                      type="button"
                      aria-label="Borrar la búsqueda"
                      onClick={() => setBacklogQuery("")}
                      className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring max-md:size-10"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <p className="tabular min-h-5 text-[13px] text-text-secondary" aria-live="polite">
                  {query
                    ? `${backlogMatches.length} de ${backlogTasks.length} ${backlogTasks.length === 1 ? "tarea" : "tareas"}. Con una búsqueda activa no se puede reordenar.`
                    : ""}
                </p>
              </div>
            )}
            <TaskBoard
              columns={backlogColumn}
              targets={taskStatuses}
              tasksByStatus={backlogShown}
              epics={epicMap}
              variant="row"
              reorderable={!query}
              addLabel="Agregar al backlog"
              onAdd={(status) => setNewTask({ status, epicId: activeFilter ?? undefined })}
              {...taskActions}
            />
            {backlogTasks.length === 0 && (
              <p className="text-[13px] text-text-secondary">
                {backlogTotal === 0
                  ? "El backlog está vacío. Lo que se va a hacer pero aún no empieza vive aquí, ordenado por prioridad: lo de arriba se trae primero al tablero."
                  : "Esta épica no tiene tareas en el backlog."}
              </p>
            )}
            {backlogTasks.length > 0 && backlogMatches.length === 0 && (
              <p className="text-[13px] text-text-secondary">
                Ninguna tarea del backlog coincide con «{backlogQuery.trim()}».{" "}
                <button
                  type="button"
                  onClick={() => setBacklogQuery("")}
                  className="font-medium text-text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Borrar la búsqueda
                </button>
              </p>
            )}
          </TasksState>
        </Tabs.Panel>
      </Tabs.Root>

      <EpicDialog
        projectId={project.id}
        epic={epicDialog?.epic ?? null}
        open={epicDialog !== null}
        onOpenChange={(open) => !open && setEpicDialog(null)}
      />

      <NewTaskDialog
        projectId={project.id}
        epics={epicList}
        taskStatuses={taskStatuses}
        preset={newTask}
        onOpenChange={(open) => !open && setNewTask(null)}
      />

      {pullTarget && (
        <PullFromBacklogDialog
          open={isPullOpen}
          onOpenChange={setPullOpen}
          tasks={backlogTasks}
          epics={epicMap}
          target={pullTarget}
          onPull={pullTasks}
        />
      )}

      <TaskDetailDialog
        projectId={project.id}
        task={openTask}
        isOpen={openTaskId !== null}
        epics={epicList}
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
        open={epicToDelete !== null}
        onOpenChange={(open) => !open && setEpicToDelete(null)}
        title={tasksInEpicToDelete > 0 ? "La épica tiene tareas" : "¿Borrar la épica?"}
        blocked={tasksInEpicToDelete > 0}
        confirmLabel="Borrar épica"
        isPending={deleteEpic.isPending}
        error={deleteError(deleteEpic.error, "épica")}
        onConfirm={() =>
          epicToDelete &&
          deleteEpic.mutate(epicToDelete.id, {
            onSuccess: () => {
              toast.success(`Épica «${epicToDelete.name}» borrada.`);
              setEpicToDelete(null);
            },
          })
        }
      >
        {tasksInEpicToDelete > 0 ? (
          <>
            «{epicToDelete?.name}» tiene {tasksInEpicToDelete}{" "}
            {tasksInEpicToDelete === 1 ? "tarea" : "tareas"}. Solo se borran épicas vacías: pasa sus
            tareas a otra épica, quítales la épica o bórralas primero.
          </>
        ) : (
          <>Se borra «{epicToDelete?.name}» para todo el equipo. Esta acción no se puede deshacer.</>
        )}
      </ConfirmDeleteDialog>
    </div>
  );
}

/** Loading and error of the task list, shared by the board and the backlog. */
function TasksState({
  isPending,
  error,
  onRetry,
  children,
}: {
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Cargando tareas">
        {[0, 1, 2, 3].map((column) => (
          <div key={column} className="h-48 animate-pulse rounded-lg bg-canvas-subtle" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se cargaron las tareas"
        action={
          <Button variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(error)}
      </StatePanel>
    );
  }
  return <>{children}</>;
}

function ViewTab({ value, children }: { value: View; children: React.ReactNode }) {
  return (
    <Tabs.Tab
      value={value}
      className={cn(
        "-mb-px flex min-h-9 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium text-text-secondary max-md:min-h-11",
        "hover:text-text-primary data-[active]:border-primary data-[active]:text-text-primary",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      )}
    >
      {children}
    </Tabs.Tab>
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

/** An epic as a filter: pressed while the backlog and the board show only its tasks. */
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
        // An epic chip leaves its right corners to the menu attached to it.
        color !== undefined ? "rounded-l-md" : "rounded-md",
        hasColor(color) ? colorTint : "bg-surface",
        isActive ? "border-primary" : "border-border hover:bg-canvas-subtle"
      )}
    >
      {children}
    </button>
  );
}
