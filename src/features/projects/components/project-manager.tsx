"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { Archive, CloudOff, FolderKanban, Lock, Plus, SearchX } from "lucide-react";
import { toast } from "sonner";

import { useArea } from "@/features/areas/hooks/use-areas";
import { useSession } from "@/features/session/hooks/use-session";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import {
  useDeleteFolder,
  useDeleteProject,
  useProjectAccess,
  useProjectCatalog,
  useProjectFolders,
  useProjectList,
  useSetArchived,
  useUpdateProject,
} from "../hooks/use-projects";
import { presentPeople, useProjectsLive } from "../hooks/use-projects-live";
import {
  byPosition,
  COLOR_LABELS,
  countByFolder,
  optionsOf,
  positionAt,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../lib/format";
import type { PresenceMember, Project, ProjectFolder } from "../types/project.types";
import LiveStatus from "./live-status";
import NewProjectDialog from "./new-project-dialog";
import PresenceAvatars from "./presence-avatars";
import ProjectDetailDialog from "./project-detail-dialog";
import ProjectFolderDialog from "./project-folder-dialog";
import ProjectFolderPanel from "./project-folder-panel";
import { ProjectsProvider, type ProjectsContextValue } from "./projects-context";
import ProjectsList, { type ProjectRowActions } from "./projects-list";

/** Error toasts stay until dismissed: an error that leaves on its own went unread. */
const persistentError = (message: string) => toast.error(message, { duration: Infinity });

/** The API's 403 on a delete, in words that say who can and what to do instead. */
function deleteError(error: unknown, what: "carpeta" | "proyecto"): string | null {
  if (!error) return null;
  if (error instanceof ApiError && error.status === 403) {
    return what === "proyecto"
      ? "Solo quien creó el proyecto, el responsable del área o un administrador puede borrarlo. Puedes archivarlo: deja de aparecer en la lista y se puede restaurar."
      : "Solo quien creó la carpeta, el responsable del área o un administrador puede borrarla.";
  }
  return errorMessage(error);
}

type View = "active" | "archived";

/**
 * Per-area project manager: area / folder / project, live. Everyone in the
 * area sees the same folders, and every change anyone makes shows up for
 * the rest within a second or two.
 */
export default function ProjectManager({ slug }: { slug: string }) {
  const filterId = useId();
  const { data: area } = useArea(slug);
  const session = useSession();
  const catalog = useProjectCatalog(slug);
  const access = useProjectAccess(slug);
  const folders = useProjectFolders(slug);
  const projects = useProjectList(slug);

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [view, setView] = useState<View>("active");
  const [statusFilter, setStatusFilter] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [folderDialog, setFolderDialog] = useState<{ folder: ProjectFolder | null } | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<ProjectFolder | null>(null);
  const [isNewProjectOpen, setNewProjectOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Falls back to the first folder when none is picked or the picked one was
  // deleted (by us or by someone else, live).
  const selected =
    folders.data?.find((folder) => folder.id === selectedId) ?? folders.data?.[0];

  const live = useProjectsLive(slug, {
    folderId: selected?.id ?? null,
    projectId: openProjectId,
  });

  const updateProject = useUpdateProject(slug);
  const setArchived = useSetArchived(slug);
  const deleteFolder = useDeleteFolder(slug);
  const deleteProject = useDeleteProject(slug);

  const selfUserId = session.data?.id;
  const accessData = access.data;
  const { members } = live;

  const peopleWhere = useCallback(
    (where: (member: PresenceMember) => boolean) => presentPeople(members, selfUserId, where),
    [members, selfUserId]
  );

  const context = useMemo<ProjectsContextValue>(
    () => ({
      slug,
      statuses: optionsOf(catalog.data?.statuses, STATUS_LABELS),
      priorities: optionsOf(catalog.data?.priorities, PRIORITY_LABELS),
      colors: optionsOf(catalog.data?.colors, COLOR_LABELS),
      // Until /access answers nobody sees the delete actions; a delete that
      // shows and then fails with 403 is worse than one that appears late.
      canDelete: (item) =>
        !!accessData &&
        (accessData.can_delete_any ||
          item.created_by.toLowerCase() === accessData.email.toLowerCase()),
      peopleWhere,
    }),
    [slug, catalog.data, accessData, peopleWhere]
  );

  const counts = useMemo(() => countByFolder(projects.data), [projects.data]);
  const inFolder = useMemo(
    () =>
      (projects.data ?? [])
        .filter((project) => project.folder_id === selected?.id)
        .sort(byPosition),
    [projects.data, selected?.id]
  );
  const activeInFolder = inFolder.filter((project) => !project.is_archived);
  const archivedCount = inFolder.length - activeInFolder.length;
  const visible = (view === "active" ? activeInFolder : inFolder.filter((p) => p.is_archived)).filter(
    (project) => !statusFilter || project.status === statusFilter
  );
  const canReorder = view === "active" && !statusFilter;

  const openProject = projects.data?.find((project) => project.id === openProjectId) ?? null;
  const everyoneElse = presentPeople(members, selfUserId);

  const actions: ProjectRowActions = {
    onOpen: (project) => setOpenProjectId(project.id),
    onReorder: (project, toIndex) => {
      const siblings = activeInFolder.filter((p) => p.id !== project.id);
      const position = positionAt(siblings, toIndex);
      updateProject.mutate(
        { id: project.id, input: { position }, optimistic: { position } },
        { onError: (error) => persistentError(errorMessage(error)) }
      );
    },
    onMove: (project, folder) => moveTo(project, folder),
    onToggleArchived: (project) => {
      const archived = !project.is_archived;
      setArchived.mutate(
        { id: project.id, archived },
        {
          onSuccess: () =>
            toast.success(archived ? `«${project.name}» archivado.` : `«${project.name}» restaurado.`),
          onError: (error) => persistentError(errorMessage(error)),
        }
      );
    },
    onDelete: (project) => {
      deleteProject.reset();
      setProjectToDelete(project);
    },
  };

  function moveTo(project: Project, folder: ProjectFolder) {
    if (project.folder_id === folder.id) return;
    // Without a position the API puts it last in the target folder; the
    // optimistic copy does the same until the response brings the real one.
    updateProject.mutate(
      {
        id: project.id,
        input: { folder_id: folder.id },
        optimistic: { folder_id: folder.id, position: Number.MAX_SAFE_INTEGER },
      },
      {
        onSuccess: () => toast.success(`«${project.name}» movido a «${folder.name}».`),
        onError: (error) => persistentError(errorMessage(error)),
      }
    );
  }

  // The module answers 404 for areas where it is not enabled, and 403 for
  // people outside the area: both are whole-page answers, not panel errors.
  const pageError = [folders.error, projects.error].find(
    (error) => error instanceof ApiError && (error.status === 404 || error.status === 403)
  ) as ApiError | undefined;

  if (pageError || live.status === "disabled" || live.status === "forbidden") {
    const isDisabled = pageError?.status === 404 || live.status === "disabled";
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
        <StatePanel
          icon={Lock}
          title={
            isDisabled
              ? "Proyectos no está habilitado para esta área"
              : "No tienes acceso a los proyectos del área"
          }
        >
          {isDisabled
            ? "Por ahora el gestor de proyectos solo funciona en el área de TI."
            : "Pídele al responsable del área o a un administrador de la plataforma que te agregue como miembro."}
        </StatePanel>
      </div>
    );
  }

  const folderList = folders.data ?? [];
  const projectsInFolderToDelete = folderToDelete
    ? (projects.data ?? []).filter((project) => project.folder_id === folderToDelete.id).length
    : 0;

  return (
    <ProjectsProvider value={context}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
            <p className="text-sm text-text-secondary">
              Proyectos de {area?.name ?? "el área"} por carpeta. Lo que cambia alguien del
              equipo aparece aquí sin recargar.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
              <LiveStatus status={live.status} />
              {everyoneElse.length > 0 && (
                <span className="flex items-center gap-2 text-[13px] text-text-secondary">
                  <PresenceAvatars people={everyoneElse} max={5} label="conectados ahora" size="md" />
                  {everyoneElse.length === 1
                    ? `${everyoneElse[0]!.name} también está aquí`
                    : `${everyoneElse.length} personas más conectadas`}
                </span>
              )}
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => setNewProjectOpen(true)}
            disabled={!selected}
            title={selected ? `Nuevo proyecto en ${selected.name}` : "Crea una carpeta primero"}
          >
            <Plus aria-hidden="true" />
            Nuevo proyecto
          </Button>
        </div>

        {/* Side by side only from xl: below that the rail leaves the list too
            narrow for its columns, so folders stack on top. */}
        <div className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
          <ProjectFolderPanel
            folders={folders.data}
            isPending={folders.isPending}
            error={folders.error}
            onRetry={() => folders.refetch()}
            counts={counts}
            selectedId={selected?.id}
            onSelect={(folder) => {
              setSelectedId(folder.id);
              setView("active");
              setStatusFilter("");
            }}
            onCreate={() => setFolderDialog({ folder: null })}
            onEdit={(folder) => setFolderDialog({ folder })}
            onDelete={(folder) => {
              deleteFolder.reset();
              setFolderToDelete(folder);
            }}
            draggingProjectId={draggingId}
            onDropProject={(projectId, folder) => {
              const project = projects.data?.find((p) => p.id === projectId);
              if (project) moveTo(project, folder);
              setDraggingId(null);
            }}
          />

          {selected && (
            <section aria-labelledby="projects-heading" className="min-w-0 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <h2 id="projects-heading" className="text-base font-semibold">
                  {selected.name}
                  {selected.description && (
                    <span className="mt-0.5 block text-[13px] font-normal text-text-secondary">
                      {selected.description}
                    </span>
                  )}
                </h2>
                <div className="flex flex-wrap items-end gap-3">
                  <ViewSwitch view={view} onChange={setView} archivedCount={archivedCount} />
                  <div className="w-full space-y-1.5 sm:w-48">
                    <label htmlFor={`${filterId}-status`} className="block text-[13px] font-medium">
                      Estado
                    </label>
                    <Dropdown
                      id={`${filterId}-status`}
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                      options={context.statuses}
                      placeholder="Todos los estados"
                      clearable
                      clearLabel="Mostrar todos los estados"
                    />
                  </div>
                </div>
              </div>

              <ProjectsArea
                query={projects}
                visible={visible}
                folders={folderList}
                view={view}
                isFiltered={statusFilter !== ""}
                hasArchived={archivedCount > 0}
                canReorder={canReorder}
                draggingId={draggingId}
                onDraggingChange={setDraggingId}
                onCreate={() => setNewProjectOpen(true)}
                onClearFilter={() => setStatusFilter("")}
                onShowActive={() => setView("active")}
                {...actions}
              />
              {canReorder && visible.length > 1 && (
                <p className="text-[13px] text-text-secondary">
                  Arrastra un proyecto para cambiar su orden, o suéltalo sobre otra carpeta para
                  moverlo. Desde el teclado, usa el menú de cada fila.
                </p>
              )}
            </section>
          )}
        </div>

        <ProjectFolderDialog
          folder={folderDialog?.folder ?? null}
          open={folderDialog !== null}
          onOpenChange={(open) => !open && setFolderDialog(null)}
          onSaved={(folder) => setSelectedId(folder.id)}
        />

        <NewProjectDialog
          open={isNewProjectOpen}
          onOpenChange={setNewProjectOpen}
          folders={folderList}
          folderId={selected?.id}
          onCreated={(project) => {
            setSelectedId(project.folder_id);
            setView("active");
          }}
        />

        <ProjectDetailDialog
          project={openProject}
          isOpen={openProjectId !== null}
          folders={folderList}
          onClose={() => setOpenProjectId(null)}
          onDelete={(project) => {
            setOpenProjectId(null);
            deleteProject.reset();
            setProjectToDelete(project);
          }}
        />

        <ConfirmDeleteDialog
          open={folderToDelete !== null}
          onOpenChange={(open) => !open && setFolderToDelete(null)}
          title={projectsInFolderToDelete > 0 ? "La carpeta no está vacía" : "¿Borrar la carpeta?"}
          blocked={projectsInFolderToDelete > 0}
          confirmLabel="Borrar carpeta"
          isPending={deleteFolder.isPending}
          error={deleteError(deleteFolder.error, "carpeta")}
          onConfirm={() =>
            folderToDelete &&
            deleteFolder.mutate(folderToDelete.id, {
              onSuccess: () => {
                toast.success(`Carpeta «${folderToDelete.name}» borrada.`);
                setFolderToDelete(null);
              },
            })
          }
        >
          {projectsInFolderToDelete > 0 ? (
            <>
              «{folderToDelete?.name}» tiene {projectsInFolderToDelete}{" "}
              {projectsInFolderToDelete === 1 ? "proyecto" : "proyectos"}, contando los
              archivados. Solo se borran carpetas vacías: mueve o borra primero sus proyectos.
            </>
          ) : (
            <>Se borra «{folderToDelete?.name}» para todo el equipo. Esta acción no se puede deshacer.</>
          )}
        </ConfirmDeleteDialog>

        <ConfirmDeleteDialog
          open={projectToDelete !== null}
          onOpenChange={(open) => !open && setProjectToDelete(null)}
          title="¿Borrar el proyecto para siempre?"
          confirmLabel="Borrar proyecto"
          isPending={deleteProject.isPending}
          error={deleteError(deleteProject.error, "proyecto")}
          onConfirm={() =>
            projectToDelete &&
            deleteProject.mutate(projectToDelete.id, {
              onSuccess: () => {
                toast.success(`«${projectToDelete.name}» borrado.`);
                setProjectToDelete(null);
              },
            })
          }
        >
          Se borra «{projectToDelete?.name}» para todo el equipo y no se puede recuperar. Si
          solo quieres sacarlo de la lista, archívalo.
        </ConfirmDeleteDialog>
      </div>
    </ProjectsProvider>
  );
}

function ViewSwitch({
  view,
  onChange,
  archivedCount,
}: {
  view: View;
  onChange: (view: View) => void;
  archivedCount: number;
}) {
  const option = (value: View, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={view === value}
      onClick={() => onChange(value)}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-[13px] font-medium max-md:h-10",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        view === value ? "bg-surface text-text-primary" : "text-text-secondary hover:text-text-primary"
      )}
    >
      {label}
    </button>
  );

  return (
    <div
      role="radiogroup"
      aria-label="Qué proyectos mostrar"
      className="flex rounded-md bg-canvas-subtle p-0.5"
    >
      {option("active", "Activos")}
      {option("archived", archivedCount > 0 ? `Archivados (${archivedCount})` : "Archivados")}
    </div>
  );
}

function ProjectsArea({
  query,
  visible,
  folders,
  view,
  isFiltered,
  hasArchived,
  canReorder,
  draggingId,
  onDraggingChange,
  onCreate,
  onClearFilter,
  onShowActive,
  ...actions
}: ProjectRowActions & {
  query: ReturnType<typeof useProjectList>;
  visible: Project[];
  folders: ProjectFolder[];
  view: View;
  isFiltered: boolean;
  hasArchived: boolean;
  canReorder: boolean;
  draggingId: string | null;
  onDraggingChange: (id: string | null) => void;
  onCreate: () => void;
  onClearFilter: () => void;
  onShowActive: () => void;
}) {
  if (query.isPending) {
    return (
      <div className="overflow-hidden rounded-lg border border-border" aria-busy="true" aria-label="Cargando proyectos">
        <div className="hidden h-9 bg-canvas-subtle lg:block" />
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex h-12 items-center gap-3 border-t border-border px-3 first:border-t-0 lg:h-10">
            <div className="h-3 w-1/3 animate-pulse rounded-sm bg-canvas-subtle" />
            <div className="h-3 w-20 animate-pulse rounded-sm bg-canvas-subtle" />
            <div className="ml-auto h-3 w-24 animate-pulse rounded-sm bg-canvas-subtle" />
          </div>
        ))}
      </div>
    );
  }

  if (query.error) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se cargaron los proyectos"
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(query.error)}
      </StatePanel>
    );
  }

  if (visible.length === 0) {
    if (isFiltered) {
      return (
        <StatePanel
          icon={SearchX}
          title="Ningún proyecto tiene ese estado"
          action={
            <Button variant="outline" onClick={onClearFilter}>
              Mostrar todos los estados
            </Button>
          }
        >
          El filtro solo mira esta carpeta.
        </StatePanel>
      );
    }
    if (view === "archived") {
      return (
        <StatePanel
          icon={Archive}
          title="No hay proyectos archivados"
          action={
            <Button variant="outline" onClick={onShowActive}>
              Ver los activos
            </Button>
          }
        >
          Al archivar un proyecto sale de la lista de activos y queda aquí, listo para
          restaurarlo.
        </StatePanel>
      );
    }
    return (
      <StatePanel
        icon={FolderKanban}
        title={hasArchived ? "No quedan proyectos activos" : "Esta carpeta está vacía"}
        action={
          <Button variant="secondary" onClick={onCreate}>
            <Plus aria-hidden="true" />
            Crear un proyecto aquí
          </Button>
        }
      >
        {hasArchived
          ? "Los proyectos de esta carpeta están archivados. Puedes verlos en «Archivados»."
          : "Un proyecto lleva estado, prioridad, responsable y fechas. Todo el equipo lo ve y lo edita."}
      </StatePanel>
    );
  }

  return (
    <ProjectsList
      projects={visible}
      folders={folders}
      canReorder={canReorder}
      draggingId={draggingId}
      onDraggingChange={onDraggingChange}
      {...actions}
    />
  );
}
