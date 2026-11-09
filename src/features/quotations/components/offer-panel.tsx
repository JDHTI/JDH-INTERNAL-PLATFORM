"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronDown, Eye, FileSpreadsheet, Loader2, Plus, Printer, X } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useUpdateOffer } from "../hooks/use-quotations";
import { formatCount, formatLongDay, parseValidityDays } from "../lib/format";
import { MAX_CONDITIONS, MAX_CONDITION_LENGTH, offerLines, validityCondition } from "../lib/offer";
import { downloadOfferExcel } from "../services/quotations.service";
import type { OfferScope, OfferSettings, Quotation } from "../types/quotations.types";

const SCOPES: { value: OfferScope; label: string; hint: string }[] = [
  { value: "changed", label: "Solo con precio nuevo", hint: "Lo que se le está cotizando ahora, más los productos para cotizar." },
  { value: "all", label: "Todas con precio", hint: "También las que conservan su último precio." },
];

/**
 * Everything the customer receives, in one place at the top: validity, the
 * conditions the executive writes, which lines go in, the seller's contact
 * and quantities; then the preview, the workbook and the PDF. Each setting
 * saves on its own (`PATCH /offer`): it never touches prices, so it never sends
 * the quotation back to draft.
 */
export default function OfferPanel({
  quotation,
  basePath,
  editable,
  disabled,
}: {
  quotation: Quotation;
  basePath: string;
  /** Whoever can manage it; the offer is editable in every status. */
  editable: boolean;
  /** Prices unsaved or another write running: a write needs the current version. */
  disabled: boolean;
}) {
  const id = useId();
  const update = useUpdateOffer(quotation.id);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const items = offerLines(quotation).length;
  const previewHref = `${basePath}/${quotation.id}/oferta`;
  const locked = !editable || disabled || update.isPending;

  const save = (settings: OfferSettings, done?: string) => {
    setError(null);
    update.mutate(
      { version: quotation.version, settings },
      {
        onSuccess: () => done && toast.success(done),
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  const download = async () => {
    setDownloading(true);
    try {
      await downloadOfferExcel(quotation.id);
    } catch (failure) {
      toast.error(errorMessage(failure), { duration: Infinity });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
        <h2 id={`${id}-title`} className="min-w-0 flex-1 text-base font-semibold">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls={`${id}-body`}
            className="flex min-h-10 w-full items-center gap-2 rounded-md text-left hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronDown className={cn("size-4 shrink-0 text-text-secondary", !open && "-rotate-90")} aria-hidden="true" />
            <span>Oferta para el cliente</span>
            <span className="truncate text-[13px] font-normal text-text-secondary">
              Válida hasta el {formatLongDay(quotation.valid_until)} · {formatCount(items)} {items === 1 ? "ítem" : "ítems"}
              {quotation.conditions.length > 0 &&
                ` · ${formatCount(quotation.conditions.length)} ${quotation.conditions.length === 1 ? "condición" : "condiciones"}`}
              {quotation.quote_quantities && " · con cantidades"}
            </span>
          </button>
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link href={previewHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "max-md:h-11")}>
            <Eye aria-hidden="true" /> Vista previa
          </Link>
          <Button variant="outline" size="sm" onClick={() => void download()} disabled={downloading || items === 0} className="max-md:h-11">
            {downloading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <FileSpreadsheet aria-hidden="true" />} Excel
          </Button>
          <Link
            href={`${previewHref}?imprimir=1`}
            aria-disabled={items === 0 || undefined}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "max-md:h-11", items === 0 && "pointer-events-none opacity-50")}
          >
            <Printer aria-hidden="true" /> PDF
          </Link>
        </div>
      </div>

      {open && (
        <div id={`${id}-body`} className="grid gap-x-6 gap-y-5 border-t border-border p-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-5">
            {/* Keyed on what is saved: a save (or another tab's) restarts the field from the API's value. */}
            <ValidityField
              key={`${quotation.validity_days}-${quotation.valid_until}`}
              quotation={quotation}
              locked={locked}
              onSave={(days) => save({ validity_days: days })}
            />

            <fieldset className="min-w-0 space-y-2" disabled={locked}>
              <legend className="mb-2 text-[13px] font-medium">Ítems en la oferta</legend>
              {SCOPES.map((scope) => (
                <label
                  key={scope.value}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-md border p-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                    quotation.offer_scope === scope.value ? "border-primary bg-primary-subtle" : "border-border-control hover:bg-canvas-subtle"
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-scope`}
                    checked={quotation.offer_scope === scope.value}
                    onChange={() => save({ offer_scope: scope.value })}
                    className="mt-0.5 size-4 accent-[var(--primary)]"
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">{scope.label}</span>
                    <span className="block text-[13px] text-text-secondary">{scope.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <SwitchRow
              label="Incluir datos del vendedor"
              checked={quotation.include_seller}
              disabled={locked}
              onChange={(next) => save({ include_seller: next })}
              hint={
                quotation.seller_contact
                  ? [quotation.seller_contact.name, quotation.seller_contact.email, quotation.seller_contact.phone].filter(Boolean).join(" · ")
                  : "El cliente no tiene vendedor asignado en SIESA, o aún no se leyó: «Refrescar» lo trae."
              }
            />
            <SwitchRow
              label="Cotizar con cantidades"
              checked={quotation.quote_quantities}
              disabled={locked}
              onChange={(next) => save({ quote_quantities: next })}
              hint="Agrega la cantidad a cada ítem y un consolidado con subtotal, IVA por tarifa y total."
            />
          </div>

          <ConditionsEditor
            key={quotation.conditions.join("\n")}
            quotation={quotation}
            locked={locked}
            onSave={(conditions) => save({ conditions })}
          />

          {error && (
            <p role="alert" className="text-[13px] text-danger lg:col-span-2">{error}</p>
          )}
          {update.isPending && (
            <p aria-live="polite" className="flex items-center gap-1.5 text-[13px] text-text-secondary lg:col-span-2">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Guardando la oferta…
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-0.5">
        <span id={`${id}-label`} className="block text-sm font-medium">{label}</span>
        <span id={`${id}-hint`} className="block text-[13px] text-text-secondary">{hint}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={label} aria-describedby={`${id}-hint`} className="mt-0.5" />
    </div>
  );
}

/** Days from today; saved when the field is left or on Enter, so typing "20" never saves a "2" on the way. */
function ValidityField({ quotation, locked, onSave }: { quotation: Quotation; locked: boolean; onSave: (days: number) => void }) {
  const id = useId();
  const [text, setText] = useState(String(quotation.validity_days));
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const parsed = parseValidityDays(text);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    // The same number keeps the start day; only a change counts from today again.
    if (parsed.value !== quotation.validity_days) onSave(parsed.value);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium">Vigencia, en días</label>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          value={text}
          disabled={locked}
          onChange={(event) => {
            setText(event.target.value);
            setError(null);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint`}
          className="w-24 text-right tabular-nums max-md:h-11"
        />
        <span id={`${id}-hint`} className="text-[13px] text-text-secondary">
          {error ? <span className="text-danger">{error}</span> : `Hasta el ${formatLongDay(quotation.valid_until)}; cambiarla cuenta desde hoy.`}
        </span>
      </div>
    </div>
  );
}

/**
 * The conditions as an editable list, shown to the customer as bullets under
 * "Condiciones de la oferta". The validity is always the first one and is not
 * typed. Each change saves the whole list, in order.
 */
function ConditionsEditor({ quotation, locked, onSave }: { quotation: Quotation; locked: boolean; onSave: (conditions: string[]) => void }) {
  const id = useId();
  const [items, setItems] = useState(quotation.conditions);
  const [draft, setDraft] = useState("");

  const commit = (next: string[]) => {
    const clean = next.map((item) => item.trim()).filter(Boolean);
    setItems(clean);
    if (clean.join("\n") !== quotation.conditions.join("\n")) onSave(clean);
  };

  const add = () => {
    const text = draft.trim();
    if (!text || items.length >= MAX_CONDITIONS) return;
    commit([...items, text]);
    setDraft("");
  };

  const move = (index: number, by: -1 | 1) => {
    const next = [...items];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    commit(next);
  };

  return (
    <div className="min-w-0 space-y-2">
      <h3 className="text-[13px] font-medium">Condiciones de la oferta</h3>
      <ol className="space-y-1.5">
        <li className="flex min-h-9 items-center gap-2 rounded-md bg-canvas-subtle px-2.5 text-sm">
          <span className="min-w-0 flex-1">{validityCondition(quotation)}</span>
          <span className="shrink-0 text-xs text-text-secondary">De la vigencia</span>
        </li>
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="flex items-center gap-1">
            <Input
              defaultValue={item}
              maxLength={MAX_CONDITION_LENGTH}
              disabled={locked}
              aria-label={`Condición ${index + 2}`}
              onBlur={(event) => {
                if (event.target.value.trim() !== item) commit(items.map((current, at) => (at === index ? event.target.value : current)));
              }}
              className="max-md:h-11"
            />
            <IconButton label={`Subir la condición ${index + 2}`} disabled={locked || index === 0} onClick={() => move(index, -1)}>
              <ArrowUp aria-hidden="true" />
            </IconButton>
            <IconButton label={`Bajar la condición ${index + 2}`} disabled={locked || index === items.length - 1} onClick={() => move(index, 1)}>
              <ArrowDown aria-hidden="true" />
            </IconButton>
            <IconButton label={`Quitar la condición ${index + 2}`} disabled={locked} onClick={() => commit(items.filter((_, at) => at !== index))}>
              <X aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ol>
      {items.length < MAX_CONDITIONS ? (
        <div className="flex gap-2">
          <Input
            id={`${id}-new`}
            value={draft}
            maxLength={MAX_CONDITION_LENGTH}
            disabled={locked}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            placeholder="Ej.: Condición de pago: contado"
            aria-label="Nueva condición"
            className="max-md:h-11"
          />
          <Button variant="outline" onClick={add} disabled={locked || draft.trim() === ""} className="shrink-0 max-md:h-11">
            <Plus aria-hidden="true" /> Agregar
          </Button>
        </div>
      ) : (
        <p className="text-[13px] text-text-secondary">Son {MAX_CONDITIONS}, el máximo. Quita una para agregar otra.</p>
      )}
    </div>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="icon-sm" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="shrink-0 max-md:size-11">
      {children}
    </Button>
  );
}
