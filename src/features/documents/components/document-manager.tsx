"use client";

import { useId, useState } from "react";
import { CloudOff, FileUp, SearchX, Upload } from "lucide-react";
import { toast } from "sonner";

import { useArea } from "@/features/areas/hooks/use-areas";
import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";

import {
  useDeleteDocument,
  useDeleteFolder,
  useDocumentSearch,
  useFolders,
} from "../hooks/use-documents";
import { parseTags } from "../lib/format";
import { getDownloadLink } from "../services/documents.service";
import type { DocumentItem, Folder } from "../types/document.types";
import ConfirmDeleteDialog from "./confirm-delete-dialog";
import DocumentsTable from "./documents-table";
import EditDocumentDialog from "./edit-document-dialog";
import FolderDialog from "./folder-dialog";
import FolderPanel from "./folder-panel";
import UploadDialog from "./upload-dialog";

const PAGE_SIZE = 20;

/** Error toasts stay until dismissed: an error that leaves on its own went unread. */
const persistentError = (message: string) =>
  toast.error(message, { duration: Infinity });

/**
 * Per-area document manager: area / folder / file. Everyone with access to
 * the area sees and manages the same folders, so there is no per-user view.
 */
export default function DocumentManager({ slug }: { slug: string }) {
  const searchId = useId();
  const { data: area } = useArea(slug);
  const folders = useFolders(slug);

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [text, setText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const q = useDebouncedValue(text.trim());
  const tags = useDebouncedValue(parseTags(tagsText).join(","));
  const isSearching = q !== "" || tags !== "";

  // Falls back to the first folder when none is picked yet or the picked
  // one was just deleted.
  const selected =
    folders.data?.find((folder) => folder.id === selectedId) ??
    folders.data?.[0];

  // The page belongs to one listing. Filtering or switching folder is a new
  // listing, so it starts over at page 1 (DESIGN.md §7.3).
  const scope = `${isSearching ? "" : (selected?.id ?? "")}|${q}|${tags}`;
  const [paging, setPaging] = useState({ scope, page: 1 });
  const page = paging.scope === scope ? paging.page : 1;
  const setPage = (next: number) => setPaging({ scope, page: next });

  const documents = useDocumentSearch(
    {
      area: slug,
      folderId: isSearching ? undefined : selected?.id,
      q: q || undefined,
      tags: tags || undefined,
      page,
      size: PAGE_SIZE,
    },
    isSearching || selected !== undefined
  );

  const [folderDialog, setFolderDialog] = useState<{ folder: Folder | null } | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<DocumentItem | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const deleteFolder = useDeleteFolder(slug);
  const deleteDocument = useDeleteDocument(slug);

  const download = async (document: DocumentItem) => {
    setDownloadingId(document.id);
    try {
      // Requested on click and used at once: the signed link expires in
      // minutes, so it is never stored.
      const link = await getDownloadLink(document.id);
      window.location.assign(link.url);
    } catch (error) {
      persistentError(errorMessage(error));
    } finally {
      setDownloadingId(null);
    }
  };

  const clearSearch = () => {
    setText("");
    setTagsText("");
  };

  const data = documents.data;
  const from = data && data.total > 0 ? (data.page - 1) * data.size + 1 : 0;
  const to = data ? Math.min(data.page * data.size, data.total) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Gestor documental</h1>
          <p className="text-sm text-text-secondary">
            Carpetas y documentos de {area?.name ?? "el área"}. Todo el equipo
            del área ve y edita los mismos archivos.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => setUploadOpen(true)}
          disabled={!selected}
          title={selected ? `Subir a ${selected.name}` : "Crea una carpeta primero"}
        >
          <Upload aria-hidden="true" />
          Subir documento
        </Button>
      </div>

      {/* Side by side only from xl: below that the folder rail would leave
          the table too narrow for its columns, so folders stack on top. */}
      <div className="grid gap-6 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <FolderPanel
          folders={folders.data}
          isPending={folders.isPending}
          error={folders.error}
          onRetry={() => folders.refetch()}
          selectedId={isSearching ? undefined : selected?.id}
          onSelect={(folder) => {
            setSelectedId(folder.id);
            clearSearch();
          }}
          onCreate={() => setFolderDialog({ folder: null })}
          onRename={(folder) => setFolderDialog({ folder })}
          onDelete={(folder) => {
            deleteFolder.reset();
            setFolderToDelete(folder);
          }}
        />

        <section aria-labelledby="documents-heading" className="min-w-0 space-y-3">
          <h2 id="documents-heading" className="text-base font-semibold">
            {isSearching
              ? `Resultados en todas las carpetas`
              : selected
                ? selected.name
                : "Documentos"}
          </h2>

          <form
            role="search"
            onSubmit={(event) => event.preventDefault()}
            className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${searchId}-q`} className="block text-[13px] font-medium">
                Buscar en {area?.name ?? "el área"}
              </label>
              <Input
                id={`${searchId}-q`}
                type="search"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Nombre, archivo o descripción"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${searchId}-tags`} className="block text-[13px] font-medium">
                Etiquetas
              </label>
              <Input
                id={`${searchId}-tags`}
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                placeholder="contratos, 2026"
                aria-describedby={`${searchId}-tags-hint`}
              />
              <span id={`${searchId}-tags-hint`} className="sr-only">
                Separadas por comas. Aparecen los documentos que tengan todas.
              </span>
            </div>
            {(text || tagsText) && (
              <Button variant="outline" onClick={clearSearch}>
                Limpiar
              </Button>
            )}
          </form>

          <DocumentsArea
            isEnabled={isSearching || selected !== undefined}
            query={documents}
            isSearching={isSearching}
            folders={folders.data ?? []}
            onUpload={() => setUploadOpen(true)}
            onClearSearch={clearSearch}
            onDownload={download}
            onEdit={setDocumentToEdit}
            onDelete={(document) => {
              deleteDocument.reset();
              setDocumentToDelete(document);
            }}
            downloadingId={downloadingId}
          />

          {data && data.total > 0 && (
            <nav
              aria-label="Paginación de documentos"
              className="flex items-center justify-end gap-3"
            >
              <span className="tabular text-[13px] text-text-secondary">
                {from}–{to} de {data.total}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </Button>
            </nav>
          )}
        </section>
      </div>

      <FolderDialog
        slug={slug}
        folder={folderDialog?.folder ?? null}
        open={folderDialog !== null}
        onOpenChange={(open) => !open && setFolderDialog(null)}
        onSaved={(folder) => setSelectedId(folder.id)}
      />

      {selected && (
        <UploadDialog
          slug={slug}
          folder={selected}
          open={isUploadOpen}
          onOpenChange={setUploadOpen}
        />
      )}

      <EditDocumentDialog
        slug={slug}
        document={documentToEdit}
        onOpenChange={(open) => !open && setDocumentToEdit(null)}
      />

      <ConfirmDeleteDialog
        open={folderToDelete !== null}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
        title={
          folderToDelete && folderToDelete.document_count > 0
            ? "La carpeta no está vacía"
            : "¿Borrar la carpeta?"
        }
        blocked={(folderToDelete?.document_count ?? 0) > 0}
        confirmLabel="Borrar carpeta"
        isPending={deleteFolder.isPending}
        error={deleteFolder.error ? errorMessage(deleteFolder.error) : null}
        onConfirm={() =>
          folderToDelete &&
          deleteFolder.mutate(folderToDelete.id, {
            onSuccess: () => {
              toast.success(`Carpeta «${folderToDelete.name}» borrada.`);
              setFolderToDelete(null);
            },
          })
        }
      >
        {folderToDelete && folderToDelete.document_count > 0 ? (
          <>
            «{folderToDelete.name}» tiene {folderToDelete.document_count}{" "}
            {folderToDelete.document_count === 1 ? "documento" : "documentos"}.
            Solo se borran carpetas vacías: borra primero sus documentos.
          </>
        ) : (
          <>Se borra «{folderToDelete?.name}». Esta acción no se puede deshacer.</>
        )}
      </ConfirmDeleteDialog>

      <ConfirmDeleteDialog
        open={documentToDelete !== null}
        onOpenChange={(open) => !open && setDocumentToDelete(null)}
        title="¿Borrar el documento?"
        confirmLabel="Borrar documento"
        isPending={deleteDocument.isPending}
        error={deleteDocument.error ? errorMessage(deleteDocument.error) : null}
        onConfirm={() =>
          documentToDelete &&
          deleteDocument.mutate(documentToDelete.id, {
            onSuccess: () => {
              toast.success(`«${documentToDelete.name}» borrado.`);
              setDocumentToDelete(null);
              // The last row of a page is gone: step back instead of
              // leaving the user on an empty page past the end.
              if (data && data.items.length === 1 && page > 1) setPage(page - 1);
            },
          })
        }
      >
        Se borra «{documentToDelete?.name}» para todo el equipo del área. Esta
        acción no se puede deshacer.
      </ConfirmDeleteDialog>
    </div>
  );
}

function DocumentsArea({
  isEnabled,
  query,
  isSearching,
  folders,
  onUpload,
  onClearSearch,
  ...actions
}: {
  isEnabled: boolean;
  query: ReturnType<typeof useDocumentSearch>;
  isSearching: boolean;
  folders: Folder[];
  onUpload: () => void;
  onClearSearch: () => void;
  onDownload: (document: DocumentItem) => void;
  onEdit: (document: DocumentItem) => void;
  onDelete: (document: DocumentItem) => void;
  downloadingId: string | null;
}) {
  // No folder yet: the folder panel's empty state already says what to do.
  if (!isEnabled) return null;

  if (query.isPending) {
    return (
      <div
        className="overflow-hidden rounded-lg border border-border"
        aria-busy="true"
        aria-label="Cargando documentos"
      >
        <div className="h-9 bg-canvas-subtle" />
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="flex h-10 items-center gap-3 border-t border-border px-3">
            <div className="h-3 w-1/3 animate-pulse rounded-sm bg-canvas-subtle" />
            <div className="h-3 w-12 animate-pulse rounded-sm bg-canvas-subtle" />
            <div className="ml-auto h-3 w-20 animate-pulse rounded-sm bg-canvas-subtle" />
          </div>
        ))}
      </div>
    );
  }

  if (query.error) {
    return (
      <StatePanel
        icon={CloudOff}
        tone="danger"
        title="No se cargaron los documentos"
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            Reintentar
          </Button>
        }
      >
        {errorMessage(query.error)}
      </StatePanel>
    );
  }

  const items = query.data?.items ?? [];

  if (items.length === 0) {
    return isSearching ? (
      <StatePanel
        icon={SearchX}
        title="Ningún documento coincide"
        action={
          <Button variant="outline" onClick={onClearSearch}>
            Limpiar búsqueda
          </Button>
        }
      >
        La búsqueda recorre el nombre, el archivo y la descripción en todas las
        carpetas del área. Con varias etiquetas, el documento debe tenerlas
        todas.
      </StatePanel>
    ) : (
      <StatePanel
        icon={FileUp}
        title="Esta carpeta está vacía"
        action={
          <Button variant="secondary" onClick={onUpload}>
            <Upload aria-hidden="true" />
            Subir el primer documento
          </Button>
        }
      >
        Sube PDF, Word, Excel, PowerPoint, CSV, TXT, imágenes o ZIP de hasta 25
        MB.
      </StatePanel>
    );
  }

  return (
    <div className={query.isPlaceholderData ? "opacity-60" : undefined}>
      <DocumentsTable
        documents={items}
        folders={folders}
        showFolder={isSearching}
        {...actions}
      />
    </div>
  );
}
