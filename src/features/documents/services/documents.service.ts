import { apiFetch } from "@/shared/lib/api-client";

import type {
  DocumentItem,
  DocumentPage,
  DocumentSearchParams,
  DocumentUpdateInput,
  DownloadLink,
  Folder,
  FolderInput,
  UploadInput,
} from "../types/document.types";

const areaPath = (slug: string) => `/areas/${encodeURIComponent(slug)}`;

export function listFolders(slug: string): Promise<Folder[]> {
  return apiFetch<Folder[]>(`${areaPath(slug)}/folders`);
}

export function createFolder(slug: string, input: FolderInput): Promise<Folder> {
  return apiFetch<Folder>(`${areaPath(slug)}/folders`, {
    method: "POST",
    body: input,
  });
}

export function updateFolder(
  slug: string,
  folderId: string,
  input: FolderInput
): Promise<Folder> {
  return apiFetch<Folder>(`${areaPath(slug)}/folders/${folderId}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteFolder(slug: string, folderId: string): Promise<void> {
  return apiFetch<void>(`${areaPath(slug)}/folders/${folderId}`, {
    method: "DELETE",
  });
}

export function uploadDocument(
  slug: string,
  folderId: string,
  input: UploadInput
): Promise<DocumentItem> {
  const form = new FormData();
  form.append("file", input.file);
  if (input.name) form.append("name", input.name);
  if (input.description) form.append("description", input.description);
  if (input.tags) form.append("tags", input.tags);

  return apiFetch<DocumentItem>(
    `${areaPath(slug)}/folders/${folderId}/documents`,
    { method: "POST", body: form }
  );
}

/** Also backs the folder listing: there is no per-folder list endpoint. */
export function searchDocuments(
  params: DocumentSearchParams
): Promise<DocumentPage> {
  return apiFetch<DocumentPage>("/documents/search", {
    query: {
      area: params.area,
      folder_id: params.folderId,
      q: params.q,
      tags: params.tags,
      page: params.page,
      size: params.size,
    },
  });
}

export function updateDocument(
  documentId: string,
  input: DocumentUpdateInput
): Promise<DocumentItem> {
  return apiFetch<DocumentItem>(`/documents/${documentId}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteDocument(documentId: string): Promise<void> {
  return apiFetch<void>(`/documents/${documentId}`, { method: "DELETE" });
}

/** The link expires in minutes: request it on click, never cache it. */
export function getDownloadLink(documentId: string): Promise<DownloadLink> {
  return apiFetch<DownloadLink>(`/documents/${documentId}/download-url`);
}
