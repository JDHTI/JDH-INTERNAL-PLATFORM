"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createFolder,
  deleteDocument,
  deleteFolder,
  listFolders,
  searchDocuments,
  updateDocument,
  updateFolder,
  uploadDocument,
} from "../services/documents.service";
import type {
  DocumentSearchParams,
  DocumentUpdateInput,
  FolderInput,
  UploadInput,
} from "../types/document.types";

export const documentKeys = {
  all: ["documents"] as const,
  folders: (slug: string) => [...documentKeys.all, "folders", slug] as const,
  searches: (slug: string) => [...documentKeys.all, "search", slug] as const,
  search: (params: DocumentSearchParams) =>
    [...documentKeys.searches(params.area), params] as const,
};

export function useFolders(slug: string) {
  return useQuery({
    queryKey: documentKeys.folders(slug),
    queryFn: () => listFolders(slug),
  });
}

export function useDocumentSearch(
  params: DocumentSearchParams,
  enabled: boolean
) {
  return useQuery({
    queryKey: documentKeys.search(params),
    queryFn: () => searchDocuments(params),
    enabled,
    // Keeps the table on screen while the next page or query loads, instead
    // of flashing back to the skeleton on every keystroke.
    placeholderData: keepPreviousData,
  });
}

/**
 * Folder counts and document listings move together (an upload changes the
 * folder's count), so every write refreshes both for the area.
 */
function useInvalidateArea(slug: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: documentKeys.folders(slug) }),
      queryClient.invalidateQueries({ queryKey: documentKeys.searches(slug) }),
    ]);
}

export function useCreateFolder(slug: string) {
  const invalidate = useInvalidateArea(slug);
  return useMutation({
    mutationFn: (input: FolderInput) => createFolder(slug, input),
    onSuccess: invalidate,
  });
}

export function useUpdateFolder(slug: string) {
  const invalidate = useInvalidateArea(slug);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FolderInput }) =>
      updateFolder(slug, id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteFolder(slug: string) {
  const invalidate = useInvalidateArea(slug);
  return useMutation({
    mutationFn: (folderId: string) => deleteFolder(slug, folderId),
    onSuccess: invalidate,
  });
}

export function useUploadDocument(slug: string) {
  const invalidate = useInvalidateArea(slug);
  return useMutation({
    mutationFn: ({ folderId, input }: { folderId: string; input: UploadInput }) =>
      uploadDocument(slug, folderId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateDocument(slug: string) {
  const invalidate = useInvalidateArea(slug);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DocumentUpdateInput }) =>
      updateDocument(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteDocument(slug: string) {
  const invalidate = useInvalidateArea(slug);
  return useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: invalidate,
  });
}
