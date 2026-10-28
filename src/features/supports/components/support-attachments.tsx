"use client";

import { useId, useState } from "react";
import { Link2, Paperclip, RefreshCw, Unlink } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";
import FileTypeIcon from "@/features/documents/components/file-type-icon";

import { useAttachments, useAttachToSupport, useUnlinkAttachment } from "../hooks/use-supports";
import { formatDay } from "../lib/format";
import type { SupportAttachment } from "../types/support.types";
import AttachmentFiles from "./attachment-files";
import AttachmentViewer from "./attachment-viewer";

/**
 * The documents backing one support. Anyone who can read the support can
 * list and view them (no document-manager membership needed); a click opens
 * the viewer. Managers add files, take one off this support (it stays in the
 * manager and on its other supports) or link it to more supports without
 * uploading it again.
 */
export default function SupportAttachments({
  supportId,
  canWrite,
  composing,
  onComposingChange,
  onLinkElsewhere,
}: {
  supportId: string;
  canWrite: boolean;
  composing: boolean;
  onComposingChange: (composing: boolean) => void;
  onLinkElsewhere: (attachment: SupportAttachment) => void;
}) {
  const attachments = useAttachments(supportId);
  const [done, setDone] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<SupportAttachment | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const items = attachments.data ?? [];

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Soportes{items.length > 0 ? ` (${items.length})` : ""}</h3>
        {canWrite && !composing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDone(null);
              onComposingChange(true);
            }}
            className="max-sm:h-11"
          >
            <Paperclip aria-hidden="true" /> Adjuntar soporte
          </Button>
        )}
      </div>

      {composing && (
        <Composer
          supportId={supportId}
          onCancel={() => onComposingChange(false)}
          onDone={(message) => {
            setDone(message);
            onComposingChange(false);
          }}
        />
      )}
      {done && (
        <p role="status" className="rounded-md bg-success-surface px-3 py-2 text-success">
          {done}
        </p>
      )}

      {attachments.isPending ? (
        <div className="h-14 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando soportes" />
      ) : attachments.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-danger">
          {errorMessage(attachments.error)}
          <Button variant="outline" size="sm" onClick={() => attachments.refetch()}>
            <RefreshCw aria-hidden="true" /> Reintentar
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-text-secondary">
          Este apoyo no tiene soportes.{canWrite && !composing ? " Adjunta la captura o el documento que lo acordó." : ""}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((item, index) => (
            <AttachmentRow
              key={item.document_id}
              item={item}
              canWrite={canWrite}
              onOpen={() => setViewing(index)}
              onUnlink={() => setUnlinking(item)}
              onLinkElsewhere={() => onLinkElsewhere(item)}
            />
          ))}
        </ul>
      )}

      <AttachmentViewer
        supportId={supportId}
        items={items}
        index={viewing !== null && viewing < items.length ? viewing : null}
        onIndexChange={setViewing}
        onClose={() => setViewing(null)}
      />
      <UnlinkDialog supportId={supportId} attachment={unlinking} onClose={() => setUnlinking(null)} />
    </section>
  );
}

/** The whole row opens the viewer; the manager's actions sit beside it, not inside it. */
function AttachmentRow({
  item,
  canWrite,
  onOpen,
  onUnlink,
  onLinkElsewhere,
}: {
  item: SupportAttachment;
  canWrite: boolean;
  onOpen: () => void;
  onUnlink: () => void;
  onLinkElsewhere: () => void;
}) {
  return (
    <li className="flex items-center gap-1 pr-2 hover:bg-primary-subtle">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver ${item.name}`}
        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <FileTypeIcon extension={item.extension} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium" title={item.name}>{item.name}</span>
          <span className="block text-xs text-text-secondary">
            <span className="uppercase">{item.extension}</span> · <span className="tabular-nums">{formatBytes(item.size_bytes)}</span> ·
            Vinculado por {item.linked_by} el {formatDay(item.linked_at)}
          </span>
          {item.support_count > 1 && (
            <span className="block text-xs text-text-secondary">Respalda {item.support_count} apoyos</span>
          )}
        </span>
      </button>
      {canWrite && (
        <div className="flex shrink-0 gap-0.5">
          <Button variant="ghost" size="icon-sm" onClick={onLinkElsewhere} aria-label={`Vincular ${item.name} a otros apoyos`} className="max-sm:size-11">
            <Link2 aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onUnlink} aria-label={`Quitar ${item.name} de este apoyo`} className="max-sm:size-11">
            <Unlink aria-hidden="true" />
          </Button>
        </div>
      )}
    </li>
  );
}

/** Name, description and tags shared by the single and the collective upload. */
export function UploadDetails({
  fileCount,
  name,
  description,
  tags,
  onName,
  onDescription,
  onTags,
}: {
  fileCount: number;
  name: string;
  description: string;
  tags: string;
  onName: (value: string) => void;
  onDescription: (value: string) => void;
  onTags: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
      {fileCount === 1 && (
        <Field label="Nombre en el gestor" htmlFor={`${id}-name`} optional hint="Vacío: el nombre del archivo con la hora.">
          <Input id={`${id}-name`} maxLength={255} value={name} onChange={(event) => onName(event.target.value)} />
        </Field>
      )}
      <Field label="Etiquetas" htmlFor={`${id}-tags`} optional hint="Separadas por coma. La etiqueta apoyos se agrega sola.">
        <Input id={`${id}-tags`} value={tags} onChange={(event) => onTags(event.target.value)} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Descripción" htmlFor={`${id}-description`} optional>
          <Input id={`${id}-description`} maxLength={1000} value={description} onChange={(event) => onDescription(event.target.value)} />
        </Field>
      </div>
    </div>
  );
}

function Composer({
  supportId,
  onCancel,
  onDone,
}: {
  supportId: string;
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const attach = useAttachToSupport();
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    attach.mutate(
      { supportId, upload: { files, name, description, tags } },
      {
        onSuccess: (result) =>
          onDone(
            result.documents.length === 1
              ? "Soporte adjuntado. Quedó también en el gestor documental de BI, carpeta soporte_apoyos."
              : `${result.documents.length} soportes adjuntados. Quedaron también en el gestor documental de BI, carpeta soporte_apoyos.`
          ),
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
    <div className="space-y-4 rounded-lg border border-border p-3">
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
      {error && <p role="alert" className="rounded-md bg-danger-surface px-3 py-2 text-danger">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel} disabled={attach.isPending} className="max-sm:h-11">
          Cancelar
        </Button>
        <Button onClick={submit} disabled={files.length === 0 || attach.isPending} className="max-sm:h-11">
          {attach.isPending ? "Subiendo" : files.length > 1 ? `Subir ${files.length} archivos` : "Subir soporte"}
        </Button>
      </div>
    </div>
  );
}

function UnlinkDialog({
  supportId,
  attachment,
  onClose,
}: {
  supportId: string;
  attachment: SupportAttachment | null;
  onClose: () => void;
}) {
  const unlink = useUnlinkAttachment();
  const [error, setError] = useState<string | null>(null);
  const others = (attachment?.support_count ?? 1) - 1;

  return (
    <Dialog
      open={attachment !== null}
      onOpenChange={(open) => {
        if (!open) {
          setError(null);
          onClose();
        }
      }}
      title="Quitar el soporte de este apoyo"
      description={
        attachment
          ? `${attachment.name} deja de respaldar este apoyo. El documento sigue en el gestor documental${others > 0 ? ` y en ${others === 1 ? "el otro apoyo" : `los otros ${others} apoyos`} que respalda` : ""}.`
          : undefined
      }
    >
      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={unlink.isPending}>
          Cancelar
        </Button>
        <Button
          disabled={unlink.isPending}
          onClick={() =>
            attachment &&
            unlink.mutate(
              { supportId, documentId: attachment.document_id },
              { onSuccess: onClose, onError: (failure) => setError(errorMessage(failure)) }
            )
          }
        >
          {unlink.isPending ? "Quitando" : "Quitar soporte"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
