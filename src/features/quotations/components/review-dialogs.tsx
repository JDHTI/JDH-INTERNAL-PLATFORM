"use client";

import { useId, useState } from "react";
import { CheckCircle2, FileCheck2, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { toIso } from "@/shared/lib/iso-date";

import { useMarkUploaded, useReturnQuotation, useValidateQuotation } from "../hooks/use-quotations";
import { formatCount, formatDay } from "../lib/format";
import type { Quotation } from "../types/quotations.types";
import FreeListCodes from "./free-list-codes";

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
 * done in SIESA, from when, how many prices and how many under the rule. On a
 * creation the validator names the list here (code and description); the
 * advisor no longer does. Validating leaves it "pendiente de carga".
 */
export function ValidateDialog({ quotation, open, onOpenChange }: { quotation: Quotation; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} isForm={quotation.list_action === "creacion"} title="Validar la lista de precios" description="Libera el Excel y el plano para cargarlos en SIESA.">
      {open && <ValidateForm quotation={quotation} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function ValidateForm({ quotation, onClose }: { quotation: Quotation; onClose: () => void }) {
  const validate = useValidateQuotation(quotation.id);
  const codeId = useId();
  const nameId = useId();
  const creates = quotation.list_action === "creacion";
  const [code, setCode] = useState(quotation.export_price_list_id ?? "");
  const [name, setName] = useState(quotation.new_list_name || defaultListName(quotation.customer_name));
  const [codeError, setCodeError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (creates) {
      let valid = true;
      if (!LIST_CODE.test(code.trim().toUpperCase())) {
        setCodeError("El código va de 1 a 3 letras o números, por ejemplo C97.");
        valid = false;
      }
      if (name.trim() === "") {
        setNameError("Escribe la descripción de la lista.");
        valid = false;
      }
      if (!valid) return;
    }
    setError(null);
    validate.mutate(
      { version: quotation.version, options: creates ? { price_list_id: code.trim().toUpperCase(), new_list_name: name.trim() } : {} },
      {
        onSuccess: () => {
          toast.success("Validada. Descarga el Excel y el plano, cárgalos en SIESA y márcala como cargada.");
          onClose();
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-text-secondary">Acción</dt>
        <dd>{quotation.list_action_label ?? "—"}</dd>
        {!creates && (
          <>
            <dt className="text-text-secondary">Lista</dt>
            <dd className="font-mono">{quotation.price_list_id ?? "—"}</dd>
          </>
        )}
        <dt className="text-text-secondary">Activación</dt>
        <dd>{quotation.activation_date ? formatDay(quotation.activation_date) : "Mañana"}</dd>
        <dt className="text-text-secondary">Precios nuevos</dt>
        <dd className="tabular-nums">{formatCount(quotation.changed_count)}</dd>
        <dt className="text-text-secondary">Confirmó</dt>
        <dd>{quotation.confirmed_by ?? "—"}</dd>
      </dl>
      {quotation.below_rule_count > 0 && (
        <p className="rounded-md bg-warning-surface px-3 py-2 text-sm">
          {quotation.below_rule_count === 1 ? "1 referencia con precio nuevo queda" : `${formatCount(quotation.below_rule_count)} referencias con precio nuevo quedan`}{" "}
          bajo la regla (bajo el mínimo, sin objetivo o sin costo). Revísalas antes de validar o devuélvela al asesor.
        </p>
      )}
      {!creates && (quotation.price_list_customers ?? 0) > 1 && (
        <p className="text-sm text-text-secondary">
          La lista la comparten {formatCount(quotation.price_list_customers ?? 0)} clientes activos: estos precios les cambian a todos.
        </p>
      )}
      {creates && (
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <Field label="Código de la lista" htmlFor={codeId} error={codeError} hint="1 a 3 letras o números, libre en SIESA">
            <Input
              id={codeId}
              value={code}
              maxLength={3}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setCodeError(null);
              }}
              aria-invalid={codeError ? true : undefined}
              aria-describedby={codeError ? `${codeId}-error` : `${codeId}-hint`}
              className="font-mono uppercase max-md:h-11"
              autoComplete="off"
            />
          </Field>
          <Field label="Descripción" htmlFor={nameId} error={nameError} hint={`${name.length} de ${LIST_NAME_MAX} caracteres`}>
            <Input
              id={nameId}
              value={name}
              maxLength={LIST_NAME_MAX}
              onChange={(event) => {
                setName(event.target.value);
                setNameError(null);
              }}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? `${nameId}-error` : `${nameId}-hint`}
              className="max-md:h-11"
              autoComplete="off"
            />
          </Field>
          <div className="sm:col-span-2">
            <FreeListCodes
              value={code}
              onPick={(picked) => {
                setCode(picked);
                setCodeError(null);
              }}
            />
          </div>
        </div>
      )}
      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="max-md:h-11">Cancelar</Button>
        <Button type="submit" disabled={validate.isPending} className="max-md:h-11">
          {validate.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
          Validar
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * The validator's reconfirmation once the files are in SIESA: the quotation
 * leaves "pendiente de carga" and is "cargada". A plain confirmation, no form.
 */
export function UploadedDialog({ quotation, open, onOpenChange }: { quotation: Quotation; open: boolean; onOpenChange: (open: boolean) => void }) {
  const uploaded = useMarkUploaded(quotation.id);
  const [error, setError] = useState<string | null>(null);
  const run = () => {
    setError(null);
    uploaded.mutate(quotation.version, {
      onSuccess: () => {
        toast.success("Marcada como cargada en SIESA.");
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
      title="¿Ya está cargada en SIESA?"
      description={`Confirma que cargaste el Excel o el plano de la lista ${quotation.export_price_list_id ?? quotation.price_list_id ?? ""} en SIESA. La cotización queda como cargada, con tu nombre y la fecha.`}
    >
      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} className="max-md:h-11">Todavía no</Button>
        <Button onClick={run} disabled={uploaded.isPending} className="max-md:h-11">
          {uploaded.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileCheck2 aria-hidden="true" />}
          Sí, está cargada
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
