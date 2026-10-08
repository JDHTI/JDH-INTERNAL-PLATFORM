"use client";

import { useId, useRef, useState } from "react";
import { Download, FileText, Loader2, Paperclip, RotateCw, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/field";
import { errorMessage } from "@/shared/lib/api-client";
import { formatBytes } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import {
  useAddComment,
  useCaseFiles,
  useClientReplies,
  useRetryClientReply,
} from "../hooks/use-pqrsf";
import { canPreview, Preview } from "./case-files";
import { actorName, describeEvent, isAccessEvent } from "../lib/event-text";
import { formatDateTime, formatRelativeTime, stripCid } from "../lib/format";
import { downloadCaseFile } from "../services/pqrsf.service";
import type {
  CaseEvent,
  CaseFile,
  ClientReply,
  PqrsfCase,
  TrackingCatalog,
} from "../types/pqrsf.types";

const MAX_FILES = 10;
const MB = 1024 * 1024;
const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.png,.jpg,.jpeg,.webp";

function commentFileIds(event: CaseEvent): string[] {
  const ids = event.data.file_ids;
  return Array.isArray(ids) ? ids.filter((value): value is string => typeof value === "string") : [];
}

const REPLY_STATUS: Record<ClientReply["status"], string> = {
  pending: "Enviando al cliente",
  sent: "Enviado al cliente",
  failed: "No se pudo enviar al cliente",
};

/** Files attached to a comment and, when it was a reply, the email's state. */
function CommentExtras({
  caseId,
  event,
  files,
  reply,
  onRetry,
  isRetrying,
}: {
  caseId: string;
  event: CaseEvent;
  files: CaseFile[];
  reply: ClientReply | undefined;
  onRetry: (notificationId: string) => void;
  isRetrying: boolean;
}) {
  const [previewing, setPreviewing] = useState<CaseFile | null>(null);
  const wasReply = event.data.reply_to_client === true;
  if (files.length === 0 && !reply && !wasReply) return null;

  const download = (file: CaseFile) =>
    downloadCaseFile(caseId, file.id, file.filename).catch((error) =>
      toast.error(errorMessage(error), { duration: Infinity })
    );

  return (
    <div className="mt-1 space-y-1">
      {previewing && (
        <Preview
          caseId={caseId}
          file={previewing}
          onDownload={() => download(previewing)}
          onClose={() => setPreviewing(null)}
        />
      )}
      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {files.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                onClick={() => (canPreview(file) ? setPreviewing(file) : download(file))}
                aria-label={`${canPreview(file) ? "Abrir" : "Descargar"} ${file.filename}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[13px] hover:border-border-control max-md:min-h-11"
              >
                <Download className="size-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
                <span className="truncate">{file.filename}</span>
                <span className="tabular shrink-0 text-text-secondary">
                  {formatBytes(file.size_bytes)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {(reply || wasReply) && (
        <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-text-secondary">
          <span>
            {reply ? REPLY_STATUS[reply.status] : "Respuesta al cliente"}
            {reply ? ` · ${reply.to}` : ""}
          </span>
          {reply?.status === "failed" && (
            <>
              {reply.error && <span>{reply.error}</span>}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="max-md:h-11"
                disabled={isRetrying}
                onClick={() => onRetry(reply.id)}
              >
                <RotateCw aria-hidden="true" />
                Reintentar
              </Button>
            </>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * The audit trail the spreadsheet never had: who did what and when, oldest
 * first so it reads as the story of the case. Openings («abrió el caso») are
 * part of it, lighter, so nobody can say they never saw the request. Anyone
 * who sees the case can comment, including whoever raised it.
 */
export default function CaseTimeline({
  item,
  events,
  catalog,
}: {
  item: PqrsfCase;
  events: CaseEvent[];
  catalog: TrackingCatalog;
}) {
  const id = useId();
  const comment = useAddComment(item.id);
  const caseFiles = useCaseFiles(item.id);
  const replies = useClientReplies(item.id);
  const retry = useRetryClientReply(item.id);
  const fileInput = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [confirmingReply, setConfirmingReply] = useState(false);
  const [replyAck, setReplyAck] = useState(false);

  // The API enforces these; the form only avoids offering what it will refuse.
  const replyBlocked = !item.permissions.can_work
    ? null
    : item.closed_at !== null
      ? "El caso está finalizado: no se puede responder al cliente."
      : !item.requester_email
        ? "El caso no tiene correo del solicitante, no se puede responder al cliente."
        : null;
  const canReply = item.permissions.can_work && replyBlocked === null;

  // Same limits the API enforces, checked before the upload starts.
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const sizeProblem =
    files.find((file) => file.size > 10 * MB)
      ? "Un archivo pesa más de 10 MB."
      : total > 25 * MB
        ? "Los archivos suman más de 25 MB."
        : null;
  const replySizeProblem =
    total > 3 * MB
      ? "Para responder al cliente los adjuntos pueden sumar 3 MB como máximo."
      : null;

  const addFiles = (picked: File[]) =>
    setFiles((current) => [...current, ...picked].slice(0, MAX_FILES));

  const closeReply = () => {
    setConfirmingReply(false);
    setReplyAck(false);
  };

  // Saving a follow-up and answering the client share the endpoint; only the
  // second one emails anybody, and it is reached through the confirmation.
  const send = (replyToClient: boolean) => {
    if (!body.trim() || sizeProblem) return;
    if (replyToClient && (!canReply || replySizeProblem)) return;
    comment.mutate(
      { body: body.trim(), files, replyToClient },
      {
        onSuccess: (result) => {
          setBody("");
          setFiles([]);
          closeReply();
          if (result.rejected_files?.length) {
            toast.warning(
              `El comentario se guardó, pero no se adjuntó: ${result.rejected_files
                .map((file) => `${file.name} (${file.reason})`)
                .join("; ")}`,
              { duration: Infinity }
            );
          }
        },
      }
    );
  };
  const ordered = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <h2 id={`${id}-heading`} className="text-base font-semibold">
        Línea de tiempo
      </h2>

      {ordered.length === 0 ? (
        <p className="text-sm text-text-secondary">Todavía no hay movimientos registrados.</p>
      ) : (
        <ol className="space-y-0 border-l border-border">
          {ordered.map((event) => (
            <li key={event.id} className="relative pb-4 pl-4 last:pb-0">
              <span
                aria-hidden="true"
                className="absolute top-2 -left-[3px] size-[5px] rounded-full bg-border-control"
              />
              <p className={isAccessEvent(event) ? "text-[13px] text-text-secondary" : "text-sm"}>
                <span className={isAccessEvent(event) ? undefined : "font-medium"}>
                  {actorName(event)}
                </span>{" "}
                {describeEvent(event, catalog, item.assignee)}
              </p>
              {event.note && (
                <p
                  className={
                    event.event_type === "comment"
                      ? "mt-1 rounded-md bg-canvas-subtle px-3 py-2 text-sm whitespace-pre-wrap"
                      : "mt-0.5 text-[13px] whitespace-pre-wrap text-text-secondary"
                  }
                >
                  {stripCid(event.note)}
                </p>
              )}
              {event.event_type === "comment" && (
                <CommentExtras
                  caseId={item.id}
                  event={event}
                  files={(caseFiles.data ?? []).filter(
                    (file) =>
                      file.comment_event_id === event.id ||
                      commentFileIds(event).includes(file.id)
                  )}
                  reply={replies.data?.find((reply) => reply.event_id === event.id)}
                  onRetry={retry.mutate}
                  isRetrying={retry.isPending}
                />
              )}
              <time
                dateTime={event.created_at}
                title={formatDateTime(event.created_at)}
                className="text-[13px] text-text-secondary"
              >
                {formatRelativeTime(event.created_at)}
              </time>
            </li>
          ))}
        </ol>
      )}

      <form
        className="space-y-2 pt-2"
        onSubmit={(event) => {
          event.preventDefault();
          send(false);
        }}
      >
        <label htmlFor={`${id}-comment`} className="block text-[13px] font-medium">
          Seguimiento
        </label>
        {/* The attachments live inside the same box as the text: one composer. */}
        <div
          className={cn(
            "rounded-md border border-border-control",
            "transition-colors duration-150 focus-within:border-ring",
            comment.error && "border-danger"
          )}
        >
          <Textarea
            id={`${id}-comment`}
            value={body}
            maxLength={5000}
            onChange={(event) => setBody(event.target.value)}
            onPaste={(event) => {
              if (event.clipboardData.files.length === 0) return;
              event.preventDefault();
              addFiles(Array.from(event.clipboardData.files));
            }}
            placeholder="Queda en la línea de tiempo, visible para quien ve el caso"
            aria-invalid={comment.error ? true : undefined}
            aria-describedby={comment.error ? `${id}-comment-error` : undefined}
            className="min-h-24 resize-y border-0 focus-visible:outline-none"
          />
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              addFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
          {files.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 px-2 pb-2">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex max-w-full items-center gap-1.5 rounded-md bg-canvas-subtle py-0.5 pr-0.5 pl-2 text-[13px]"
                >
                  <FileText className="size-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
                  <span className="min-w-0 truncate">{file.name}</span>
                  <span className="tabular shrink-0 text-text-secondary">
                    {formatBytes(file.size)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-6 max-md:size-11"
                    aria-label={`Quitar ${file.name}`}
                    onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-2 border-t border-border px-1.5 py-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="max-md:h-11"
              onClick={() => fileInput.current?.click()}
              disabled={files.length >= MAX_FILES}
            >
              <Paperclip aria-hidden="true" />
              Adjuntar
            </Button>
            <span className="tabular text-[13px] text-text-secondary">
              {files.length > 0
                ? `${files.length} de ${MAX_FILES} · ${formatBytes(total)}`
                : "PDF, Office, imágenes · 10 MB por archivo"}
            </span>
          </div>
        </div>

        {(sizeProblem || comment.error) && (
          <p id={`${id}-comment-error`} role="alert" className="text-[13px] text-danger">
            {sizeProblem ?? errorMessage(comment.error)}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 text-[13px] text-text-secondary">
            {canReply
              ? replySizeProblem
              : replyBlocked}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {canReply && (
              <Button
                type="button"
                variant="outline"
                className="max-md:h-11"
                disabled={comment.isPending || !body.trim() || sizeProblem !== null || replySizeProblem !== null}
                onClick={() => setConfirmingReply(true)}
              >
                <Send aria-hidden="true" />
                Responder al cliente…
              </Button>
            )}
            <Button
              type="submit"
              variant="secondary"
              className="max-md:h-11"
              disabled={comment.isPending || !body.trim() || sizeProblem !== null}
            >
              {comment.isPending && !confirmingReply && (
                <Loader2 className="animate-spin" aria-hidden="true" />
              )}
              Guardar seguimiento
            </Button>
          </div>
        </div>
      </form>

      {confirmingReply && (
        <Dialog
          open
          isForm
          onOpenChange={(open) => !open && !comment.isPending && closeReply()}
          title="Enviar respuesta al cliente"
          description="Esto manda un correo real. No se puede deshacer."
        >
          <div className="space-y-4 text-sm">
            <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[6rem_minmax(0,1fr)]">
              <dt className="text-text-secondary">Para</dt>
              <dd className="min-w-0 font-medium break-words">{item.requester_email}</dd>
              <dt className="text-text-secondary">Desde</dt>
              <dd>pqrsf@jdh.com.co</dd>
              <dt className="text-text-secondary">Caso</dt>
              <dd className="font-mono">{item.code}</dd>
            </dl>
            <div className="space-y-1">
              <p className="text-[13px] font-medium">Mensaje</p>
              <p className="max-h-48 overflow-y-auto rounded-md bg-canvas-subtle px-3 py-2 whitespace-pre-wrap">
                {body.trim()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[13px] font-medium">
                Adjuntos {files.length > 0 ? `(${files.length} · ${formatBytes(total)})` : ""}
              </p>
              {files.length === 0 ? (
                <p className="text-text-secondary">Sin adjuntos.</p>
              ) : (
                <ul className="list-disc pl-5">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="break-words">
                      {file.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-[13px] text-text-secondary">
              La respuesta es parcial: no cierra el caso ni cambia su estado, y queda registrada
              en la línea de tiempo.
            </p>
            <label
              htmlFor={`${id}-reply-ack`}
              className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-md border border-border p-3"
            >
              <input
                id={`${id}-reply-ack`}
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                checked={replyAck}
                onChange={(event) => setReplyAck(event.target.checked)}
              />
              <span>Revisé el destinatario, el mensaje y los adjuntos.</span>
            </label>
          </div>
          <DialogError message={comment.error ? errorMessage(comment.error) : null} />
          <DialogFooter>
            <Button variant="outline" onClick={closeReply} disabled={comment.isPending}>
              Volver a editar
            </Button>
            <Button onClick={() => send(true)} disabled={!replyAck || comment.isPending}>
              {comment.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Enviar al cliente
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </section>
  );
}
