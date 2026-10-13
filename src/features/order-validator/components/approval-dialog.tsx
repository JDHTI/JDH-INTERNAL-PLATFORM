"use client";

import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useApproveOrders, useRevokeApproval } from "../hooks/use-order-validator";

const NOTE_MAX = 500;
const LISTED = 5;

/** What the dialog is about: approving the selected orders, or taking one approval back. */
export type ApprovalAction = { kind: "approve"; documents: string[] } | { kind: "revoke"; document: string };

/** Words for the failures a person can act on; anything else is the API's own detail. */
function failureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 405) return "El servicio no permite aprobar pedidos a mano.";
    if (error.status === 404) return "No se encontró el pedido o su aprobación. La lista se actualizó.";
    if (error.status === 403) return "Tu usuario puede consultar los pedidos, pero no aprobarlos.";
    if (error.status === 409) return "Alguno de los pedidos ya no está pendiente. La lista se actualizó; revisa la selección.";
  }
  return errorMessage(error);
}

/**
 * Opens only when asked for: after "Aprobar pedidos" with a selection, or from
 * "Quitar aprobación" on an approved order. Approving is the form (an optional
 * note), so it never closes on an outside click; taking it back is a plain
 * confirmation. Nothing changes on screen until the API answers.
 */
export default function ApprovalDialog({
  batchId,
  action,
  onClose,
  onApproved,
}: {
  batchId: string;
  action: ApprovalAction | null;
  onClose: () => void;
  /** Called once the approval is saved, e.g. to clear the selection. */
  onApproved: () => void;
}) {
  const revoking = action?.kind === "revoke";
  const count = action?.kind === "approve" ? action.documents.length : 1;

  return (
    <Dialog
      open={action !== null}
      onOpenChange={(open) => !open && onClose()}
      isForm={!revoking}
      title={revoking ? "¿Quitar la aprobación manual?" : count === 1 ? "Aprobar pedido manualmente" : `Aprobar ${count} pedidos manualmente`}
      description={
        action &&
        (action.kind === "revoke" ? (
          <>
            El pedido <span className="font-mono text-text-primary">{action.document}</span> vuelve a lo que decidió la
            validación y deja de estar listo para liberación.
          </>
        ) : (
          <>
            {count === 1 ? "El pedido pasa" : "Los pedidos pasan"} a listo para liberación y quedan marcados como aprobados
            manualmente, con tu nombre y la fecha.
          </>
        ))
      }
    >
      {action &&
        (action.kind === "revoke" ? (
          <RevokeForm batchId={batchId} document={action.document} onClose={onClose} />
        ) : (
          <ApproveForm batchId={batchId} documents={action.documents} onClose={onClose} onApproved={onApproved} />
        ))}
    </Dialog>
  );
}

function ApproveForm({
  batchId,
  documents,
  onClose,
  onApproved,
}: {
  batchId: string;
  documents: string[];
  onClose: () => void;
  onApproved: () => void;
}) {
  const id = useId();
  const [note, setNote] = useState("");
  const approve = useApproveOrders(batchId);
  const listed = documents.slice(0, LISTED);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        approve.mutate(
          { documents, note: note.trim() || null },
          {
            onSuccess: () => {
              toast.success(documents.length === 1 ? `Pedido ${documents[0]} aprobado manualmente.` : `${documents.length} pedidos aprobados manualmente.`);
              onApproved();
              onClose();
            },
          }
        );
      }}
      className="space-y-4"
    >
      <p className="text-sm">
        <span className="font-mono">{listed.join(", ")}</span>
        {documents.length > LISTED && <span className="text-text-secondary"> y {documents.length - LISTED} más</span>}
      </p>
      <Field label="Nota" htmlFor={id} optional hint="Por qué se aprueban. Queda guardada con la aprobación.">
        <Textarea id={id} value={note} onChange={(event) => setNote(event.target.value)} maxLength={NOTE_MAX} rows={3} />
      </Field>
      <DialogError message={approve.isError ? failureMessage(approve.error) : null} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={approve.isPending}>
          {documents.length === 1 ? "Aprobar pedido" : "Aprobar pedidos"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function RevokeForm({ batchId, document, onClose }: { batchId: string; document: string; onClose: () => void }) {
  const revoke = useRevokeApproval(batchId);

  return (
    <>
      <DialogError message={revoke.isError ? failureMessage(revoke.error) : null} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={revoke.isPending}
          onClick={() =>
            revoke.mutate(document, {
              onSuccess: () => {
                toast.success(`Se quitó la aprobación manual de ${document}.`);
                onClose();
              },
            })
          }
        >
          Quitar aprobación
        </Button>
      </DialogFooter>
    </>
  );
}
