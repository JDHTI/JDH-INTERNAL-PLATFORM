"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/shared/lib/utils";

import { formatLongDay, parseValidityDays, validityEnd } from "../lib/format";
import { MAX_CONDITIONS, MAX_CONDITION_LENGTH } from "../lib/offer";
import type { OfferScope, OfferSettings, Quotation } from "../types/quotations.types";

/** What the offer steps edit, before anything is sent. */
export interface OfferDraft {
  validity: string;
  scope: OfferScope;
  includeSeller: boolean;
  includeVariation: boolean;
  conditions: string[];
}

export const draftFrom = (quotation: Quotation): OfferDraft => ({
  validity: String(quotation.validity_days),
  scope: quotation.offer_scope,
  includeSeller: quotation.include_seller,
  includeVariation: quotation.include_variation,
  conditions: quotation.conditions,
});

/**
 * The settings that changed, for one `PATCH /offer`; an error when the
 * validity cannot be read. Sending the same validity again would restart it
 * from today, so it only goes when the number changed.
 */
export function draftToSettings(draft: OfferDraft, quotation: Quotation): { settings: OfferSettings } | { error: string } {
  const validity = parseValidityDays(draft.validity);
  if ("error" in validity) return { error: validity.error };
  const conditions = draft.conditions.map((item) => item.trim()).filter(Boolean);
  const settings: OfferSettings = {};
  if (validity.value !== quotation.validity_days) settings.validity_days = validity.value;
  if (draft.scope !== quotation.offer_scope) settings.offer_scope = draft.scope;
  if (draft.includeSeller !== quotation.include_seller) settings.include_seller = draft.includeSeller;
  if (draft.includeVariation !== quotation.include_variation) settings.include_variation = draft.includeVariation;
  if (conditions.join("\n") !== quotation.conditions.join("\n")) settings.conditions = conditions;
  return { settings };
}

const SCOPES: { value: OfferScope; label: string; hint: string }[] = [
  { value: "changed", label: "Solo con precio nuevo", hint: "Lo que se le cotiza ahora, más los productos para cotizar." },
  { value: "all", label: "Todas con precio", hint: "También las referencias que conservan su último precio." },
];

/** Step 1: how long the prices hold, which lines go in, and whether the seller signs it. */
export function OfferSettingsStep({
  quotation,
  draft,
  onChange,
  validityError,
}: {
  quotation: Quotation;
  draft: OfferDraft;
  onChange: (draft: OfferDraft) => void;
  validityError: string | null;
}) {
  const id = useId();
  const parsed = parseValidityDays(draft.validity);
  // The same number keeps the day it started; a new one counts from today.
  const until =
    "value" in parsed
      ? parsed.value === quotation.validity_days
        ? formatLongDay(quotation.valid_until)
        : formatLongDay(validityEnd(parsed.value))
      : null;
  const seller = quotation.seller_contact;

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor={`${id}-validity`} className="block text-[13px] font-medium">Vigencia para el cliente, en días</label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            id={`${id}-validity`}
            inputMode="numeric"
            autoComplete="off"
            value={draft.validity}
            onChange={(event) => onChange({ ...draft, validity: event.target.value })}
            aria-invalid={validityError ? true : undefined}
            aria-describedby={`${id}-validity-hint`}
            className="w-24 text-right tabular-nums max-md:h-11"
          />
          <span id={`${id}-validity-hint`} className="text-[13px] text-text-secondary">
            {validityError ? <span className="text-danger">{validityError}</span> : until ? `Los precios valen hasta el ${until}.` : "De 1 a 365 días."}
          </span>
        </div>
      </div>

      <fieldset className="min-w-0 space-y-2">
        <legend className="mb-2 text-[13px] font-medium">Ítems en la oferta</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SCOPES.map((scope) => (
            <label
              key={scope.value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-md border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                draft.scope === scope.value ? "border-primary bg-primary-subtle" : "border-border-control hover:bg-canvas-subtle"
              )}
            >
              <input
                type="radio"
                name={`${id}-scope`}
                checked={draft.scope === scope.value}
                onChange={() => onChange({ ...draft, scope: scope.value })}
                className="mt-0.5 size-4 accent-[var(--primary)]"
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">{scope.label}</span>
                <span className="block text-[13px] text-text-secondary">{scope.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-start justify-between gap-4 rounded-md border border-border-control p-3">
        <div className="min-w-0 space-y-0.5">
          <span id={`${id}-seller`} className="block text-sm font-medium">Incluir datos del vendedor</span>
          <span id={`${id}-seller-hint`} className="block text-[13px] text-text-secondary">
            {seller
              ? [seller.name, seller.email, seller.phone].filter(Boolean).join(" · ")
              : "El cliente no tiene vendedor asignado en SIESA, o aún no se leyó: «Refrescar» lo trae."}
          </span>
        </div>
        <Switch
          checked={draft.includeSeller}
          onCheckedChange={(next) => onChange({ ...draft, includeSeller: next })}
          aria-label="Incluir datos del vendedor"
          aria-describedby={`${id}-seller-hint`}
          className="mt-0.5"
        />
      </div>

      <div className="flex items-start justify-between gap-4 rounded-md border border-border-control p-3">
        <div className="min-w-0 space-y-0.5">
          <span className="block text-sm font-medium">Incluir la variación</span>
          <span id={`${id}-variation-hint`} className="block text-[13px] text-text-secondary">
            Una columna en el Excel y el PDF con cuánto sube o baja cada precio frente al último que pagó.
          </span>
        </div>
        <Switch
          checked={draft.includeVariation}
          onCheckedChange={(next) => onChange({ ...draft, includeVariation: next })}
          aria-label="Incluir la variación"
          aria-describedby={`${id}-variation-hint`}
          className="mt-0.5"
        />
      </div>
    </div>
  );
}

/**
 * Conditions people often write, ready to add and edit. None is required;
 * each one disappears from the suggestions once it is in the list.
 */
const SUGGESTIONS: { label: string; text: string }[] = [
  { label: "Envío gratuito", text: "Envío gratuito" },
  { label: "Tiempo de entrega", text: "Tiempo de entrega: 24 horas" },
  { label: "Modalidad de pago", text: "Modalidad de pago: contado" },
];

/**
 * Step 2: the observations the customer reads under "Condiciones de la
 * oferta". The validity is always the first one and is not typed.
 */
export function ConditionsStep({
  draft,
  onChange,
  validityText,
}: {
  draft: OfferDraft;
  onChange: (draft: OfferDraft) => void;
  /** "Precios válidos hasta el …", from step 1. */
  validityText: string;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const items = draft.conditions;
  const full = items.length >= MAX_CONDITIONS;
  const set = (conditions: string[]) => onChange({ ...draft, conditions });
  const used = (suggestion: string) => items.some((item) => item.trim().toLowerCase().startsWith(suggestion.split(":")[0].toLowerCase()));

  const add = (value: string) => {
    const clean = value.trim();
    if (!clean || full) return;
    set([...items, clean]);
  };

  const move = (index: number, by: -1 | 1) => {
    const next = [...items];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    set(next);
  };

  const available = SUGGESTIONS.filter((suggestion) => !used(suggestion.label));

  return (
    <div className="space-y-4">
      {available.length > 0 && !full && (
        <div className="space-y-1.5">
          <p id={`${id}-suggestions`} className="text-[13px] font-medium">
            Sugeridas <span className="font-normal text-text-secondary">(opcionales; se pueden editar después de agregarlas)</span>
          </p>
          <div role="group" aria-labelledby={`${id}-suggestions`} className="flex flex-wrap gap-2">
            {available.map((suggestion) => (
              <Button key={suggestion.label} variant="outline" size="sm" onClick={() => add(suggestion.text)} className="max-md:h-11">
                <Plus aria-hidden="true" /> {suggestion.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <h3 className="text-[13px] font-medium">Condiciones de la oferta</h3>
        <ol className="space-y-1.5">
          <li className="flex min-h-9 items-center gap-2 rounded-md bg-canvas-subtle px-2.5 text-sm">
            <span className="min-w-0 flex-1">{validityText}</span>
            <span className="shrink-0 text-xs text-text-secondary">De la vigencia</span>
          </li>
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-1">
              <Input
                value={item}
                maxLength={MAX_CONDITION_LENGTH}
                onChange={(event) => set(items.map((current, at) => (at === index ? event.target.value : current)))}
                aria-label={`Condición ${index + 2}`}
                className="max-md:h-11"
              />
              <IconButton label={`Subir la condición ${index + 2}`} disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUp aria-hidden="true" />
              </IconButton>
              <IconButton label={`Bajar la condición ${index + 2}`} disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                <ArrowDown aria-hidden="true" />
              </IconButton>
              <IconButton label={`Quitar la condición ${index + 2}`} onClick={() => set(items.filter((_, at) => at !== index))}>
                <X aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ol>
      </div>

      {full ? (
        <p className="text-[13px] text-text-secondary">Son {MAX_CONDITIONS}, el máximo. Quita una para agregar otra.</p>
      ) : (
        <div className="flex gap-2">
          <Input
            value={text}
            maxLength={MAX_CONDITION_LENGTH}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add(text);
                setText("");
              }
            }}
            placeholder="Escribe otra condición"
            aria-label="Nueva condición"
            className="max-md:h-11"
          />
          <Button
            variant="outline"
            onClick={() => {
              add(text);
              setText("");
            }}
            disabled={text.trim() === ""}
            className="shrink-0 max-md:h-11"
          >
            <Plus aria-hidden="true" /> Agregar
          </Button>
        </div>
      )}
    </div>
  );
}

function IconButton({ label, disabled = false, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="icon-sm" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="shrink-0 max-md:size-11">
      {children}
    </Button>
  );
}

/** The validity line as it will read, from the draft. */
export function draftValidityText(draft: OfferDraft, quotation: Quotation): string {
  const parsed = parseValidityDays(draft.validity);
  if (!("value" in parsed)) return "Precios válidos hasta …";
  const until = parsed.value === quotation.validity_days ? formatLongDay(quotation.valid_until) : formatLongDay(validityEnd(parsed.value));
  return `Precios válidos hasta el ${until}`;
}
