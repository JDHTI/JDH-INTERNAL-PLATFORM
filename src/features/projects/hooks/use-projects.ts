"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import { patchById, removeById, upsertFolder, upsertVersioned } from "../lib/cache";
import {
  archiveProject,
  createBlock,
  createFolder,
  createProject,
  createTask,
  deleteBlock,
  deleteFolder,
  deleteProject,
  deleteTask,
  getAccess,
  getCatalog,
  listBlocks,
  listFolders,
  listProjects,
  listTasks,
  restoreProject,
  searchPeople,
  updateBlock,
  updateFolder,
  updateProject,
  updateTask,
} from "../services/projects.service";
import type {
  BlockInput,
  CreateProjectInput,
  CreateTaskInput,
  FolderInput,
  Project,
  ProjectBlock,
  ProjectFolder,
  ProjectTask,
  UpdateProjectInput,
  UpdateTaskInput,
} from "../types/project.types";

export const projectKeys = {
  all: ["projects"] as const,
  area: (slug: string) => [...projectKeys.all, slug] as const,
  catalog: (slug: string) => [...projectKeys.area(slug), "catalog"] as const,
  access: (slug: string) => [...projectKeys.area(slug), "access"] as const,
  folders: (slug: string) => [...projectKeys.area(slug), "folders"] as const,
  projects: (slug: string) => [...projectKeys.area(slug), "list"] as const,
  blocks: (slug: string, projectId: string) =>
    [...projectKeys.area(slug), "blocks", projectId] as const,
  tasks: (slug: string, projectId: string) =>
    [...projectKeys.area(slug), "tasks", projectId] as const,
  people: (slug: string, q: string) => [...projectKeys.area(slug), "people", q] as const,
};

/** 403 and 404 are answers, not hiccups: asking again changes nothing. */
const retryTransient = (count: number, error: Error) =>
  !(error instanceof ApiError && [401, 403, 404].includes(error.status)) && count < 2;

export function useProjectCatalog(slug: string) {
  return useQuery({
    queryKey: projectKeys.catalog(slug),
    queryFn: () => getCatalog(slug),
    staleTime: Infinity,
    retry: retryTransient,
  });
}

export function useProjectAccess(slug: string) {
  return useQuery({
    queryKey: projectKeys.access(slug),
    queryFn: () => getAccess(slug),
    staleTime: 5 * 60_000,
    retry: retryTransient,
  });
}

/*
 * The live channel keeps these lists current, so they never go stale on a
 * timer: they refetch on every `hello` and `sync.required` instead.
 */
export function useProjectFolders(slug: string) {
  return useQuery({
    queryKey: projectKeys.folders(slug),
    queryFn: () => listFolders(slug),
    staleTime: Infinity,
    retry: retryTransient,
  });
}

export function useProjectList(slug: string) {
  return useQuery({
    queryKey: projectKeys.projects(slug),
    queryFn: () => listProjects(slug),
    staleTime: Infinity,
    retry: retryTransient,
  });
}

export function useProjectBlocks(slug: string, projectId: string) {
  return useQuery({
    queryKey: projectKeys.blocks(slug, projectId),
    queryFn: () => listBlocks(slug, projectId),
    staleTime: Infinity,
    retry: retryTransient,
  });
}

export function useProjectTasks(slug: string, projectId: string) {
  return useQuery({
    queryKey: projectKeys.tasks(slug, projectId),
    queryFn: () => listTasks(slug, projectId),
    staleTime: Infinity,
    retry: retryTransient,
  });
}

export function usePeopleSearch(slug: string, q: string, enabled: boolean) {
  return useQuery({
    queryKey: projectKeys.people(slug, q),
    queryFn: () => searchPeople(slug, q),
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

// ── Shared shapes of a write ──

interface Versioned {
  id: string;
  version: number;
}

/** Stores the server's copy in the list, unless the list already holds a newer one. */
function useStore<T extends Versioned>(key: QueryKey) {
  const queryClient = useQueryClient();
  return (item: T) => queryClient.setQueryData<T[]>(key, (list) => upsertVersioned(list, item));
}

export interface Change<T, I> {
  id: string;
  input: I;
  /**
   * What the row shows until the server answers. Usually the input itself;
   * an owner change also passes the person, since the input only has an id.
   */
  optimistic: Partial<T>;
}

/**
 * Optimistic: the change shows at once, the request follows, and the
 * response replaces it. On failure the item goes back to what it was and
 * the list is refetched, in case someone else wrote in between.
 */
function useOptimisticUpdate<T extends Versioned, I>(
  key: QueryKey,
  send: (id: string, input: I) => Promise<T>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: Change<T, I>) => send(id, input),
    onMutate: async ({ id, optimistic }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<T[]>(key)?.find((item) => item.id === id);
      queryClient.setQueryData<T[]>(key, (list) => patchById(list, id, optimistic));
      return { previous };
    },
    onError: (_error, _change, context) => {
      if (context?.previous) {
        queryClient.setQueryData<T[]>(key, (list) => upsertVersioned(list, context.previous!));
      }
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onSuccess: (item) => queryClient.setQueryData<T[]>(key, (list) => upsertVersioned(list, item)),
  });
}

// ── Folders ──

export function useCreateFolder(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: FolderInput) => createFolder(slug, input),
    onSuccess: (folder) =>
      queryClient.setQueryData<ProjectFolder[]>(projectKeys.folders(slug), (list) =>
        upsertFolder(list, folder)
      ),
  });
}

export function useUpdateFolder(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<FolderInput> }) =>
      updateFolder(slug, id, input),
    onSuccess: (folder) =>
      queryClient.setQueryData<ProjectFolder[]>(projectKeys.folders(slug), (list) =>
        upsertFolder(list, folder)
      ),
  });
}

export function useDeleteFolder(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFolder(slug, id),
    onSuccess: (_, id) =>
      queryClient.setQueryData<ProjectFolder[]>(projectKeys.folders(slug), (list) =>
        removeById(list, id)
      ),
  });
}

// ── Projects ──

export type ProjectChange = Change<Project, UpdateProjectInput>;

export function useCreateProject(slug: string) {
  const store = useStore<Project>(projectKeys.projects(slug));
  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(slug, input),
    onSuccess: store,
  });
}

export function useUpdateProject(slug: string) {
  return useOptimisticUpdate<Project, UpdateProjectInput>(projectKeys.projects(slug), (id, input) =>
    updateProject(slug, id, input)
  );
}

/** Archive and restore, optimistic like any other edit. */
export function useSetArchived(slug: string) {
  const mutation = useOptimisticUpdate<Project, { archived: boolean }>(
    projectKeys.projects(slug),
    (id, { archived }) => (archived ? archiveProject(slug, id) : restoreProject(slug, id))
  );
  return {
    ...mutation,
    mutate: (
      { id, archived }: { id: string; archived: boolean },
      options?: Parameters<typeof mutation.mutate>[1]
    ) =>
      mutation.mutate(
        {
          id,
          input: { archived },
          optimistic: {
            is_archived: archived,
            archived_at: archived ? new Date().toISOString() : null,
          },
        },
        options
      ),
  };
}

/** The API deletes the project's blocks and tasks with it; so does the cache. */
export function useDeleteProject(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(slug, id),
    onSuccess: (_, id) => forgetProject(queryClient, slug, id),
  });
}

export function forgetProject(
  queryClient: ReturnType<typeof useQueryClient>,
  slug: string,
  id: string
) {
  queryClient.setQueryData<Project[]>(projectKeys.projects(slug), (list) => removeById(list, id));
  queryClient.removeQueries({ queryKey: projectKeys.blocks(slug, id) });
  queryClient.removeQueries({ queryKey: projectKeys.tasks(slug, id) });
}

// ── Blocks ──

export type BlockChange = Change<ProjectBlock, BlockInput>;

export function useCreateBlock(slug: string, projectId: string) {
  const store = useStore<ProjectBlock>(projectKeys.blocks(slug, projectId));
  return useMutation({
    mutationFn: (input: BlockInput & { name: string }) => createBlock(slug, projectId, input),
    onSuccess: store,
  });
}

export function useUpdateBlock(slug: string, projectId: string) {
  return useOptimisticUpdate<ProjectBlock, BlockInput>(
    projectKeys.blocks(slug, projectId),
    (id, input) => updateBlock(slug, id, input)
  );
}

export function useDeleteBlock(slug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBlock(slug, id),
    onSuccess: (_, id) =>
      queryClient.setQueryData<ProjectBlock[]>(projectKeys.blocks(slug, projectId), (list) =>
        removeById(list, id)
      ),
  });
}

// ── Tasks ──

export type TaskChange = Change<ProjectTask, UpdateTaskInput>;

export function useCreateTask(slug: string, projectId: string) {
  const store = useStore<ProjectTask>(projectKeys.tasks(slug, projectId));
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(slug, projectId, input),
    onSuccess: store,
  });
}

export function useUpdateTask(slug: string, projectId: string) {
  return useOptimisticUpdate<ProjectTask, UpdateTaskInput>(
    projectKeys.tasks(slug, projectId),
    (id, input) => updateTask(slug, id, input)
  );
}

export function useDeleteTask(slug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(slug, id),
    onSuccess: (_, id) =>
      queryClient.setQueryData<ProjectTask[]>(projectKeys.tasks(slug, projectId), (list) =>
        removeById(list, id)
      ),
  });
}
