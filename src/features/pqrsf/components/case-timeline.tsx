"use client";

import { useId, useRef, useState } from "react";
import { Download, FileText, Forward, Loader2, Paperclip, RotateCw, Send, X } from "lucide-react";
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
  useRetrySupplierEmail,
  useSupplierEmails,
} from "../hooks/use-pqrsf";
import { canPreview, Preview } from "./case-files";
import { EventSentence, RailIcon, eventIcon, isMessageEvent } from "./event-line";
import { formatDateTime, formatRelativeTime, stripCid, stripReplyDivider } from "../lib/format";
import { downloadCaseFile } from "../services/pqrsf.service";
import type {
  CaseEvent,
  CaseFile,
  Person,
  PqrsfCase,
} from "../types/pqrsf.types";
import CcPicker from "./cc-picker";
import ForwardToCustomerDialog from "./forward-to-customer-dialog";

const OPENING_EVENT_TYPES: ReadonlySet<string> = new Set(["read", "viewed"]);

const MAX_FILES = 10;
const MB = 1024 * 1024;
const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.png,.jpg,.jpeg,.webp";

function commentFileIds(event: CaseEvent): string[] {
  const ids = event.data.file_ids;
  return Array.isArray(ids) ? ids.filter((value): value is string => typeof value === "string") : [];
}

/** The addresses copied on an email, from the list the API keeps in the entry. */
function copiedTo(list: unknown): string[] {
  return Array.isArray(list)
    ? list.filter((value): value is string => typeof value === "string" && value !== "")
    : [];
}

/** The reply to the client keeps its copies inside `client_reply`; a supplier message at the top. */
function eventCc(event: CaseEvent): string[] {
  if (event.event_type === "supplier_message") return copiedTo(event.data.cc);
  const reply = event.data.client_reply;
  return reply && typeof reply === "object" ? copiedTo((reply as { cc?: unknown }).cc) : [];
}

type DeliveryStatus = "pending" | "sent" | "failed";

/** One email that left the case, to the client or a supplier. */
interface Delivery {
  id: string;
  to: string;
  status: DeliveryStatus;
  error: string | null;
}

const DELIVERY_STATUS: Record<DeliveryStatus, string> = {
  pending: "Enviando",
  sent: "Enviado",
  failed: "No se pudo enviar",
};

/**
 * What hangs from an entry: the files attached to it and, when it emailed
 * someone (a reply to the client, a message to a supplier), each email's state.
 */
function EventExtras({
  caseId,
  files,
  deliveries,
  cc = [],
  pendingLabel,
  onRetry,
  isRetrying,
}: {
  caseId: string;
  files: CaseFile[];
  deliveries: Delivery[];
  /** People copied on the email; shown under the recipients. */
  cc?: string[];
  /** Shown while the email list has not loaded yet («Respuesta al cliente»). */
  pendingLabel?: string;
  onRetry: (notificationId: string) => void;
  isRetrying: boolean;
}) {
  const [previewing, setPreviewing] = useState<CaseFile | null>(null);
  if (files.length === 0 && deliveries.length === 0 && cc.length === 0 && !pendingLabel) return null;

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
      {deliveries.length === 0 && pendingLabel && (
        <p className="text-[13px] text-text-secondary">{pendingLabel}</p>
      )}
      {cc.length > 0 && (
        <p className="text-[13px] break-words text-text-secondary">CC: {cc.join(", ")}</p>
      )}
      {deliveries.length > 0 && (
        <ul className="space-y-0.5">
          {deliveries.map((delivery) => (
            <li
              key={delivery.id}
              className="flex flex-wrap items-center gap-x-2 text-[13px] text-text-secondary"
            >
              <span className={delivery.status === "failed" ? "text-danger" : undefined}>
                {DELIVERY_STATUS[delivery.status]}
              </span>
              <span className="min-w-0 break-all">· {delivery.to}</span>
              {delivery.status === "failed" && (
                <>
                  {delivery.error && <span>{delivery.error}</span>}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="max-md:h-11"
                    disabled={isRetrying}
                    onClick={() => onRetry(delivery.id)}
                  >
                    <RotateCw aria-hidden="true" />
                    Reintentar
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryTime({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className="text-[13px] text-text-secondary">
      {formatRelativeTime(iso)}
    </time>
  );
}

/**
 * The audit trail the spreadsheet never had: who did what and when, oldest
 * first so it reads as the story of the case. Each entry is worded by the API
 * («Ana Pérez · Asignó el caso a Juan»); who merely opened the case is folded
 * into one quiet line so it does not bury the work. Anyone who sees the case
 * can comment, including whoever raised it.
 */
export default function CaseTimeline({
  item,
  events,
}: {
  item: PqrsfCase;
  events: CaseEvent[];
}) {
  const id = useId();
  const comment = useAddComment(item.id);
  const caseFiles = useCaseFiles(item.id);
  const replies = useClientReplies(item.id);
  const retry = useRetryClientReply(item.id);
  const supplierEmails = useSupplierEmails(item.id);
  const retrySupplier = useRetrySupplierEmail(item.id);
  const fileInput = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [confirmingReply, setConfirmingReply] = useState(false);
  const [replyAck, setReplyAck] = useState(false);
  const [cc, setCc] = useState<Person[]>([]);
  const [forwarding, setForwarding] = useState<CaseEvent | null>(null);

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
      {
        body: body.trim(),
        files,
        replyToClient,
        cc: cc.flatMap((person) => (person.email ? [person.email.toLowerCase()] : [])),
      },
      {
        onSuccess: (result) => {
          setBody("");
          setFiles([]);
          setCc([]);
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
  // Who opened the case lives in its own popover (API #55). An older API still
  // sends those events here, so they are left out by type instead of by version.
  const entries = events
    .filter((event) => !OPENING_EVENT_TYPES.has(event.event_type))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const filesOf = (event: CaseEvent) =>
    (caseFiles.data ?? []).filter(
      (file) => file.comment_event_id === event.id || commentFileIds(event).includes(file.id)
    );

  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-3">
      <h2 id={`${id}-heading`} className="text-base font-semibold">
        Línea de tiempo
      </h2>

      {entries.length === 0 ? (
        <p className="text-sm text-text-secondary">Todavía no hay movimientos registrados.</p>
      ) : (
        <ol className="ml-3 border-l border-border">
          {entries.map((event) => {
            // Text people wrote reads as a message; a system note reads as a caption.
            const isMessage = isMessageEvent(event);
            return (
              <li key={event.id} className="relative pb-4 pl-6 last:pb-0">
                <RailIcon icon={eventIcon(event)} className="absolute top-0 -left-3" />
                <EventSentence
                  actor={event.actor_name}
                  title={event.title}
                  statusChange={event.status_change}
                />
                {event.note && (
                  <p
                    className={
                      isMessage
                        ? "mt-1 rounded-md bg-canvas-subtle px-3 py-2 text-sm whitespace-pre-wrap"
                        : "mt-0.5 text-[13px] whitespace-pre-wrap text-text-secondary"
                    }
                  >
                    {event.event_type === "email_received"
                      ? stripReplyDivider(stripCid(event.note))
                      : stripCid(event.note)}
                  </p>
                )}
                {event.event_type === "comment" && (
                  <EventExtras
                    caseId={item.id}
                    files={filesOf(event)}
                    deliveries={(replies.data ?? []).filter((reply) => reply.event_id === event.id)}
                    cc={eventCc(event)}
                    pendingLabel={event.data.reply_to_client === true ? "Respuesta al cliente" : undefined}
                    onRetry={retry.mutate}
                    isRetrying={retry.isPending}
                  />
                )}
                {/* What the client or a supplier sent brings its attachments, nothing to retry. */}
                {event.event_type === "email_received" && (
                  <EventExtras
                    caseId={item.id}
                    files={filesOf(event)}
                    deliveries={[]}
                    onRetry={retry.mutate}
                    isRetrying={false}
                  />
                )}
                {/* A supplier's answer the client may see: the team passes it on by hand, once. */}
                {event.event_type === "email_received" && event.forwarded_at && (
                  <p className="mt-1 text-[13px] break-words text-text-secondary">
                    Enviado al cliente el {formatDateTime(event.forwarded_at)}
                    {event.forwarded_by ? ` por ${event.forwarded_by}` : ""}
                    {event.forwarded_to ? ` · ${event.forwarded_to}` : ""}
                  </p>
                )}
                {event.event_type === "email_received" && event.forwardable === true && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1.5 max-md:h-11"
                    onClick={() => setForwarding(event)}
                  >
                    <Forward aria-hidden="true" />
                    Enviar al cliente
                  </Button>
                )}
                {event.event_type === "supplier_message" && (
                  <EventExtras
                    caseId={item.id}
                    files={filesOf(event)}
                    deliveries={(supplierEmails.data ?? []).filter((email) => email.event_id === event.id)}
                    cc={eventCc(event)}
                    onRetry={retrySupplier.mutate}
                    isRetrying={retrySupplier.isPending}
                  />
                )}
                <EntryTime iso={event.created_at} />
              </li>
            );
          })}
        </ol>
      )}

      {forwarding && (
        <ForwardToCustomerDialog
          caseId={item.id}
          event={forwarding}
          onClose={() => setForwarding(null)}
        />
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
              {cc.length > 0 && (
                <>
                  <dt className="text-text-secondary">CC</dt>
                  <dd className="min-w-0 break-words">
                    {cc.map((person) => person.email).join(", ")}
                  </dd>
                </>
              )}
              <dt className="text-text-secondary">Desde</dt>
              <dd>pqrsf@jdh.com.co</dd>
              <dt className="text-text-secondary">Caso</dt>
              <dd className="font-mono">{item.code}</dd>
            </dl>
            <CcPicker id={`${id}-cc`} value={cc} onChange={setCc} />
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
