"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { ApiError } from "@/shared/lib/api-client";

import { removeFolder, removeProject, upsertFolder, upsertProject, patchProject } from "../lib/cache";
import {
  archiveProject,
  createFolder,
  createProject,
  deleteFolder,
  deleteProject,
  getAccess,
  getCatalog,
  listFolders,
  listProjects,
  restoreProject,
  searchPeople,
  updateFolder,
  updateProject,
} from "../services/projects.service";
import type {
  CreateProjectInput,
  FolderInput,
  Project,
  ProjectFolder,
  UpdateProjectInput,
} from "../types/project.types";

export const projectKeys = {
  all: ["projects"] as const,
  area: (slug: string) => [...projectKeys.all, slug] as const,
  catalog: (slug: string) => [...projectKeys.area(slug), "catalog"] as const,
  access: (slug: string) => [...projectKeys.area(slug), "access"] as const,
  folders: (slug: string) => [...projectKeys.area(slug), "folders"] as const,
  projects: (slug: string) => [...projectKeys.area(slug), "list"] as const,
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
 * The live channel keeps both lists current, so they never go stale on a
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

export function usePeopleSearch(slug: string, q: string, enabled: boolean) {
  return useQuery({
    queryKey: projectKeys.people(slug, q),
    queryFn: () => searchPeople(slug, q),
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
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
        removeFolder(list, id)
      ),
  });
}

// ── Projects ──

function useStoreProject(slug: string) {
  const queryClient = useQueryClient();
  return (project: Project) =>
    queryClient.setQueryData<Project[]>(projectKeys.projects(slug), (list) =>
      upsertProject(list, project)
    );
}

export function useCreateProject(slug: string) {
  const store = useStoreProject(slug);
  return useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(slug, input),
    onSuccess: store,
  });
}

export interface ProjectChange {
  id: string;
  input: UpdateProjectInput;
  /**
   * What the row shows until the server answers. Usually the input itself;
   * an owner change also passes the person, since the input only has an id.
   */
  optimistic: Partial<Project>;
}

/**
 * Optimistic: the change shows at once, the PATCH follows, and the response
 * replaces it. On failure the row goes back to what it was and the list is
 * refetched, in case someone else wrote in between.
 */
export function useUpdateProject(slug: string) {
  const queryClient = useQueryClient();
  const key = projectKeys.projects(slug);
  return useMutation({
    mutationFn: ({ id, input }: ProjectChange) => updateProject(slug, id, input),
    onMutate: async ({ id, optimistic }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient
        .getQueryData<Project[]>(key)
        ?.find((project) => project.id === id);
      queryClient.setQueryData<Project[]>(key, (list) => patchProject(list, id, optimistic));
      return { previous };
    },
    onError: (_error, _change, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Project[]>(key, (list) =>
          upsertProject(list, context.previous!)
        );
      }
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onSuccess: (project) =>
      queryClient.setQueryData<Project[]>(key, (list) => upsertProject(list, project)),
  });
}

/** Archive and restore, optimistic like any other edit. */
export function useSetArchived(slug: string) {
  const queryClient = useQueryClient();
  const key = projectKeys.projects(slug);
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      archived ? archiveProject(slug, id) : restoreProject(slug, id),
    onMutate: async ({ id, archived }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient
        .getQueryData<Project[]>(key)
        ?.find((project) => project.id === id);
      queryClient.setQueryData<Project[]>(key, (list) =>
        patchProject(list, id, {
          is_archived: archived,
          archived_at: archived ? new Date().toISOString() : null,
        })
      );
      return { previous };
    },
    onError: (_error, _change, context) => {
      if (context?.previous) {
        queryClient.setQueryData<Project[]>(key, (list) =>
          upsertProject(list, context.previous!)
        );
      }
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onSuccess: (project) =>
      queryClient.setQueryData<Project[]>(key, (list) => upsertProject(list, project)),
  });
}

export function useDeleteProject(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(slug, id),
    onSuccess: (_, id) =>
      queryClient.setQueryData<Project[]>(projectKeys.projects(slug), (list) =>
        removeProject(list, id)
      ),
  });
}
