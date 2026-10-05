"use client";

import { createContext, useContext } from "react";

import type { useProjectFolders, useProjectList } from "../hooks/use-projects";
import type { PresentPerson } from "../hooks/use-projects-live";
import type {
  CatalogOption,
  LiveStatus,
  PresenceMember,
  Project,
  ProjectFolder,
} from "../types/project.types";

export interface ProjectsContextValue {
  slug: string;
  statuses: CatalogOption[];
  priorities: CatalogOption[];
  colors: CatalogOption[];
  /** The board's columns, in order. */
  taskStatuses: CatalogOption[];
  /** Permanent delete: the creator, the area's manager and admins. */
  canDelete: (item: { created_by: string }) => boolean;
  /** Everyone else connected whose focus matches, one entry per person. */
  peopleWhere: (where: (member: PresenceMember) => boolean) => PresentPerson[];
  liveStatus: LiveStatus;
  /** Everyone else connected to the area, wherever they are looking. */
  everyoneElse: PresentPerson[];

  folders: ReturnType<typeof useProjectFolders>;
  projects: ReturnType<typeof useProjectList>;
  /** The folder the list page shows; also the one a new project goes into. */
  selectedFolder: ProjectFolder | undefined;
  selectFolder: (folderId: string) => void;

  openNewProject: () => void;
  openProjectSettings: (project: Project) => void;
  moveProject: (project: Project, folder: ProjectFolder) => void;
  toggleArchived: (project: Project) => void;
  requestDeleteProject: (project: Project) => void;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export const ProjectsProvider = ProjectsContext.Provider;

/** What every part of the module needs, without threading it through each prop. */
export function useProjectsContext(): ProjectsContextValue {
  const value = useContext(ProjectsContext);
  if (!value) throw new Error("useProjectsContext outside ProjectsShell");
  return value;
}
