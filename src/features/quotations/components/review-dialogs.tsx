"use client";

import { useId, useState } from "react";
import { CheckCircle2, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { errorMessage } from "@/shared/lib/api-client";
import { toIso } from "@/shared/lib/iso-date";

import { useReturnQuotation, useValidateQuotation } from "../hooks/use-quotations";
import { formatCount, formatDay } from "../lib/format";
import type { Quotation } from "../types/quotations.types";

export const LIST_CODE = /^[A-Z0-9]{1,3}$/;
export const LIST_NAME_MAX = 40;

export function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toIso(date);
}

/** SIESA takes the description in plain ASCII capitals, at most 40 characters. */
export function defaultListName(customerName: string): string {
  return `COTIZADOR ${customerName}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .toUpperCase()
    .slice(0, LIST_NAME_MAX)
    .trim();
}


/**
 * Back to draft with a note. The validating area must say why; the advisor
 * withdrawing their own quotation may leave it empty.
 */
export function ReturnDialog({
  quotation,
  open,
  onOpenChange,
  asValidator,
}: {
  quotation: Quotation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** True for the validating area: the note is required. */
  asValidator: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      isForm
      title={asValidator ? "Devolver al asesor" : "Retirar de validación"}
      description={
        asValidator
          ? "Vuelve a borrador para que el asesor la corrija. La nota le aparece arriba de la cotización."
          : "Vuelve a borrador y puedes editarla otra vez. Para que la validen, confírmala de nuevo."
      }
    >
      {open && <ReturnForm quotation={quotation} asValidator={asValidator} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function ReturnForm({ quotation, asValidator, onClose }: { quotation: Quotation; asValidator: boolean; onClose: () => void }) {
  const giveBack = useReturnQuotation(quotation.id);
  const noteId = useId();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (asValidator && note.trim() === "") {
      setNoteError("Escribe qué debe corregir el asesor.");
      return;
    }
    setNoteError(null);
    setError(null);
    giveBack.mutate(
      { version: quotation.version, note: note.trim() },
      {
        onSuccess: () => {
          toast.success(asValidator ? "Cotización devuelta al asesor." : "Cotización retirada de validación; ya puedes editarla.");
          onClose();
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label={asValidator ? "Qué debe corregir" : "Motivo"} htmlFor={noteId} optional={!asValidator} error={noteError}>
        <Textarea
          id={noteId}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setNoteError(null);
          }}
          rows={4}
          aria-invalid={noteError ? true : undefined}
          aria-describedby={noteError ? `${noteId}-error` : undefined}
        />
      </Field>
      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="max-md:h-11">Cancelar</Button>
        <Button type="submit" disabled={giveBack.isPending} className="max-md:h-11">
          {giveBack.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Undo2 aria-hidden="true" />}
          {asValidator ? "Devolver" : "Retirar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * The validating area's last look before the files are released: what will be
 * done in SIESA, on which list, from when, and how many prices.
 */
export function ValidateDialog({ quotation, open, onOpenChange }: { quotation: Quotation; open: boolean; onOpenChange: (open: boolean) => void }) {
  const validate = useValidateQuotation(quotation.id);
  const [error, setError] = useState<string | null>(null);
  const creates = quotation.list_action === "creacion";
  const run = () => {
    setError(null);
    validate.mutate(quotation.version, {
      onSuccess: () => {
        toast.success(creates ? "Validada: lista creada. Ya se pueden descargar el Excel y el plano." : "Validada: lista actualizada. Ya se pueden descargar el Excel y el plano.");
        onOpenChange(false);
      },
      onError: (failure) => setError(errorMessage(failure)),
    });
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
      title="Validar la lista de precios"
      description="Libera el Excel y el plano de SIESA para cargarlos."
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-text-secondary">Acción</dt>
        <dd>{quotation.list_action_label ?? "—"}</dd>
        <dt className="text-text-secondary">Lista</dt>
        <dd>
          <span className="font-mono">{quotation.export_price_list_id ?? quotation.price_list_id ?? "—"}</span>
          {creates && quotation.new_list_name && <span className="text-text-secondary"> {quotation.new_list_name}</span>}
        </dd>
        <dt className="text-text-secondary">Activación</dt>
        <dd>{quotation.activation_date ? formatDay(quotation.activation_date) : "Mañana"}</dd>
        <dt className="text-text-secondary">Precios nuevos</dt>
        <dd className="tabular-nums">{formatCount(quotation.changed_count)}</dd>
        <dt className="text-text-secondary">Confirmó</dt>
        <dd>{quotation.confirmed_by ?? "—"}</dd>
      </dl>
      {!creates && (quotation.price_list_customers ?? 0) > 1 && (
        <p className="mt-3 text-sm text-text-secondary">
          La lista la comparten {formatCount(quotation.price_list_customers ?? 0)} clientes activos: estos precios les cambian a todos.
        </p>
      )}
      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} className="max-md:h-11">Cancelar</Button>
        <Button onClick={run} disabled={validate.isPending} className="max-md:h-11">
          {validate.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          Validar
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
