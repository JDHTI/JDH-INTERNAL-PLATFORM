"use client";

import { useId, useState } from "react";
import { CheckCircle2, Loader2, Send, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { toIso } from "@/shared/lib/iso-date";
import { cn } from "@/shared/lib/utils";

import { useConfirmQuotation, useReturnQuotation, useValidateQuotation } from "../hooks/use-quotations";
import { formatCount, formatDay } from "../lib/format";
import type { ListAction, Quotation } from "../types/quotations.types";

const LIST_CODE = /^[A-Z0-9]{1,3}$/;
const LIST_NAME_MAX = 40;

function tomorrow(): string {
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

/** List 1 (GENERAL, some 28,000 customers) is never written over from here. */
const isGeneralList = (quotation: Quotation) => quotation.warnings.some((warning) => warning.code === "lista_general");

/**
 * The advisor sends the prices to validation and decides what they become in
 * SIESA: written over the customer's own list, or a new list with its own code
 * (assigning it to the customer is done by hand in SIESA). Once confirmed the
 * quotation is locked until the validating area acts.
 */
export function ConfirmDialog({ quotation, open, onOpenChange }: { quotation: Quotation; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      isForm
      title="Confirmar la lista de precios"
      description="Pasa a validación del área BI y queda bloqueada para editar hasta que la validen o la devuelvan."
    >
      {open && <ConfirmForm quotation={quotation} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function ConfirmForm({ quotation, onClose }: { quotation: Quotation; onClose: () => void }) {
  const confirm = useConfirmQuotation(quotation.id);
  const generalList = isGeneralList(quotation);
  const [action, setAction] = useState<ListAction>(generalList ? "creacion" : (quotation.list_action ?? "actualizacion"));
  const [code, setCode] = useState(quotation.list_action === "creacion" ? (quotation.export_price_list_id ?? "") : "");
  const [name, setName] = useState(quotation.new_list_name || defaultListName(quotation.customer_name));
  const [activation, setActivation] = useState(quotation.activation_date ?? tomorrow());
  const [codeError, setCodeError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const codeId = useId();
  const nameId = useId();
  const dateId = useId();

  const failing = quotation.lines.filter((line) => line.is_active && line.compliance !== null && line.compliance !== "cumple").length;
  const blocked = failing > 0 || quotation.changed_count === 0;
  const shared = quotation.price_list_customers ?? 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    let valid = true;
    if (action === "creacion") {
      const clean = code.trim().toUpperCase();
      if (!LIST_CODE.test(clean)) {
        setCodeError("El código va de 1 a 3 letras o números, por ejemplo C97.");
        valid = false;
      } else setCodeError(null);
      if (name.trim() === "") {
        setNameError("Escribe la descripción de la lista.");
        valid = false;
      } else setNameError(null);
    }
    if (!valid) return;
    setError(null);
    confirm.mutate(
      {
        version: quotation.version,
        options: {
          list_action: action,
          activation_date: activation,
          ...(action === "creacion" ? { price_list_id: code.trim().toUpperCase(), new_list_name: name.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success("Cotización enviada a validación. Te avisamos con el estado en la lista.");
          onClose();
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {quotation.changed_count === 0 && (
        <Alert severity="danger">No hay precios nuevos. Escribe al menos uno antes de confirmar.</Alert>
      )}
      {failing > 0 && (
        <Alert severity="danger">
          {failing === 1 ? "1 referencia con precio nuevo no cumple" : `${formatCount(failing)} referencias con precio nuevo no cumplen`} la
          regla (bajo el mínimo, sin margen objetivo o sin costo). Corrígelas; el filtro «No cumplen» las muestra.
        </Alert>
      )}

      <fieldset className="min-w-0 space-y-2">
        <legend className="text-[13px] font-medium">Qué se hace en SIESA</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <ActionOption
            value="actualizacion"
            checked={action === "actualizacion"}
            onChange={setAction}
            disabled={generalList}
            title="Actualización de lista"
            hint={generalList ? "La lista 1 no se actualiza por este medio." : `Escribe los precios en la lista del cliente, ${quotation.price_list_id ?? "sin lista"}.`}
          />
          <ActionOption
            value="creacion"
            checked={action === "creacion"}
            onChange={setAction}
            title="Creación de lista"
            hint="Crea una lista nueva con su propio código. Asignarla al cliente se hace a mano en SIESA."
          />
        </div>
      </fieldset>

      {action === "actualizacion" ? (
        <p className="text-sm">
          Lista <span className="font-mono font-semibold">{quotation.price_list_id ?? "—"}</span>
          {quotation.price_list_name && <span className="text-text-secondary"> {quotation.price_list_name}</span>}
          {shared > 1 && (
            <span className="mt-1 block text-text-secondary">
              La comparten <strong className="tabular-nums text-text-primary">{formatCount(shared)}</strong> clientes activos: al
              cargarla en SIESA, estos precios les cambian a todos. Si el ajuste es solo para este cliente, crea una lista.
            </span>
          )}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <Field label="Código de la lista" htmlFor={codeId} error={codeError} hint="1 a 3 letras o números">
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
        </div>
      )}

      <div className="max-w-56">
        <Field label="Fecha de activación" htmlFor={dateId} hint="Desde cuándo rige el precio en SIESA.">
          <DatePicker id={dateId} value={activation} onChange={setActivation} min={toIso(new Date())} aria-describedby={`${dateId}-hint`} />
        </Field>
      </div>

      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="max-md:h-11">Cancelar</Button>
        <Button type="submit" disabled={blocked || confirm.isPending} className="max-md:h-11">
          {confirm.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
          Enviar a validación
        </Button>
      </DialogFooter>
    </form>
  );
}

function ActionOption({
  value,
  checked,
  onChange,
  disabled = false,
  title,
  hint,
}: {
  value: ListAction;
  checked: boolean;
  onChange: (value: ListAction) => void;
  disabled?: boolean;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={cn(
        "flex gap-3 rounded-md border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
        disabled ? "cursor-not-allowed border-border-control opacity-60" : "cursor-pointer",
        checked && !disabled ? "border-primary bg-primary-subtle" : !disabled && "border-border-control hover:bg-canvas-subtle"
      )}
    >
      <input
        type="radio"
        name="list-action"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-0.5 size-4 accent-[var(--primary)]"
      />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-[13px] text-text-secondary">{hint}</span>
      </span>
    </label>
  );
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
