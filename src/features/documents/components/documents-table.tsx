"use client";

import { Download, Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

import { formatBytes, formatDate } from "../lib/format";
import FileTypeIcon, { fileFamilyLabel } from "./file-type-icon";
import type { DocumentItem, Folder } from "../types/document.types";

interface RowActions {
  onDownload: (document: DocumentItem) => void;
  onEdit: (document: DocumentItem) => void;
  onDelete: (document: DocumentItem) => void;
  downloadingId: string | null;
}

/**
 * Desktop: a dense table (DESIGN.md §7.3). Phone: one card per document with
 * the format icon and the fields that decide the next move (name, type and
 * size, date),
 * because an eight-column table does not fit 375px (§10).
 */
export default function DocumentsTable({
  documents,
  folders,
  showFolder,
  ...actions
}: {
  documents: DocumentItem[];
  folders: Folder[];
  /** Search results span folders, so they say where each one lives. */
  showFolder: boolean;
} & RowActions) {
  const folderName = (id: string) =>
    folders.find((folder) => folder.id === id)?.name ?? "";

  return (
    <>
      {/* Fixed layout so the name column absorbs the squeeze (and truncates
          with a tooltip) instead of pushing the actions out of view. Format
          and size get a column each so each one scans down on its own; date
          and author still share a cell because they are read together.
          Cells are vertically centered: a row with a description or a
          wrapped tag list grows, and the rest of the row follows its middle. */}
      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-canvas-subtle text-left text-[11px] font-semibold tracking-[0.06em] text-text-secondary uppercase">
            <tr>
              <th scope="col" className="px-3 py-2">Nombre</th>
              <th scope="col" className="w-24 px-3 py-2">Formato</th>
              <th scope="col" className="w-24 px-3 py-2 text-right">Peso</th>
              <th scope="col" className="w-40 px-3 py-2">Etiquetas</th>
              <th scope="col" className="w-44 px-3 py-2">Subido</th>
              <th scope="col" className="w-[7.5rem] px-3 py-2">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {documents.map((document) => (
              <tr key={document.id} className="h-10 align-middle hover:bg-primary-subtle">
                <td className="px-3 py-2">
                  <span className="block truncate font-medium" title={document.name}>
                    {document.name}
                  </span>
                  {showFolder && (
                    <span className="block truncate text-[13px] text-text-secondary">
                      En {folderName(document.folder_id)}
                    </span>
                  )}
                  {document.description && (
                    <span
                      className="block truncate text-[13px] text-text-secondary"
                      title={document.description}
                    >
                      {document.description}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span
                    className="flex items-center gap-2"
                    title={fileFamilyLabel(document.extension)}
                  >
                    <FileTypeIcon extension={document.extension} />
                    <span className="font-mono text-[13px] uppercase">
                      {document.extension}
                    </span>
                  </span>
                </td>
                <td className="tabular px-3 py-2 text-right whitespace-nowrap">
                  {formatBytes(document.size_bytes)}
                </td>
                <td className="px-3 py-2">
                  <Tags tags={document.tags} />
                </td>
                <td className="px-3 py-2">
                  <time dateTime={document.created_at} className="tabular block">
                    {formatDate(document.created_at)}
                  </time>
                  <span
                    className="block truncate text-[13px] text-text-secondary"
                    title={document.uploaded_by}
                  >
                    {document.uploaded_by}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <RowButtons document={document} {...actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border md:hidden">
        {documents.map((document) => (
          <li key={document.id} className="space-y-2 p-3">
            <div className="flex items-center gap-3">
              <FileTypeIcon extension={document.extension} />
              <div className="min-w-0">
                <p className="truncate font-medium">{document.name}</p>
                <p className="tabular text-[13px] text-text-secondary">
                  <span className="font-mono uppercase">{document.extension}</span>
                  {" · "}
                  {formatBytes(document.size_bytes)}
                  {" · "}
                  <time dateTime={document.created_at}>
                    {formatDate(document.created_at)}
                  </time>
                  {showFolder && ` · ${folderName(document.folder_id)}`}
                </p>
              </div>
            </div>
            <Tags tags={document.tags} />
            <RowButtons document={document} {...actions} />
          </li>
        ))}
      </ul>
    </>
  );
}

function Tags({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return <span className="text-text-secondary">Sin etiquetas</span>;
  }
  return (
    <ul className="flex flex-wrap gap-1" aria-label="Etiquetas">
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-sm bg-canvas-subtle px-2 py-0.5 text-[13px] font-medium"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

function RowButtons({
  document,
  onDownload,
  onEdit,
  onDelete,
  downloadingId,
}: { document: DocumentItem } & RowActions) {
  const isDownloading = downloadingId === document.id;
  const iconButton = "max-md:size-11";

  return (
    <div className="flex items-center gap-0.5 md:justify-end">
      <Button
        variant="ghost"
        size="icon-sm"
        className={iconButton}
        aria-label={`Descargar ${document.name}`}
        title="Descargar"
        disabled={isDownloading}
        onClick={() => onDownload(document)}
      >
        {isDownloading ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Download aria-hidden="true" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={iconButton}
        aria-label={`Editar ${document.name}`}
        title="Editar nombre y etiquetas"
        onClick={() => onEdit(document)}
      >
        <Pencil aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={iconButton}
        aria-label={`Borrar ${document.name}`}
        title="Borrar"
        onClick={() => onDelete(document)}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}
