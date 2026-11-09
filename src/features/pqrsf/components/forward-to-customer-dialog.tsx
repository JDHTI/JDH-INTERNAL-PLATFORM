"use client";

import { useId, useState } from "react";
import { Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";

import { useForwardPreview, useForwardToCustomer } from "../hooks/use-pqrsf";
import type { CaseEvent } from "../types/pqrsf.types";

const NOTE_LIMIT = 2000;

/**
 * Passes a supplier's email answer on to the client, once and by hand. It shows
 * the email exactly as the API will send it (the API's own preview, so the
 * no-reply notice is there too) and sends only on confirmation. The preview runs
 * the same checks as the send: whatever would be refused shows here first.
 */
export default function ForwardToCustomerDialog({
  caseId,
  event,
  onClose,
}: {
  caseId: string;
  event: CaseEvent;
  onClose: () => void;
}) {
  const id = useId();
  const [note, setNote] = useState("");
  const settledNote = useDebouncedValue(note.trim());
  const preview = useForwardPreview(caseId, event.id, settledNote);
  const send = useForwardToCustomer(caseId);

  const data = preview.data;
  // Typing moves the note ahead of the preview; sending waits until they agree.
  const stale = note.trim() !== settledNote || preview.isFetching || preview.isPlaceholderData;
  const canSend = Boolean(data) && !preview.isError && !stale && !send.isPending;

  const submit = () => {
    if (!canSend) return;
    send.mutate(
      { eventId: event.id, note: note.trim() },
      {
        onSuccess: (result) => {
          if (result.delivery.status === "failed") {
            toast.error(
              `No se pudo enviar el correo al cliente${result.delivery.error ? `: ${result.delivery.error}` : "."}`,
              { duration: Infinity }
            );
          } else {
            toast.success(
              result.delivery.status === "sent"
                ? "Respuesta enviada al cliente."
                : "Respuesta en cola para el cliente."
            );
          }
          onClose();
        },
      }
    );
  };

  const problem = preview.isError ? errorMessage(preview.error) : send.error ? errorMessage(send.error) : null;

  return (
    <Dialog
      open
      isForm
      wide
      onOpenChange={(open) => !open && !send.isPending && onClose()}
      title="Enviar al cliente"
      description="Revisa el correo como lo recibirá el cliente. Sale de una cuenta que no recibe respuestas: si el cliente contesta, nadie lo lee."
    >
      <form
        className="space-y-4"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          submit();
        }}
      >
        <Field
          label="Nota para el cliente"
          htmlFor={`${id}-note`}
          optional
          hint="Aparece arriba de la respuesta del proveedor."
        >
          <Textarea
            id={`${id}-note`}
            value={note}
            maxLength={NOTE_LIMIT}
            aria-describedby={`${id}-note-hint`}
            onChange={(changeEvent) => setNote(changeEvent.target.value)}
            className="min-h-20 resize-y"
          />
        </Field>

        <div className="space-y-2" aria-busy={preview.isFetching}>
          {data ? (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                <dt className="text-text-secondary">Para</dt>
                <dd className="min-w-0 break-all">{data.to}</dd>
                <dt className="text-text-secondary">Desde</dt>
                <dd className="min-w-0 break-all">{data.sender}</dd>
                <dt className="text-text-secondary">Asunto</dt>
                <dd className="min-w-0 break-words">{data.subject}</dd>
              </dl>
              {data.attachments.length > 0 && (
                <p className="flex items-start gap-1.5 text-[13px] text-text-secondary">
                  <Paperclip className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words">{data.attachments.join(", ")}</span>
                </p>
              )}
              {/* The API's HTML is a whole document with its own colors: it stays in a sandbox, no scripts. */}
              <iframe
                title="Vista previa del correo para el cliente"
                sandbox=""
                srcDoc={data.html}
                className="h-80 w-full rounded-md border border-border-control bg-white"
              />
            </>
          ) : preview.isError ? null : (
            <p className="flex items-center gap-2 text-sm text-text-secondary" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Preparando la vista previa
            </p>
          )}
        </div>

        <DialogError message={problem} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={send.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSend}>
            {send.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Enviar al cliente
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
