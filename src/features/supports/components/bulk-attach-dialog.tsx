"use client";

import { useState } from "react";
import { FileText } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useAttachToSelection, useSelectionPreview } from "../hooks/use-supports";
import type { AttachmentSelection, AttachResult, SupportSearchFilters } from "../types/support.types";
import AttachmentFiles from "./attachment-files";
import { UploadDetails } from "./support-attachments";

const count = (n: number, one: string, many: string) => `${n.toLocaleString("es-CO")} ${n === 1 ? one : many}`;

/** An already uploaded document, linked to more supports without uploading it again. */
export interface ExistingDocument {
  id: string;
  name: string;
}

/**
 * One upload for many supports: the ones ticked in the list, the ones the
 * current filters find, or both. The API counts the reach first; past its
 * limit it refuses, so the dialog asks to narrow the filters instead of
 * offering the upload. All or nothing.
 */
export default function BulkAttachDialog({
  open,
  onClose,
  selectedIds,
  filters,
  document,
}: {
  open: boolean;
  onClose: () => void;
  selectedIds: string[];
  /** The list's filters; null when none is set, because an empty search would reach everything. */
  filters: SupportSearchFilters | null;
  document: ExistingDocument | null;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={document ? "Vincular a otros apoyos" : "Adjuntar soporte a varios apoyos"}
      description={
        document
          ? "El mismo documento respalda más apoyos; no se vuelve a subir."
          : "Los archivos se suben una sola vez al gestor documental y quedan vinculados a cada apoyo."
      }
      isForm
    >
      {open && <AttachForm selectedIds={selectedIds} filters={filters} document={document} onClose={onClose} />}
    </Dialog>
  );
}

function AttachForm({
  selectedIds,
  filters,
  document,
  onClose,
}: {
  selectedIds: string[];
  filters: SupportSearchFilters | null;
  document: ExistingDocument | null;
  onClose: () => void;
}) {
  const attach = useAttachToSelection();
  const [includeSelected, setIncludeSelected] = useState(selectedIds.length > 0);
  const [includeFilters, setIncludeFilters] = useState(selectedIds.length === 0 && filters !== null);
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AttachResult | null>(null);

  const selection: AttachmentSelection | null =
    (includeSelected && selectedIds.length > 0) || (includeFilters && filters)
      ? {
          support_ids: includeSelected ? selectedIds : [],
          ...(includeFilters && filters ? { search: filters } : {}),
        }
      : null;
  const preview = useSelectionPreview(selection);
  const reach = preview.data;
  const hasContent = document !== null || files.length > 0;
  const ready = selection !== null && reach !== undefined && !reach.capped && reach.total > 0 && hasContent;

  if (result) {
    const already = result.supports * result.documents.length - result.links_created;
    return (
      <>
        <p role="status" className="rounded-md bg-success-surface px-3 py-2 text-sm text-success">
          {count(result.links_created, "vínculo nuevo", "vínculos nuevos")} en {count(result.supports, "apoyo", "apoyos")}.
          {already > 0 && ` ${count(already, "ya estaba vinculado", "ya estaban vinculados")}.`}
        </p>
        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </>
    );
  }

  const submit = () => {
    if (!selection) return;
    setError(null);
    attach.mutate(
      { selection, upload: { files, name, description, tags, documentIds: document ? [document.id] : [] } },
      {
        onSuccess: setResult,
        onError: (failure) =>
          setError(
            failure instanceof ApiError && failure.status === 403
              ? "Tu usuario puede ver los soportes, pero no adjuntarlos."
              : errorMessage(failure)
          ),
      }
    );
  };

  return (
    <div className="space-y-5 text-sm">
      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">A qué apoyos</legend>
        <Option
          label={selectedIds.length > 0 ? `Los ${count(selectedIds.length, "apoyo seleccionado", "apoyos seleccionados")} en la lista` : "Apoyos seleccionados en la lista"}
          hint={selectedIds.length === 0 ? "No hay ninguno: márcalos con la casilla de cada fila." : undefined}
          checked={includeSelected && selectedIds.length > 0}
          disabled={selectedIds.length === 0}
          onChange={setIncludeSelected}
        />
        <Option
          label="Todos los que coinciden con los filtros de la lista"
          hint={filters === null ? "No hay filtros: filtra la lista por referencia, proveedor, cliente o texto." : "Con los mismos filtros que tienes ahora; los anulados no entran."}
          checked={includeFilters && filters !== null}
          disabled={filters === null}
          onChange={setIncludeFilters}
        />
      </fieldset>

      <Reach selection={selection} preview={preview} />

      {document ? (
        <p className="flex items-center gap-2 rounded-md bg-canvas-subtle px-3 py-2">
          <FileText className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
          <span className="min-w-0 truncate">{document.name}</span>
        </p>
      ) : (
        <>
          <AttachmentFiles files={files} onChange={setFiles} />
          {files.length > 0 && (
            <UploadDetails
              fileCount={files.length}
              name={name}
              description={description}
              tags={tags}
              onName={setName}
              onDescription={setDescription}
              onTags={setTags}
            />
          )}
        </>
      )}

      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={attach.isPending}>
          Cancelar
        </Button>
        <Button onClick={submit} disabled={!ready || attach.isPending}>
          {attach.isPending
            ? "Adjuntando"
            : reach && ready
              ? `${document ? "Vincular" : "Adjuntar"} a ${count(reach.total, "apoyo", "apoyos")}`
              : document
                ? "Vincular"
                : "Adjuntar"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function Reach({
  selection,
  preview,
}: {
  selection: AttachmentSelection | null;
  preview: ReturnType<typeof useSelectionPreview>;
}) {
  if (selection === null) {
    return <p className="text-text-secondary">Elige al menos una de las dos opciones.</p>;
  }
  if (preview.isPending) {
    return <div className="h-9 animate-pulse rounded-md bg-canvas-subtle" aria-busy="true" aria-label="Contando apoyos" />;
  }
  if (preview.isError) {
    return <p role="alert" className="text-danger">{errorMessage(preview.error)}</p>;
  }
  const { total, capped, limit } = preview.data;
  if (capped) {
    return (
      <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-danger">
        La selección pasa de {limit.toLocaleString("es-CO")} apoyos, el máximo por subida. Acota los filtros de la lista.
      </p>
    );
  }
  if (total === 0) {
    return <p role="status" className="rounded-md bg-canvas-subtle px-3 py-2">La selección no alcanza ningún apoyo.</p>;
  }
  return (
    <p role="status" className="rounded-md bg-canvas-subtle px-3 py-2">
      Se adjuntará a <span className="font-semibold tabular-nums">{count(total, "apoyo", "apoyos")}</span>.
    </p>
  );
}

function Option({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`flex items-start gap-2 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-md:size-5"
      />
      <span>
        <span className={disabled ? "text-text-secondary" : undefined}>{label}</span>
        {hint && <span className="block text-[13px] text-text-secondary">{hint}</span>}
      </span>
    </label>
  );
}
