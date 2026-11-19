"use client";

import { useId, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { errorMessage } from "@/shared/lib/api-client";
import { toIso } from "@/shared/lib/iso-date";
import { cn } from "@/shared/lib/utils";

import { useConfirmQuotation, useUpdateOffer } from "../hooks/use-quotations";
import { formatCount } from "../lib/format";
import type { ListAction, Quotation } from "../types/quotations.types";
import { ConditionsStep, OfferSettingsStep, type OfferDraft, draftFrom, draftToSettings, draftValidityText } from "./offer-steps";
import { tomorrow } from "./review-dialogs";

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
/** A list update's own confirmation: it has no offer and always writes over its list. */
export function ConfirmDialog({ quotation, open, onOpenChange }: { quotation: Quotation; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      isForm
      title="Confirmar la actualización"
      description="Al enviarla pasa a validación del área BI y queda bloqueada para editar hasta que la validen o la devuelvan."
    >
      {open && <ListConfirm quotation={quotation} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

const LIST_TITLES: Record<ListAction, string> = { actualizacion: "Actualización de lista", creacion: "Creación de lista" };

/**
 * «Continuar proceso» of a customer quotation: take its prices to a SIESA list,
 * updating the customer's or creating one, which goes to BI's validation. Each
 * option opens the confirmation wizard for that action. The offer itself is
 * downloaded and sent by hand.
 */
export function ContinueDialog({ quotation, open, onOpenChange }: { quotation: Quotation; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [list, setList] = useState<ListAction | null>(null);
  const close = () => {
    setList(null);
    onOpenChange(false);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      isForm
      wide={list !== null}
      title={list ? LIST_TITLES[list] : "Continuar proceso"}
      description={
        list
          ? "Pasa a validación del área BI y queda bloqueada para editar hasta que la validen o la devuelvan."
          : "Elige el paso que sigue con esta cotización."
      }
    >
      {open &&
        (list ? (
          <ConfirmWizard quotation={quotation} action={list} onBack={() => setList(null)} onClose={close} />
        ) : (
          <ChooseNext quotation={quotation} onList={setList} onClose={close} />
        ))}
    </Dialog>
  );
}

function ChooseNext({ quotation, onList, onClose }: { quotation: Quotation; onList: (action: ListAction) => void; onClose: () => void }) {
  const priced = quotation.lines.filter((line) => line.is_active && line.new_price !== null).length;

  // Asking for a list is once per draft; the reason a list option is off, in the person's words.
  const listBlocked =
    quotation.status === "pendiente_validacion"
      ? "Ya está en validación del área BI."
      : quotation.status !== "borrador"
        ? "Ya se validó: los precios no cambian más."
        : priced === 0
          ? "Escribe al menos un precio nuevo para pedir la lista."
          : null;
  const updateBlocked =
    listBlocked ??
    (quotation.is_temporary_customer
      ? "Un cliente temporal no tiene lista en SIESA: solo se le crea una."
      : isGeneralList(quotation)
        ? "La lista 1 no se actualiza por este medio: crea una lista."
        : null);
  const [choice, setChoice] = useState<ListAction | null>(updateBlocked === null ? "actualizacion" : listBlocked === null ? "creacion" : null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (choice) onList(choice);
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <p className="text-[13px] text-text-secondary">
        La oferta al cliente no pasa por aquí: descarga el PDF o el Excel en la sección «Oferta para el cliente» y envíaselo.
      </p>
      <fieldset className="min-w-0 space-y-2">
        <legend className="sr-only">Qué se hace en SIESA</legend>
        <ActionOption
          name="next-step"
          value="actualizacion"
          checked={choice === "actualizacion"}
          onChange={setChoice}
          disabled={updateBlocked !== null}
          title="Actualización de lista"
          hint={updateBlocked ?? `Escribe los precios en la lista del cliente, ${quotation.price_list_id ?? "sin lista"}. Va a validación del área BI.`}
        />
        <ActionOption
          name="next-step"
          value="creacion"
          checked={choice === "creacion"}
          onChange={setChoice}
          disabled={listBlocked !== null}
          title="Creación de lista"
          hint={listBlocked ?? "Una lista nueva: el validador le pone el código y la descripción. Va a validación del área BI."}
        />
      </fieldset>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} className="max-md:h-11">Cancelar</Button>
        <Button type="submit" disabled={choice === null} className="max-md:h-11">
          Siguiente <ArrowRight aria-hidden="true" />
        </Button>
      </DialogFooter>
    </form>
  );
}

function ConfirmWizard({
  quotation,
  action,
  onBack,
  onClose,
}: {
  quotation: Quotation;
  /** Chosen in «Continuar proceso»; the wizard only confirms it. */
  action: ListAction;
  onBack: () => void;
  onClose: () => void;
}) {
  const confirm = useConfirmQuotation(quotation.id);
  const offer = useUpdateOffer(quotation.id);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<OfferDraft>(() => draftFrom(quotation));
  const [validityError, setValidityError] = useState<string | null>(null);
  const [activation, setActivation] = useState(quotation.activation_date ?? tomorrow());
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Lines under the rule no longer stop the advisor: they go to the validator as an alert.
  const failing = quotation.lines.filter((line) => line.is_active && line.compliance !== null && line.compliance !== "cumple").length;
  const priced = quotation.lines.filter((line) => line.is_active && line.new_price !== null).length;
  const blocked = priced === 0;
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
    const result = draftToSettings(draft, quotation);
    if ("error" in result) {
      setValidityError(result.error);
      setStep(0);
      return;
    }

    setError(null);
    setSending(true);
    try {
      let version = quotation.version;
      if (Object.keys(result.settings).length > 0) {
        version = (await offer.mutateAsync({ version, settings: result.settings })).version;
      }
      await confirm.mutateAsync({
        version,
        // On a creation the validator names the list when validating.
        options: { list_action: action, activation_date: activation },
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

      {step === 0 && blocked && <Alert severity="danger">No hay precios nuevos. Escribe al menos uno antes de pedir la lista.</Alert>}
      {step === 0 && failing > 0 && (
        <Alert severity="warning">
          {failing === 1 ? "1 referencia con precio nuevo queda" : `${formatCount(failing)} referencias con precio nuevo quedan`} bajo la regla
          (bajo el mínimo, sin margen objetivo o sin costo). Puedes enviarla igual: el validador las verá marcadas.
        </Alert>
      )}

      {step === 0 && <OfferSettingsStep quotation={quotation} draft={draft} onChange={setDraft} validityError={validityError} />}
      {step === 1 && <ConditionsStep draft={draft} onChange={setDraft} validityText={draftValidityText(draft, quotation)} />}
      {step === 2 && <SiesaStep quotation={quotation} action={action} activation={activation} onActivation={setActivation} />}

      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={() => (step === 0 ? onBack() : setStep(step - 1))} disabled={sending} className="max-md:h-11">
          <ArrowLeft aria-hidden="true" /> Atrás
        </Button>
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

/**
 * A list update has no offer and always writes over its own list: one step,
 * the list and who shares it, and from when the prices hold.
 */
function ListConfirm({ quotation, onClose }: { quotation: Quotation; onClose: () => void }) {
  const confirm = useConfirmQuotation(quotation.id);
  const dateId = useId();
  const [activation, setActivation] = useState(quotation.activation_date ?? tomorrow());
  const [error, setError] = useState<string | null>(null);
  const failing = quotation.lines.filter((line) => line.is_active && line.compliance !== null && line.compliance !== "cumple").length;
  const priced = quotation.lines.filter((line) => line.is_active && line.new_price !== null).length;
  const shared = quotation.price_list_customers ?? 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    confirm.mutate(
      { version: quotation.version, options: { list_action: "actualizacion", activation_date: activation } },
      {
        onSuccess: () => {
          toast.success("Actualización enviada a validación del área BI.");
          onClose();
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {priced === 0 && <Alert severity="danger">No hay precios nuevos. Escribe al menos uno antes de pedir la lista.</Alert>}
      {failing > 0 && (
        <Alert severity="warning">
          {failing === 1 ? "1 referencia con precio nuevo queda" : `${formatCount(failing)} referencias con precio nuevo quedan`} bajo la regla
          (bajo el mínimo, sin margen objetivo o sin costo). Puedes enviarla igual: el validador las verá marcadas.
        </Alert>
      )}
      <p className="text-sm">
        Actualiza la lista <span className="font-mono font-semibold">{quotation.price_list_id ?? "—"}</span>
        {quotation.price_list_name && <span className="text-text-secondary"> {quotation.price_list_name}</span>} con{" "}
        <strong className="tabular-nums">{formatCount(priced)}</strong> {priced === 1 ? "precio nuevo" : "precios nuevos"}.
        {shared > 1 && (
          <span className="mt-1 block text-text-secondary">
            La tienen <strong className="tabular-nums text-text-primary">{formatCount(shared)}</strong> clientes activos: al cargarla en SIESA,
            estos precios les cambian a todos.
          </span>
        )}
      </p>
      <div className="max-w-56">
        <Field label="Fecha de activación" htmlFor={dateId} hint="Desde cuándo rige el precio en SIESA.">
          <DatePicker id={dateId} value={activation} onChange={setActivation} min={toIso(new Date())} aria-describedby={`${dateId}-hint`} />
        </Field>
      </div>
      <DialogError message={error} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={confirm.isPending} className="max-md:h-11">Cancelar</Button>
        <Button type="submit" disabled={priced === 0 || confirm.isPending} className="max-md:h-11">
          {confirm.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />} Enviar a validación
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

/**
 * Step 3: the list the prices go to, chosen in «Continuar proceso», and from
 * when. On a creation the validator gives the list its code, so nothing is
 * asked here.
 */
function SiesaStep({
  quotation,
  action,
  activation,
  onActivation,
}: {
  quotation: Quotation;
  action: ListAction;
  activation: string;
  onActivation: (date: string) => void;
}) {
  const dateId = useId();
  const shared = quotation.price_list_customers ?? 0;

  return (
    <div className="space-y-5">
      {action === "actualizacion" ? (
        <p className="text-sm">
          Actualiza la lista <span className="font-mono font-semibold">{quotation.price_list_id ?? "—"}</span>
          {quotation.price_list_name && <span className="text-text-secondary"> {quotation.price_list_name}</span>}
          {shared > 1 && (
            <span className="mt-1 block text-text-secondary">
              La comparten <strong className="tabular-nums text-text-primary">{formatCount(shared)}</strong> clientes activos: al cargarla en
              SIESA, estos precios les cambian a todos. Si el ajuste es solo para este cliente, crea una lista.
            </span>
          )}
        </p>
      ) : (
        <p className="text-sm text-text-secondary">
          Al validar, el área BI le pone a la lista nueva su código y su descripción. Asignarla al cliente se hace a mano en SIESA.
        </p>
      )}

      <div className="max-w-56">
        <Field label="Fecha de activación" htmlFor={dateId} hint="Desde cuándo rige el precio en SIESA.">
          <DatePicker id={dateId} value={activation} onChange={onActivation} min={toIso(new Date())} aria-describedby={`${dateId}-hint`} />
        </Field>
      </div>
    </div>
  );
}

function ActionOption<T extends string>({
  name,
  value,
  checked,
  onChange,
  disabled = false,
  title,
  hint,
}: {
  name: string;
  value: T;
  checked: boolean;
  onChange: (value: T) => void;
  disabled?: boolean;
  title: string;
  /** What the option does, or why it is off. */
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
        name={name}
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
