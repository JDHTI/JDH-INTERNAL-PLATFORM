"use client";

import { toast } from "sonner";

import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useDeleteBatch } from "../hooks/use-order-validator";
import { formatDateTime } from "../lib/format";
import type { ValidationBatch } from "../types/order-validator.types";

/** Words for the failures a person can act on; anything else is the API's own detail. */
function failureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 405) return "El servicio no permite eliminar archivos.";
    if (error.status === 404) return "Este archivo ya no existe. La lista se actualizó.";
    if (error.status === 403) return "Tu usuario puede consultar los archivos, pero no eliminarlos.";
  }
  return errorMessage(error);
}

/**
 * Removes an uploaded file with every decision made on it. It is not undone:
 * the same report can be uploaded again, which is why the message says so.
 */
export default function DeleteBatchDialog({
  batch,
  onClose,
  onDeleted,
}: {
  batch: ValidationBatch | null;
  onClose: () => void;
  /** Called after the file is gone, e.g. to leave the page that showed it. */
  onDeleted?: () => void;
}) {
  const remove = useDeleteBatch();

  const close = () => {
    remove.reset();
    onClose();
  };

  return (
    <ConfirmDeleteDialog
      open={batch !== null}
      onOpenChange={(open) => !open && close()}
      title="¿Eliminar el archivo?"
      confirmLabel="Eliminar archivo"
      isPending={remove.isPending}
      error={remove.isError ? failureMessage(remove.error) : null}
      onConfirm={() =>
        batch &&
        remove.mutate(batch.id, {
          onSuccess: () => {
            toast.success(`Se eliminó ${batch.file_name}.`);
            close();
            onDeleted?.();
          },
        })
      }
    >
      {batch && (
        <>
          <span className="font-medium text-text-primary">{batch.file_name}</span>, subido el {formatDateTime(batch.uploaded_at)},
          se elimina con sus {batch.order_count} pedidos y las decisiones de cada línea. No se puede deshacer; si lo necesitas de
          nuevo, vuelve a subir el reporte de SIESA.
        </>
      )}
    </ConfirmDeleteDialog>
  );
}
