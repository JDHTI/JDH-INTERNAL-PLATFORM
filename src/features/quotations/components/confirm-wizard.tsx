"use client";

import { useId, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { toIso } from "@/shared/lib/iso-date";
import { cn } from "@/shared/lib/utils";

import { useConfirmQuotation, useUpdateOffer } from "../hooks/use-quotations";
import { formatCount } from "../lib/format";
import type { ListAction, Quotation } from "../types/quotations.types";
import { ConditionsStep, OfferSettingsStep, type OfferDraft, draftFrom, draftToSettings, draftValidityText } from "./offer-steps";
import { LIST_CODE, LIST_NAME_MAX, defaultListName, tomorrow } from "./review-dialogs";

/** List 1 (GENERAL, some 28,000 customers) is never written over from here. */
const isGeneralList = (quotation: Quotation) => quotation.warnings.some((warning) => warning.code === "lista_general");

const STEPS = ["Oferta", "Observaciones", "Lista en SIESA"] as const;

/**
 * Confirming is three steps: what the customer's offer says (validity, which
 * lines, the seller), its observations, and what happens in SIESA. Nothing is
 * sent until the last one: then the offer is saved (`PATCH /offer`, only what
 * changed) and the quotation goes to validation with the version that came
 * back. Afterwards the editor shows the offer ready to preview and export.
 */
export function ConfirmDialog({ quotation, open, onOpenChange }: { quotation: Quotation; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      isForm
      wide
      title="Confirmar la cotización"
      description="Arma la oferta para el cliente y decide qué se hace en SIESA. Al enviarla pasa a validación del área BI y queda bloqueada para editar hasta que la validen o la devuelvan."
    >
      {open && <ConfirmWizard quotation={quotation} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function ConfirmWizard({ quotation, onClose }: { quotation: Quotation; onClose: () => void }) {
  const confirm = useConfirmQuotation(quotation.id);
  const offer = useUpdateOffer(quotation.id);
  const generalList = isGeneralList(quotation);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OfferDraft>(() => draftFrom(quotation));
  const [validityError, setValidityError] = useState<string | null>(null);
  const [action, setAction] = useState<ListAction>(generalList ? "creacion" : (quotation.list_action ?? "actualizacion"));
  const [code, setCode] = useState(quotation.list_action === "creacion" ? (quotation.export_price_list_id ?? "") : "");
  const [name, setName] = useState(quotation.new_list_name || defaultListName(quotation.customer_name));
  const [activation, setActivation] = useState(quotation.activation_date ?? tomorrow());
  const [codeError, setCodeError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const failing = quotation.lines.filter((line) => line.is_active && line.compliance !== null && line.compliance !== "cumple").length;
  const blocked = failing > 0 || quotation.changed_count === 0;
  const last = step === STEPS.length - 1;

  const next = () => {
    if (step === 0) {
      const result = draftToSettings(draft, quotation);
      if ("error" in result) {
        setValidityError(result.error);
        return;
      }
    }
    setValidityError(null);
    setStep(step + 1);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!last) {
      next();
      return;
    }
    let valid = true;
    if (action === "creacion") {
      if (!LIST_CODE.test(code.trim().toUpperCase())) {
        setCodeError("El código va de 1 a 3 letras o números, por ejemplo C97.");
        valid = false;
      } else setCodeError(null);
      if (name.trim() === "") {
        setNameError("Escribe la descripción de la lista.");
        valid = false;
      } else setNameError(null);
    }
    const result = draftToSettings(draft, quotation);
    if ("error" in result) {
      setValidityError(result.error);
      setStep(0);
      return;
    }
    if (!valid) return;

    setError(null);
    setSending(true);
    try {
      let version = quotation.version;
      if (Object.keys(result.settings).length > 0) {
        version = (await offer.mutateAsync({ version, settings: result.settings })).version;
      }
      await confirm.mutateAsync({
        version,
        options: {
          list_action: action,
          activation_date: activation,
          ...(action === "creacion" ? { price_list_id: code.trim().toUpperCase(), new_list_name: name.trim() } : {}),
        },
      });
      toast.success("Cotización enviada a validación. La oferta para el cliente quedó lista: vista previa, Excel y PDF.");
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-5" noValidate>
      <Stepper current={step} />

      {step === 0 && blocked && (
        <div className="space-y-2">
          {quotation.changed_count === 0 && <Alert severity="danger">No hay precios nuevos. Escribe al menos uno antes de confirmar.</Alert>}
          {failing > 0 && (
            <Alert severity="danger">
              {failing === 1 ? "1 referencia con precio nuevo no cumple" : `${formatCount(failing)} referencias con precio nuevo no cumplen`} la regla
              (bajo el mínimo, sin margen objetivo o sin costo). Corrígelas antes de confirmar; el indicador «Inferior al mínimo» las muestra.
            </Alert>
          )}
        </div>
      )}

      {step === 0 && <OfferSettingsStep quotation={quotation} draft={draft} onChange={setDraft} validityError={validityError} />}
      {step === 1 && <ConditionsStep draft={draft} onChange={setDraft} validityText={draftValidityText(draft, quotation)} />}
      {step === 2 && (
        <SiesaStep
          quotation={quotation}
          generalList={generalList}
          action={action}
          onAction={setAction}
          code={code}
          onCode={(value) => {
            setCode(value);
            setCodeError(null);
          }}
          codeError={codeError}
          name={name}
          onName={(value) => {
            setName(value);
            setNameError(null);
          }}
          nameError={nameError}
          activation={activation}
          onActivation={setActivation}
        />
      )}

      <DialogError message={error} />
      <DialogFooter>
        {step === 0 ? (
          <Button variant="outline" onClick={onClose} className="max-md:h-11">Cancelar</Button>
        ) : (
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={sending} className="max-md:h-11">
            <ArrowLeft aria-hidden="true" /> Atrás
          </Button>
        )}
        <Button type="submit" disabled={blocked || sending} className="max-md:h-11">
          {last ? (
            <>
              {sending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />} Enviar a validación
            </>
          ) : (
            <>
              Siguiente <ArrowRight aria-hidden="true" />
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Where the wizard is, in words for assistive tech and as numbered steps on screen. */
function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]" aria-label="Pasos para confirmar">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex items-center gap-2">
            {index > 0 && <span className="h-px w-4 bg-border-control" aria-hidden="true" />}
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                active ? "border-primary bg-primary text-text-on-primary" : done ? "border-primary text-text-primary" : "border-border-control text-text-secondary"
              )}
              aria-hidden="true"
            >
              {done ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className={cn(active ? "font-semibold text-text-primary" : "text-text-secondary")}>
              <span className="sr-only">Paso {index + 1} de {STEPS.length}: </span>
              {label}
              {done && <span className="sr-only"> (listo)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Step 3: written over the customer's list, or a new list with its own code; and from when. */
function SiesaStep({
  quotation,
  generalList,
  action,
  onAction,
  code,
  onCode,
  codeError,
  name,
  onName,
  nameError,
  activation,
  onActivation,
}: {
  quotation: Quotation;
  generalList: boolean;
  action: ListAction;
  onAction: (action: ListAction) => void;
  code: string;
  onCode: (code: string) => void;
  codeError: string | null;
  name: string;
  onName: (name: string) => void;
  nameError: string | null;
  activation: string;
  onActivation: (date: string) => void;
}) {
  const codeId = useId();
  const nameId = useId();
  const dateId = useId();
  const shared = quotation.price_list_customers ?? 0;

  return (
    <div className="space-y-5">
      <fieldset className="min-w-0 space-y-2">
        <legend className="text-[13px] font-medium">Qué se hace en SIESA</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <ActionOption
            value="actualizacion"
            checked={action === "actualizacion"}
            onChange={onAction}
            disabled={generalList}
            title="Actualización de lista"
            hint={generalList ? "La lista 1 no se actualiza por este medio." : `Escribe los precios en la lista del cliente, ${quotation.price_list_id ?? "sin lista"}.`}
          />
          <ActionOption
            value="creacion"
            checked={action === "creacion"}
            onChange={onAction}
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
              La comparten <strong className="tabular-nums text-text-primary">{formatCount(shared)}</strong> clientes activos: al cargarla en
              SIESA, estos precios les cambian a todos. Si el ajuste es solo para este cliente, crea una lista.
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
              onChange={(event) => onCode(event.target.value.toUpperCase())}
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
              onChange={(event) => onName(event.target.value)}
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
          <DatePicker id={dateId} value={activation} onChange={onActivation} min={toIso(new Date())} aria-describedby={`${dateId}-hint`} />
        </Field>
      </div>
    </div>
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
