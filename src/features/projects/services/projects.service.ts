import { API_URL, apiFetch } from "@/shared/lib/api-client";

import type {
  EpicInput,
  CreateTaskInput,
  ProjectEpic,
  ProjectTask,
  UpdateTaskInput,
  CreateProjectInput,
  FolderInput,
  Person,
  Project,
  ProjectAccess,
  ProjectCatalog,
  ProjectFolder,
  UpdateProjectInput,
} from "../types/project.types";

const areaPath = (slug: string) => `/areas/${encodeURIComponent(slug)}`;
const projectPath = (slug: string, id: string) => `${areaPath(slug)}/projects/${id}`;

export function getCatalog(slug: string): Promise<ProjectCatalog> {
  return apiFetch<ProjectCatalog>(`${areaPath(slug)}/projects/catalog`);
}

export function getAccess(slug: string): Promise<ProjectAccess> {
  return apiFetch<ProjectAccess>(`${areaPath(slug)}/projects/access`);
}

export function listFolders(slug: string): Promise<ProjectFolder[]> {
  return apiFetch<ProjectFolder[]>(`${areaPath(slug)}/project-folders`);
}

export function createFolder(slug: string, input: FolderInput): Promise<ProjectFolder> {
  return apiFetch<ProjectFolder>(`${areaPath(slug)}/project-folders`, {
    method: "POST",
    body: input,
  });
}

export function updateFolder(
  slug: string,
  folderId: string,
  input: Partial<FolderInput>
): Promise<ProjectFolder> {
  return apiFetch<ProjectFolder>(`${areaPath(slug)}/project-folders/${folderId}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteFolder(slug: string, folderId: string): Promise<void> {
  return apiFetch<void>(`${areaPath(slug)}/project-folders/${folderId}`, {
    method: "DELETE",
  });
}

/**
 * The whole area, archived included, in one request: folder counts, moves
 * and the archived view are all derived locally from this one list.
 */
export function listProjects(slug: string): Promise<Project[]> {
  return apiFetch<Project[]>(`${areaPath(slug)}/projects`, {
    query: { include_archived: true },
  });
}

export function createProject(slug: string, input: CreateProjectInput): Promise<Project> {
  return apiFetch<Project>(`${areaPath(slug)}/projects`, { method: "POST", body: input });
}

export function updateProject(
  slug: string,
  id: string,
  input: UpdateProjectInput
): Promise<Project> {
  return apiFetch<Project>(projectPath(slug, id), { method: "PATCH", body: input });
}

export function archiveProject(slug: string, id: string): Promise<Project> {
  return apiFetch<Project>(`${projectPath(slug, id)}/archive`, { method: "POST" });
}

export function restoreProject(slug: string, id: string): Promise<Project> {
  return apiFetch<Project>(`${projectPath(slug, id)}/restore`, { method: "POST" });
}

export function deleteProject(slug: string, id: string): Promise<void> {
  return apiFetch<void>(projectPath(slug, id), { method: "DELETE" });
}

// ── Epics and tasks of one project ──

export function listEpics(slug: string, projectId: string): Promise<ProjectEpic[]> {
  return apiFetch<ProjectEpic[]>(`${projectPath(slug, projectId)}/epics`);
}

export function createEpic(
  slug: string,
  projectId: string,
  input: EpicInput & { name: string }
): Promise<ProjectEpic> {
  return apiFetch<ProjectEpic>(`${projectPath(slug, projectId)}/epics`, {
    method: "POST",
    body: input,
  });
}

export function updateEpic(slug: string, epicId: string, input: EpicInput): Promise<ProjectEpic> {
  return apiFetch<ProjectEpic>(`${areaPath(slug)}/project-epics/${epicId}`, {
    method: "PATCH",
    body: input,
  });
}

/** The API answers 409 while the epic still has tasks. */
export function deleteEpic(slug: string, epicId: string): Promise<void> {
  return apiFetch<void>(`${areaPath(slug)}/project-epics/${epicId}`, { method: "DELETE" });
}

export function listTasks(slug: string, projectId: string): Promise<ProjectTask[]> {
  return apiFetch<ProjectTask[]>(`${projectPath(slug, projectId)}/tasks`);
}

export function createTask(
  slug: string,
  projectId: string,
  input: CreateTaskInput
): Promise<ProjectTask> {
  return apiFetch<ProjectTask>(`${projectPath(slug, projectId)}/tasks`, {
    method: "POST",
    body: input,
  });
}

export function updateTask(slug: string, taskId: string, input: UpdateTaskInput): Promise<ProjectTask> {
  return apiFetch<ProjectTask>(`${areaPath(slug)}/project-tasks/${taskId}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteTask(slug: string, taskId: string): Promise<void> {
  return apiFetch<void>(`${areaPath(slug)}/project-tasks/${taskId}`, { method: "DELETE" });
}

/** Active users who can own a project of the area. */
export function searchPeople(slug: string, q: string): Promise<Person[]> {
  return apiFetch<Person[]>(`${areaPath(slug)}/projects/people`, {
    query: { q, limit: 20 },
  });
}

/** Same host as the REST API; the session cookies travel with the upgrade. */
export function liveUrl(slug: string): string {
  return `${API_URL.replace(/^http/, "ws")}${areaPath(slug)}/projects/live`;
}
