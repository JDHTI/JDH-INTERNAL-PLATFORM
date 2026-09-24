export interface Folder {
  id: string;
  area_id: string;
  name: string;
  description: string | null;
  /** Email of whoever created it. */
  created_by: string;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentItem {
  id: string;
  area_id: string;
  folder_id: string;
  name: string;
  original_filename: string;
  extension: string;
  content_type: string;
  size_bytes: number;
  checksum_sha256: string;
  description: string | null;
  tags: string[];
  /** Email of the uploader. The API does not resolve it to a name. */
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentPage {
  items: DocumentItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface DocumentSearchParams {
  area: string;
  folderId?: string;
  q?: string;
  /** Comma-separated; the API requires all of them (AND). */
  tags?: string;
  page: number;
  size: number;
}

export interface FolderInput {
  name: string;
  description?: string | null;
}

export interface UploadInput {
  file: File;
  name?: string;
  description?: string;
  /** Comma-separated, as the multipart endpoint expects. */
  tags?: string;
}

export interface DocumentUpdateInput {
  name?: string;
  description?: string | null;
  tags?: string[];
}

export interface DownloadLink {
  url: string;
  filename: string;
  expires_in: number;
}
