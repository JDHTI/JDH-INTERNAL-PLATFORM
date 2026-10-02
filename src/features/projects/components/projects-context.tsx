"use client";

import { createContext, useContext } from "react";

import type { PresentPerson } from "../hooks/use-projects-live";
import type { CatalogOption, PresenceMember } from "../types/project.types";

export interface ProjectsContextValue {
  slug: string;
  statuses: CatalogOption[];
  priorities: CatalogOption[];
  colors: CatalogOption[];
  /** Permanent delete: the creator, the area's manager and admins. */
  canDelete: (item: { created_by: string }) => boolean;
  /** Everyone else connected whose focus matches, one entry per person. */
  peopleWhere: (where: (member: PresenceMember) => boolean) => PresentPerson[];
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export const ProjectsProvider = ProjectsContext.Provider;

/** What every part of the module needs, without threading it through each prop. */
export function useProjectsContext(): ProjectsContextValue {
  const value = useContext(ProjectsContext);
  if (!value) throw new Error("useProjectsContext outside ProjectManager");
  return value;
}
