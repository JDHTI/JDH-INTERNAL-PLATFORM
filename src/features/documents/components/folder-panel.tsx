"use client";

import { CloudOff, Folder as FolderIcon, FolderPlus, Pencil, Trash2 } from "lucide-react";

import StatePanel from "@/shared/components/state-panel";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import type { Folder } from "../types/document.types";

export default function FolderPanel({
  folders,
  isPending,
  error,
  onRetry,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  folders: Folder[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  selectedId: string | undefined;
  onSelect: (folder: Folder) => void;
  onCreate: () => void;
  onRename: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
}) {
  return (
    <section aria-labelledby="folders-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="folders-heading" className="text-base font-semibold">
          Carpetas
        </h2>
        {folders && folders.length > 0 && (
          <Button variant="secondary" size="sm" onClick={onCreate}>
            <FolderPlus aria-hidden="true" />
            Nueva carpeta
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="space-y-1" aria-busy="true" aria-label="Cargando carpetas">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-10 animate-pulse rounded-md bg-canvas-subtle" />
          ))}
        </div>
      ) : error ? (
        <StatePanel
          icon={CloudOff}
          tone="danger"
          title="No se cargaron las carpetas"
          action={
            <Button variant="outline" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          }
        >
          {errorMessage(error)}
        </StatePanel>
      ) : !folders || folders.length === 0 ? (
        <StatePanel
          icon={FolderIcon}
          title="Aún no hay carpetas"
          action={
            <Button variant="secondary" onClick={onCreate}>
              <FolderPlus aria-hidden="true" />
              Crear la primera carpeta
            </Button>
          }
        >
          Los documentos del área se guardan dentro de carpetas. Crea una por
          tema, proceso o año.
        </StatePanel>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {folders.map((folder) => {
            const isSelected = folder.id === selectedId;
            return (
              <li
                key={folder.id}
                className={cn(
                  "flex items-center gap-1 pr-1",
                  // The bar marks the selected folder: state, not decoration.
                  isSelected
                    ? "bg-primary-subtle shadow-[inset_2px_0_0_var(--primary)]"
                    : "hover:bg-canvas-subtle"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(folder)}
                  aria-current={isSelected ? "true" : undefined}
                  // The rail truncates long names; the tooltip carries them whole.
                  title={
                    folder.description
                      ? `${folder.name}: ${folder.description}`
                      : folder.name
                  }
                  className={cn(
                    "flex min-h-11 min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  )}
                >
                  <FolderIcon
                    className="size-4 shrink-0 text-text-secondary"
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm",
                      isSelected && "font-semibold"
                    )}
                  >
                    {folder.name}
                  </span>
                  <span className="tabular shrink-0 text-[13px] text-text-secondary">
                    {folder.document_count}
                    <span className="sr-only">
                      {folder.document_count === 1 ? " documento" : " documentos"}
                    </span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="max-md:size-11"
                  aria-label={`Editar carpeta ${folder.name}`}
                  title="Editar carpeta"
                  onClick={() => onRename(folder)}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="max-md:size-11"
                  aria-label={`Borrar carpeta ${folder.name}`}
                  title="Borrar carpeta"
                  onClick={() => onDelete(folder)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
