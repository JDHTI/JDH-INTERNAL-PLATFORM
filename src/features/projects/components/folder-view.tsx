"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, CloudOff, FolderKanban, Plus, SearchX } from "lucide-react";

import { useArea } from "@/features/areas/hooks/use-areas";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useUpdateProject } from "../hooks/use-projects";
import { byPosition, positionAt } from "../lib/format";
import type { Project } from "../types/project.types";
import LiveStatus from "./live-status";
import PresenceAvatars from "./presence-avatars";
import { useProjectsContext } from "./projects-context";
import ProjectsList, { type ProjectRowActions } from "./projects-list";
import { persistentError, useProjectDragging } from "./projects-shell";

type View = "active" | "archived";

/** The landing page of the module: the folder on screen and its projects. */
export default function FolderView() {
  const filterId = useId();
  const router = useRouter();
  const {
    slug,
    statuses,
    projects,
    selectedFolder: selected,
    folders,
    liveStatus,
    everyoneElse,
    openNewProject,
    moveProject,
    toggleArchived,
    requestDeleteProject,
  } = useProjectsContext();
  const { data: area } = useArea(slug);
  const { draggingId, setDraggingId } = useProjectDragging();
  const updateProject = useUpdateProject(slug);

  // Reset when the folder changes: filters belong to one folder's list.
  const [state, setState] = useState<{ folderId?: string; view: View; status: string }>({
    view: "active",
    status: "",
  });
  const sameFolder = state.folderId === selected?.id;
  const view = sameFolder ? state.view : "active";
  const statusFilter = sameFolder ? state.status : "";
  const setView = (next: View) => setState({ folderId: selected?.id, view: next, status: statusFilter });
  const setStatusFilter = (next: string) => setState({ folderId: selected?.id, view, status: next });

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

  const actions: ProjectRowActions = {
    onOpen: (project) => router.push(`/${slug}/proyectos/${project.id}`),
    onReorder: (project, toIndex) => {
      const siblings = activeInFolder.filter((p) => p.id !== project.id);
      const position = positionAt(siblings, toIndex);
      updateProject.mutate(
        { id: project.id, input: { position }, optimistic: { position } },
        { onError: (error) => persistentError(errorMessage(error)) }
      );
    },
    onMove: moveProject,
    onToggleArchived: toggleArchived,
    onDelete: requestDeleteProject,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Proyectos</h1>
          <p className="text-sm text-text-secondary">
            Proyectos de {area?.name ?? "el área"} por carpeta. Lo que cambia alguien del equipo
            aparece aquí sin recargar.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <LiveStatus status={liveStatus} />
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
          onClick={openNewProject}
          disabled={!selected}
          title={selected ? `Nuevo proyecto en ${selected.name}` : "Crea una carpeta primero"}
        >
          <Plus aria-hidden="true" />
          Nuevo proyecto
        </Button>
      </div>

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
                  options={statuses}
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
            folders={folders.data ?? []}
            view={view}
            isFiltered={statusFilter !== ""}
            hasArchived={archivedCount > 0}
            canReorder={canReorder}
            draggingId={draggingId}
            onDraggingChange={setDraggingId}
            onCreate={openNewProject}
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
    <div role="radiogroup" aria-label="Qué proyectos mostrar" className="flex rounded-md bg-canvas-subtle p-0.5">
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
  query: ReturnType<typeof useProjectsContext>["projects"];
  visible: Project[];
  folders: NonNullable<ReturnType<typeof useProjectsContext>["folders"]["data"]>;
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
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex h-12 items-center gap-3 border-t border-border px-3 first:border-t-0">
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
          Al archivar un proyecto sale de la lista de activos y queda aquí, listo para restaurarlo.
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
          : "Un proyecto se divide en bloques, y cada bloque en tareas que el equipo mueve por el tablero."}
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
