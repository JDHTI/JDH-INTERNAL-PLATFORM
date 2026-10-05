import type { ProjectFolder } from "../types/project.types";

/*
 * Pure updates of the cached lists. Both the REST responses and the live
 * events go through here, so applying the same change twice (our own echo)
 * leaves the list as it was. Projects, epics and tasks all carry a version
 * that grows on every write, and share these.
 */

interface Versioned {
  id: string;
  version: number;
}

/**
 * Inserts or replaces by id, but never with an older version: a late event
 * must not undo a newer write we already hold.
 */
export function upsertVersioned<T extends Versioned>(list: T[] | undefined, next: T): T[] | undefined {
  if (!list) return list;
  const index = list.findIndex((item) => item.id === next.id);
  if (index === -1) return [...list, next];
  if (next.version < list[index]!.version) return list;
  const copy = list.slice();
  copy[index] = next;
  return copy;
}

/** A live update applies only when it is newer than what we hold. */
export function isNewer<T extends Versioned>(list: T[] | undefined, next: T): boolean {
  const current = list?.find((item) => item.id === next.id);
  return !current || next.version > current.version;
}

export function patchById<T extends Versioned>(
  list: T[] | undefined,
  id: string,
  patch: Partial<T>
): T[] | undefined {
  return list?.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function removeById<T extends { id: string }>(list: T[] | undefined, id: string): T[] | undefined {
  return list?.filter((item) => item.id !== id);
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
