"use client";

import { useId, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useCalcMethodLabel, useUpdateSupport } from "../hooks/use-supports";
import { PERCENT_METHODS, SUPPORTED_MARGIN_HELP, SUPPORTED_MARGIN_LABEL } from "../lib/format";
import { NUMBER_ERROR, toDecimal, toInput } from "../lib/form-values";
import { guaranteedMinError } from "../lib/guaranteed-margin";
import { overlapsOf } from "../lib/overlaps";
import type { SupplierSupport, SupportOverlap, SupportPatch, SupportTier, ValueUnit } from "../types/support.types";
import OverlapDialog from "./overlap-dialog";
import PromoCheck from "./promo-check";

const NO_UNIT = "";

const THRESHOLDS: { value: SupportTier["threshold_type"]; label: string }[] = [
  { value: "unidades", label: "Unidades" },
  { value: "cajas", label: "Cajas" },
  { value: "monto_ventas", label: "Monto de ventas" },
];

interface TierDraft {
  threshold_type: SupportTier["threshold_type"];
  from_value: string;
  to_value: string;
  value: string;
}

interface Draft {
  supplier_value: string;
  supported_margin_pct: string;
  valid_from: string;
  valid_to: string;
  value_unit: string;
  pack_factor: string;
  reference_cost: string;
  reference_list_price: string;
  target_margin_pct: string;
  supplier_min_margin_pct: string;
  program: string;
  authorized_by: string;
  notes: string;
  promo_warehouses: boolean;
  tiers: TierDraft[];
}

/** «Excepción margen JDH»: no supplier money, only the authorized minimum margin. */
const isException = (support: SupplierSupport) => support.calc_method === "margen_minimo";

function draftOf(support: SupplierSupport): Draft {
  const valuePercent = PERCENT_METHODS.includes(support.calc_method ?? "");
  return {
    supplier_value: toInput(support.supplier_value, valuePercent),
    // A margin exception keeps its margin in min_margin_pct (what the quoter and the validator read).
    supported_margin_pct: toInput(isException(support) ? support.min_margin_pct : support.supported_margin_pct, true),
    valid_from: support.valid_from ?? "",
    valid_to: support.valid_to ?? "",
    value_unit: support.value_unit ?? NO_UNIT,
    pack_factor: toInput(support.pack_factor, false),
    reference_cost: toInput(support.reference_cost, false),
    reference_list_price: toInput(support.reference_list_price, false),
    target_margin_pct: toInput(support.target_margin_pct, true),
    supplier_min_margin_pct: toInput(support.supplier_min_margin_pct, true),
    program: support.program ?? "",
    authorized_by: support.authorized_by ?? "",
    notes: support.notes ?? "",
    promo_warehouses: support.promo_warehouses ?? false,
    tiers: support.tiers.map((tier) => ({
      threshold_type: tier.threshold_type,
      from_value: toInput(tier.from_value, false),
      to_value: toInput(tier.to_value, false),
      value: toInput(tier.value, valuePercent),
    })),
  };
}

/** Only what changed goes out; an emptied field is sent as null so the API clears it. */
function buildPatch(support: SupplierSupport, initial: Draft, draft: Draft): SupportPatch {
  const valuePercent = PERCENT_METHODS.includes(support.calc_method ?? "");
  const patch: SupportPatch = { version: support.version };
  const changed = <K extends keyof Draft>(key: K) => JSON.stringify(initial[key]) !== JSON.stringify(draft[key]);

  if (changed("supplier_value")) patch.supplier_value = toDecimal(draft.supplier_value, valuePercent);
  // The JDH percentage is not edited here: it changes through the JDH requests panel.
  if (changed("supported_margin_pct")) {
    const margin = toDecimal(draft.supported_margin_pct, true);
    if (isException(support)) patch.min_margin_pct = margin;
    else patch.supported_margin_pct = margin;
  }
  if (changed("valid_from")) patch.valid_from = draft.valid_from || null;
  if (changed("valid_to")) patch.valid_to = draft.valid_to || null;
  if (changed("value_unit")) patch.value_unit = draft.value_unit === NO_UNIT ? null : (draft.value_unit as ValueUnit);
  if (changed("pack_factor")) patch.pack_factor = toDecimal(draft.pack_factor, false);
  if (changed("reference_cost")) patch.reference_cost = toDecimal(draft.reference_cost, false);
  if (changed("reference_list_price")) patch.reference_list_price = toDecimal(draft.reference_list_price, false);
  if (changed("target_margin_pct")) patch.target_margin_pct = toDecimal(draft.target_margin_pct, true);
  if (changed("supplier_min_margin_pct")) patch.supplier_min_margin_pct = toDecimal(draft.supplier_min_margin_pct, true);
  if (changed("program")) patch.program = draft.program.trim() || null;
  if (changed("authorized_by")) patch.authorized_by = draft.authorized_by.trim() || null;
  if (changed("notes")) patch.notes = draft.notes.trim() || null;
  if (changed("promo_warehouses")) patch.promo_warehouses = draft.promo_warehouses;
  if (changed("tiers")) {
    patch.tiers = draft.tiers.map((tier) => ({
      threshold_type: tier.threshold_type,
      from_value: toDecimal(tier.from_value, false) ?? 0,
      to_value: toDecimal(tier.to_value, false),
      value: toDecimal(tier.value, valuePercent) ?? 0,
    }));
  }
  return patch;
}

/**
 * Edits the structure of one support. The form lives in an inner component
 * keyed by the support's version, so reopening it, or a refetch after another
 * person's change, starts from what the API holds now.
 */
export default function SupportEditDialog({
  support,
  onClose,
  onForbidden,
}: {
  support: SupplierSupport | null;
  onClose: () => void;
  onForbidden: () => void;
}) {
  const calcMethodLabel = useCalcMethodLabel();
  return (
    <Dialog
      open={support !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Editar apoyo"
      description={support ? `${support.supplier_name ?? "Proveedor"} · ${calcMethodLabel(support.calc_method)}` : undefined}
      isForm
      wide
    >
      {support && (
        <EditForm key={`${support.id}-${support.version}`} support={support} onClose={onClose} onForbidden={onForbidden} />
      )}
    </Dialog>
  );
}

function EditForm({
  support,
  onClose,
  onForbidden,
}: {
  support: SupplierSupport;
  onClose: () => void;
  onForbidden: () => void;
}) {
  const id = useId();
  const update = useUpdateSupport();
  const [initial] = useState(() => draftOf(support));
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [crossing, setCrossing] = useState<{ overlaps: SupportOverlap[]; error: string | null } | null>(null);

  const valuePercent = PERCENT_METHODS.includes(support.calc_method ?? "");
  // «% Margen Garantizado»: the guaranteed margin (target_margin_pct) is the support itself.
  const guaranteed = support.calc_method === "precio_neto";
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setTier = (index: number, patch: Partial<TierDraft>) =>
    set("tiers", draft.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));

  const patch = buildPatch(support, initial, draft);
  const dirty = Object.keys(patch).length > 1;
  // Typed but unreadable, or not below the guaranteed margin: said under the field, and it does not save.
  const supplierMinError = !guaranteed
    ? null
    : draft.supplier_min_margin_pct.trim() !== "" && toDecimal(draft.supplier_min_margin_pct, true) === null
      ? NUMBER_ERROR
      : guaranteedMinError(toDecimal(draft.supplier_min_margin_pct, true), toDecimal(draft.target_margin_pct, true));

  const save = async (body: SupportPatch) => {
    setError(null);
    // mutateAsync, not mutate's callbacks: the refetch after saving brings a new
    // version, which remounts this form (its key), and mutate drops the
    // callbacks of an unmounted form, so the dialog never closed.
    try {
      await update.mutateAsync({ id: support.id, patch: body });
      onClose();
    } catch (failure) {
      const overlaps = overlapsOf(failure);
      if (overlaps) {
        // New dates crossed a live support: ask what happens to it, then send the same changes.
        setCrossing({ overlaps, error: crossing ? errorMessage(failure) : null });
        return;
      }
      setCrossing(null);
      if (failure instanceof ApiError && failure.status === 403) {
        onForbidden();
        onClose();
      } else if (failure instanceof ApiError && failure.status === 409) {
        setError("Otra persona modificó este apoyo mientras lo editabas. Se cargó la versión nueva: revisa los datos y guarda de nuevo.");
      } else {
        setError(errorMessage(failure));
      }
    }
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (supplierMinError) return;
    void save(patch);
  };

  return (
    <>
    <OverlapDialog
      overlaps={crossing?.overlaps ?? null}
      pending={update.isPending}
      error={crossing?.error ?? null}
      onCancel={() => setCrossing(null)}
      onResolve={(choice) => void save({ ...patch, ...choice })}
    />
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {guaranteed ? (
          // The supplier guarantees a margin at any selling price: that margin is the support, there is no value.
          <>
            <Field label="Margen garantizado (%)" htmlFor={`${id}-target`} hint="El proveedor pone lo que falte para llegar a este margen, se venda al precio que se venda.">
              <Input id={`${id}-target`} inputMode="decimal" value={draft.target_margin_pct} onChange={(e) => set("target_margin_pct", e.target.value)} />
            </Field>
            <Field
              label="Margen mínimo garantizado proveedor (%)"
              htmlFor={`${id}-supplier-min`}
              hint="Puede ser 0 o negativo, y menor que el garantizado. Precio apoyado = costo / (1 − este margen)."
              error={supplierMinError}
            >
              {/* The full keyboard: the decimal pad has no minus sign on iOS. */}
              <Input
                id={`${id}-supplier-min`}
                inputMode="text"
                value={draft.supplier_min_margin_pct}
                onChange={(e) => set("supplier_min_margin_pct", e.target.value)}
                aria-invalid={supplierMinError ? true : undefined}
                aria-describedby={supplierMinError ? `${id}-supplier-min-error` : `${id}-supplier-min-hint`}
              />
            </Field>
          </>
        ) : (
          !isException(support) && (
            <Field label={valuePercent ? "Valor del proveedor (%)" : "Valor del proveedor ($)"} htmlFor={`${id}-value`}>
              <Input id={`${id}-value`} inputMode="decimal" value={draft.supplier_value} onChange={(e) => set("supplier_value", e.target.value)} />
            </Field>
          )
        )}
        <Field label={`${SUPPORTED_MARGIN_LABEL} (%)`} htmlFor={`${id}-supported`} hint={SUPPORTED_MARGIN_HELP} optional>
          <Input
            id={`${id}-supported`}
            inputMode="decimal"
            value={draft.supported_margin_pct}
            onChange={(e) => set("supported_margin_pct", e.target.value)}
          />
        </Field>
        <Field label="Vigente desde" htmlFor={`${id}-from`}>
          <DatePicker id={`${id}-from`} value={draft.valid_from} onChange={(v) => set("valid_from", v)} max={draft.valid_to || undefined} />
        </Field>
        <Field label="Vigente hasta" htmlFor={`${id}-to`} hint="Vacío significa indefinido." optional>
          <DatePicker id={`${id}-to`} value={draft.valid_to} onChange={(v) => set("valid_to", v)} min={draft.valid_from || undefined} clearable placeholder="Indefinido" />
        </Field>
        <Field label="El costo está en" htmlFor={`${id}-unit`} optional>
          <Dropdown
            id={`${id}-unit`}
            value={draft.value_unit}
            onValueChange={(v) => set("value_unit", v)}
            options={[
              { value: NO_UNIT, label: "Sin base" },
              { value: "unidad", label: "Unidad" },
              { value: "caja", label: "Caja" },
              { value: "kg", label: "Kilo" },
            ]}
          />
        </Field>
        <Field label="Unidades por caja" htmlFor={`${id}-pack`} optional>
          <Input id={`${id}-pack`} inputMode="decimal" value={draft.pack_factor} onChange={(e) => set("pack_factor", e.target.value)} />
        </Field>
        <Field label="Costo de referencia ($)" htmlFor={`${id}-cost`} optional>
          <Input id={`${id}-cost`} inputMode="decimal" value={draft.reference_cost} onChange={(e) => set("reference_cost", e.target.value)} />
        </Field>
        <Field label="Precio de lista de referencia ($)" htmlFor={`${id}-list`} optional>
          <Input id={`${id}-list`} inputMode="decimal" value={draft.reference_list_price} onChange={(e) => set("reference_list_price", e.target.value)} />
        </Field>
        {!guaranteed && (
          <Field label="Margen objetivo (%)" htmlFor={`${id}-target`} optional>
            <Input id={`${id}-target`} inputMode="decimal" value={draft.target_margin_pct} onChange={(e) => set("target_margin_pct", e.target.value)} />
          </Field>
        )}
        <Field label="Programa" htmlFor={`${id}-program`} optional>
          <Input id={`${id}-program`} value={draft.program} onChange={(e) => set("program", e.target.value)} />
        </Field>
        <Field label="Autorizado por" htmlFor={`${id}-auth`} optional>
          <Input id={`${id}-auth`} value={draft.authorized_by} onChange={(e) => set("authorized_by", e.target.value)} />
        </Field>
      </div>

      <Field label="Notas" htmlFor={`${id}-notes`} optional>
        <Textarea id={`${id}-notes`} rows={3} value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>

      {support.promo_warehouses !== undefined && (
        <PromoCheck checked={draft.promo_warehouses} onChange={(value) => set("promo_warehouses", value)} />
      )}

      <section className="space-y-2" aria-labelledby={`${id}-tiers`}>
        <div className="flex items-center justify-between gap-2">
          <h3 id={`${id}-tiers`} className="text-sm font-semibold">Escalas</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              set("tiers", [...draft.tiers, { threshold_type: "unidades", from_value: "", to_value: "", value: "" }])
            }
          >
            <Plus aria-hidden="true" /> Agregar escala
          </Button>
        </div>
        {draft.tiers.length === 0 ? (
          <p className="text-sm text-text-secondary">Este apoyo no tiene escalas.</p>
        ) : (
          <ul className="space-y-2">
            {draft.tiers.map((tier, index) => (
              <li key={index} className="grid gap-2 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto] sm:items-center">
                <Dropdown
                  aria-label="Umbral"
                  value={tier.threshold_type}
                  onValueChange={(v) => setTier(index, { threshold_type: v as TierDraft["threshold_type"] })}
                  options={THRESHOLDS}
                />
                <Input aria-label="Desde" placeholder="Desde" inputMode="decimal" value={tier.from_value} onChange={(e) => setTier(index, { from_value: e.target.value })} />
                <Input aria-label="Hasta" placeholder="Sin tope" inputMode="decimal" value={tier.to_value} onChange={(e) => setTier(index, { to_value: e.target.value })} />
                <Input aria-label={valuePercent ? "Valor (%)" : "Valor ($)"} placeholder={valuePercent ? "Valor (%)" : "Valor ($)"} inputMode="decimal" value={tier.value} onChange={(e) => setTier(index, { value: e.target.value })} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => set("tiers", draft.tiers.filter((_, i) => i !== index))}
                  aria-label={`Quitar escala ${index + 1}`}
                  className="max-sm:justify-self-end"
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={update.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!dirty || update.isPending || supplierMinError !== null}>
          {update.isPending ? "Guardando" : "Guardar cambios"}
        </Button>
      </div>
    </form>
    </>
  );
}
