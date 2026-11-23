"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { errorMessage } from "@/shared/lib/api-client";

import type { DeleteResult } from "../types/request.types";

/** The API deletes at most this many requests per call. */
export const DELETE_REQUESTS_LIMIT = 500;

/**
 * Deletes the ticked requests for good, internal or JDH, after one confirmation. What was already
 * approved stays: the supports it registered or changed are not touched.
 */
export default function DeleteRequestsDialog({
  ids,
  remove,
  onClose,
  onDone,
}: {
  /** Open while it has ids. */
  ids: string[];
  remove: UseMutationResult<DeleteResult, Error, string[]>;
  onClose: () => void;
  onDone: (deleted: number) => void;
}) {
  const count = ids.length;
  const overLimit = count > DELETE_REQUESTS_LIMIT;
  const close = () => {
    if (remove.isPending) return;
    remove.reset();
    onClose();
  };
  return (
    <Dialog
      open={count > 0}
      onOpenChange={(open) => !open && close()}
      title={count === 1 ? "Eliminar 1 solicitud" : `Eliminar ${count.toLocaleString("es-CO")} solicitudes`}
      description="Se borran para siempre. Lo que ya se aprobó se conserva en los apoyos."
    >
      {overLimit && <p className="text-sm text-danger">El máximo por vez es {DELETE_REQUESTS_LIMIT}: quita algunas de la selección.</p>}
      {remove.isError && <Alert severity="danger">{errorMessage(remove.error)}</Alert>}
      <DialogFooter>
        <Button variant="outline" onClick={close} disabled={remove.isPending}>Cancelar</Button>
        {/* Solid danger: the confirm inside a delete dialog (DESIGN.md §7.1). */}
        <Button
          onClick={() => remove.mutate(ids, { onSuccess: (result) => onDone(result.deleted) })}
          disabled={remove.isPending || overLimit}
          className="bg-danger text-text-on-primary hover:bg-danger/90"
        >
          <Trash2 aria-hidden="true" /> {remove.isPending ? "Eliminando" : "Eliminar"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
