import type { Project, ProjectFolder } from "../types/project.types";

/*
 * Pure updates of the two cached lists. Both the REST responses and the live
 * events go through here, so applying the same change twice (our own echo)
 * leaves the list as it was.
 */

/**
 * Inserts or replaces by id, but never with an older version: a late event
 * must not undo a newer write we already hold.
 */
export function upsertProject(list: Project[] | undefined, next: Project): Project[] | undefined {
  if (!list) return list;
  const index = list.findIndex((project) => project.id === next.id);
  if (index === -1) return [...list, next];
  if (next.version < list[index]!.version) return list;
  const copy = list.slice();
  copy[index] = next;
  return copy;
}

/** A live update applies only when it is newer than what we hold. */
export function isNewer(list: Project[] | undefined, next: Project): boolean {
  const current = list?.find((project) => project.id === next.id);
  return !current || next.version > current.version;
}

export function patchProject(
  list: Project[] | undefined,
  id: string,
  patch: Partial<Project>
): Project[] | undefined {
  return list?.map((project) => (project.id === id ? { ...project, ...patch } : project));
}

export function removeProject(list: Project[] | undefined, id: string): Project[] | undefined {
  return list?.filter((project) => project.id !== id);
}

const byName = (a: ProjectFolder, b: ProjectFolder) =>
  a.name.localeCompare(b.name, "es", { sensitivity: "base" });

/** Folders stay sorted by name, the order the API lists them in. */
export function upsertFolder(
  list: ProjectFolder[] | undefined,
  next: ProjectFolder
): ProjectFolder[] | undefined {
  if (!list) return list;
  const rest = list.filter((folder) => folder.id !== next.id);
  return [...rest, next].sort(byName);
}

export function removeFolder(
  list: ProjectFolder[] | undefined,
  id: string
): ProjectFolder[] | undefined {
  return list?.filter((folder) => folder.id !== id);
}
