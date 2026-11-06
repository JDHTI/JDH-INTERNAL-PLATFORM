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

/** What the dialog is about: releasing the selected orders, or taking one release back. */
export type ApprovalAction = { kind: "approve"; documents: string[] } | { kind: "revoke"; document: string };

/** Words for the failures a person can act on; anything else is the API's own detail. */
function failureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 405) return "El servicio no permite marcar pedidos como liberados.";
    if (error.status === 404) return "No se encontró el pedido o su marca de liberado. La lista se actualizó.";
    if (error.status === 403) return "Tu usuario puede consultar los pedidos, pero no liberarlos.";
    // The API's own detail names the orders that were already released.
    if (error.status === 409) return `${error.detail} La lista se actualizó; revisa la selección.`;
  }
  return errorMessage(error);
}

/**
 * Opens only when asked for: after "Marcar como liberados" with a selection, or
 * from "Quitar liberación" on a released order. Marking is the form (an optional
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
      title={revoking ? "¿Quitar la marca de liberado?" : count === 1 ? "Marcar pedido como liberado" : `Marcar ${count} pedidos como liberados`}
      description={
        action &&
        (action.kind === "revoke" ? (
          <>
            El pedido <span className="font-mono text-text-primary">{action.document}</span> deja de estar liberado y vuelve
            a lo que decidió la validación.
          </>
        ) : (
          <>
            {count === 1 ? "El pedido queda" : "Los pedidos quedan"} como liberados, estén pendientes o listos, con tu
            nombre y la fecha.
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
              toast.success(documents.length === 1 ? `Pedido ${documents[0]} liberado.` : `${documents.length} pedidos liberados.`);
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
      <Field label="Nota" htmlFor={id} optional hint="Por qué se liberan. Queda guardada con el pedido.">
        <Textarea id={id} value={note} onChange={(event) => setNote(event.target.value)} maxLength={NOTE_MAX} rows={3} />
      </Field>
      <DialogError message={approve.isError ? failureMessage(approve.error) : null} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={approve.isPending}>
          {documents.length === 1 ? "Marcar como liberado" : "Marcar como liberados"}
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
                toast.success(`El pedido ${document} ya no está liberado.`);
                onClose();
              },
            })
          }
        >
          Quitar liberación
        </Button>
      </DialogFooter>
    </>
  );
}
