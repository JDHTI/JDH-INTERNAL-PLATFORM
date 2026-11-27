"use client";

import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

import type { PickerReason } from "@/shared/components/reason-picker";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { SearchableDropdown } from "@/shared/components/ui/searchable-dropdown";
import { errorMessage } from "@/shared/lib/api-client";

import { useSetLinesReason } from "../hooks/use-service-level";

export interface Assignment {
  lineKeys: string[];
  /** The reason and note the dialog opens with: a single line's own, or none. */
  reasonId: string | null;
  note: string;
}

const MAX_NOTE = 500;
const count = new Intl.NumberFormat("es-CO");

/**
 * One reason and note for the marked pending lines (up to 500 per call), or
 * a single line's note. For one line that has a reason, saving without one
 * takes it away.
 */
export default function AssignReasonDialog({
  assignment,
  reasons,
  onClose,
  onDone,
}: {
  assignment: Assignment | null;
  reasons: PickerReason[] | undefined;
  onClose: () => void;
  onDone: () => void;
}) {
  const many = (assignment?.lineKeys.length ?? 0) > 1;
  return (
    <Dialog
      open={assignment !== null}
      onOpenChange={(next) => !next && onClose()}
      isForm
      narrow
      title={many ? `Motivo de ${count.format(assignment!.lineKeys.length)} líneas` : "Motivo y nota de la línea"}
      description={many ? "Todas quedan con el mismo motivo y la misma nota; reemplaza los que ya tenían." : undefined}
    >
      {assignment && <AssignForm key={assignment.lineKeys.join("|")} assignment={assignment} reasons={reasons} onClose={onClose} onDone={onDone} />}
    </Dialog>
  );
}

function AssignForm({
  assignment,
  reasons,
  onClose,
  onDone,
}: {
  assignment: Assignment;
  reasons: PickerReason[] | undefined;
  onClose: () => void;
  onDone: () => void;
}) {
  const reasonId = useId();
  const noteId = useId();
  const [reason, setReason] = useState(assignment.reasonId ?? "");
  const [note, setNote] = useState(assignment.note);
  const save = useSetLinesReason();
  // Taking a reason away is for one line that has one; several lines at once only receive a reason.
  const canClear = assignment.lineKeys.length === 1 && assignment.reasonId !== null;

  const options = useMemo(
    () =>
      (reasons ?? [])
        .filter((item) => item.is_active || item.id === assignment.reasonId)
        .map((item) => ({ value: item.id, label: item.detail ? `${item.name} · ${item.detail}` : item.name })),
    [reasons, assignment.reasonId]
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    save.mutate(
      { lineKeys: assignment.lineKeys, reasonId: reason || null, note: reason ? note.trim() || null : null },
      {
        onSuccess: (result) => {
          toast.success(
            reason
              ? `Motivo asignado a ${count.format(result.updated)} ${result.updated === 1 ? "línea" : "líneas"}.`
              : `Motivo quitado de ${count.format(result.updated)} ${result.updated === 1 ? "línea" : "líneas"}.`
          );
          onDone();
          onClose();
        },
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Motivo" htmlFor={reasonId} hint={canClear ? "Sin motivo, guardar quita el que tiene la línea." : undefined}>
        <SearchableDropdown
          id={reasonId}
          value={reason}
          options={options}
          onValueChange={setReason}
          placeholder={reasons ? (canClear ? "Sin motivo" : "Elige el motivo") : "Cargando motivos…"}
          emptyMessage="Ningún motivo con ese texto."
          clearLabel="Quitar el motivo"
          disabled={!reasons}
        />
      </Field>
      <Field label="Nota" htmlFor={noteId} optional error={note.length > MAX_NOTE ? `La nota pasa de ${MAX_NOTE} caracteres.` : null}>
        <Textarea id={noteId} value={note} onChange={(event) => setNote(event.target.value)} disabled={!reason} maxLength={MAX_NOTE + 50} />
      </Field>
      <DialogError message={save.isError ? errorMessage(save.error) : null} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending || note.length > MAX_NOTE || (!reason && !canClear)}>
          {save.isPending ? "Guardando…" : reason ? "Guardar" : "Quitar el motivo"}
        </Button>
      </DialogFooter>
    </form>
  );
}
