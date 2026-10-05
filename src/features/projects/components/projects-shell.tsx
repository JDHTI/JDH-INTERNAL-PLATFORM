"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import { useSession } from "@/features/session/hooks/use-session";
import StatePanel from "@/shared/components/state-panel";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
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
  COLOR_LABELS,
  countByFolder,
  optionsOf,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_STATUS_LABELS,
} from "../lib/format";
import type { PresenceMember, Project, ProjectFolder } from "../types/project.types";
import NewProjectDialog from "./new-project-dialog";
import ProjectDetailDialog from "./project-detail-dialog";
import ProjectFolderDialog from "./project-folder-dialog";
import ProjectFolderPanel from "./project-folder-panel";
import { ProjectsProvider, type ProjectsContextValue } from "./projects-context";

/** Error toasts stay until dismissed: an error that leaves on its own went unread. */
export const persistentError = (message: string) => toast.error(message, { duration: Infinity });

/** The API's 403 on a delete, in words that say who can and what to do instead. */
export function deleteError(error: unknown, what: "carpeta" | "proyecto" | "épica"): string | null {
  if (!error) return null;
  if (error instanceof ApiError && error.status === 403) {
    if (what === "proyecto") {
      return "Solo quien creó el proyecto, el responsable del área o un administrador puede borrarlo. Puedes archivarlo: deja de aparecer en la lista y se puede restaurar.";
    }
    return `Solo quien creó ${what === "carpeta" ? "la carpeta" : "la épica"}, el responsable del área o un administrador puede borrarla.`;
  }
  return errorMessage(error);
}

/**
 * The project manager's frame, shared by the folder list and every project
 * page: one live connection for the area, the folder tree, and the dialogs
 * both pages open. It lives in the module's layout, so moving between a
 * folder and a project keeps the connection and the presence.
 */
export default function ProjectsShell({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const params = useParams<{ projectId?: string }>();
  const projectId = params.projectId ?? null;

  const session = useSession();
  const catalog = useProjectCatalog(slug);
  const access = useProjectAccess(slug);
  const folders = useProjectFolders(slug);
  const projects = useProjectList(slug);

  const [folderId, setFolderId] = useState<string | undefined>();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [folderDialog, setFolderDialog] = useState<{ folder: ProjectFolder | null } | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<ProjectFolder | null>(null);
  const [isNewProjectOpen, setNewProjectOpen] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const openProject = projects.data?.find((project) => project.id === projectId);
  // On a project page the folder is the project's; on the list, the picked
  // one, falling back to the first when none is picked or it was deleted.
  const selectedFolder = openProject
    ? folders.data?.find((folder) => folder.id === openProject.folder_id)
    : (folders.data?.find((folder) => folder.id === folderId) ?? folders.data?.[0]);

  const live = useProjectsLive(slug, {
    folderId: selectedFolder?.id ?? null,
    projectId,
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

  const listPath = `/${slug}/proyectos`;

  const moveProject = useCallback(
    (project: Project, folder: ProjectFolder) => {
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
    },
    [updateProject]
  );

  const toggleArchived = useCallback(
    (project: Project) => {
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
    [setArchived]
  );

  const context = useMemo<ProjectsContextValue>(
    () => ({
      slug,
      statuses: optionsOf(catalog.data?.statuses, STATUS_LABELS),
      priorities: optionsOf(catalog.data?.priorities, PRIORITY_LABELS),
      colors: optionsOf(catalog.data?.colors, COLOR_LABELS),
      taskStatuses: optionsOf(catalog.data?.task_statuses, TASK_STATUS_LABELS),
      // Until /access answers nobody sees the delete actions; a delete that
      // shows and then fails with 403 is worse than one that appears late.
      canDelete: (item) =>
        !!accessData &&
        (accessData.can_delete_any ||
          item.created_by.toLowerCase() === accessData.email.toLowerCase()),
      peopleWhere,
      liveStatus: live.status,
      everyoneElse: presentPeople(members, selfUserId),
      folders,
      projects,
      selectedFolder,
      selectFolder: (id) => {
        setFolderId(id);
        if (projectId) router.push(listPath);
      },
      openNewProject: () => setNewProjectOpen(true),
      openProjectSettings: (project) => setSettingsId(project.id),
      moveProject,
      toggleArchived,
      requestDeleteProject: (project) => {
        deleteProject.reset();
        setProjectToDelete(project);
      },
    }),
    [
      slug, catalog.data, accessData, peopleWhere, live.status, members, selfUserId, folders,
      projects, selectedFolder, projectId, router, listPath, moveProject, toggleArchived, deleteProject,
    ]
  );

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
  const settingsProject = projects.data?.find((project) => project.id === settingsId) ?? null;

  return (
    <ProjectsProvider value={context}>
      {/* Side by side only from xl: below that the rail leaves the content too
          narrow, so it stacks on top on the list and hides behind the
          breadcrumb on a project page, where the board needs the width. */}
      <div className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <div className={cn("min-w-0", projectId && "max-xl:hidden")}>
          <ProjectFolderPanel
            counts={countByFolder(projects.data)}
            activeProjectId={projectId}
            onCreate={() => setFolderDialog({ folder: null })}
            onEdit={(folder) => setFolderDialog({ folder })}
            onDelete={(folder) => {
              deleteFolder.reset();
              setFolderToDelete(folder);
            }}
            draggingProjectId={draggingId}
            onDropProject={(id, folder) => {
              const project = projects.data?.find((p) => p.id === id);
              if (project) moveProject(project, folder);
              setDraggingId(null);
            }}
          />
        </div>
        <div className="min-w-0">
          <DraggingContext.Provider value={{ draggingId, setDraggingId }}>
            {children}
          </DraggingContext.Provider>
        </div>
      </div>

      <ProjectFolderDialog
        folder={folderDialog?.folder ?? null}
        open={folderDialog !== null}
        onOpenChange={(open) => !open && setFolderDialog(null)}
        onSaved={(folder) => context.selectFolder(folder.id)}
      />

      <NewProjectDialog
        open={isNewProjectOpen}
        onOpenChange={setNewProjectOpen}
        folders={folderList}
        folderId={selectedFolder?.id}
        onCreated={(project) => router.push(`${listPath}/${project.id}`)}
      />

      <ProjectDetailDialog
        project={settingsProject}
        isOpen={settingsId !== null}
        folders={folderList}
        onClose={() => setSettingsId(null)}
        onDelete={(project) => {
          setSettingsId(null);
          context.requestDeleteProject(project);
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
              if (projectToDelete.id === projectId) router.push(listPath);
              setProjectToDelete(null);
            },
          })
        }
      >
        Se borran «{projectToDelete?.name}», sus épicas y sus tareas para todo el equipo, y no
        se puede recuperar. Si solo quieres sacarlo de la lista, archívalo.
      </ConfirmDeleteDialog>
    </ProjectsProvider>
  );
}

// ── Dragging a project row onto a folder of the rail ──

const DraggingContext = createContext<{
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
}>({ draggingId: null, setDraggingId: () => {} });

/** The list page sets it on drag start; the rail reads it to accept the drop. */
export function useProjectDragging() {
  return useContext(DraggingContext);
}
