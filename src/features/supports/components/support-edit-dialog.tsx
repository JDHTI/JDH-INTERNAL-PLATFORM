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
import { PERCENT_METHODS } from "../lib/format";
import { toDecimal, toInput } from "../lib/form-values";
import type { SupplierSupport, SupportPatch, SupportTier, ValueUnit } from "../types/support.types";

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
  jdh_pct: string;
  valid_from: string;
  valid_to: string;
  value_unit: string;
  pack_factor: string;
  reference_cost: string;
  reference_list_price: string;
  target_margin_pct: string;
  program: string;
  authorized_by: string;
  notes: string;
  tiers: TierDraft[];
}

function draftOf(support: SupplierSupport): Draft {
  const valuePercent = PERCENT_METHODS.includes(support.calc_method ?? "");
  return {
    supplier_value: toInput(support.supplier_value, valuePercent),
    jdh_pct: toInput(support.jdh_pct, true),
    valid_from: support.valid_from ?? "",
    valid_to: support.valid_to ?? "",
    value_unit: support.value_unit ?? NO_UNIT,
    pack_factor: toInput(support.pack_factor, false),
    reference_cost: toInput(support.reference_cost, false),
    reference_list_price: toInput(support.reference_list_price, false),
    target_margin_pct: toInput(support.target_margin_pct, true),
    program: support.program ?? "",
    authorized_by: support.authorized_by ?? "",
    notes: support.notes ?? "",
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
  if (changed("jdh_pct")) patch.jdh_pct = toDecimal(draft.jdh_pct, true);
  if (changed("valid_from")) patch.valid_from = draft.valid_from || null;
  if (changed("valid_to")) patch.valid_to = draft.valid_to || null;
  if (changed("value_unit")) patch.value_unit = draft.value_unit === NO_UNIT ? null : (draft.value_unit as ValueUnit);
  if (changed("pack_factor")) patch.pack_factor = toDecimal(draft.pack_factor, false);
  if (changed("reference_cost")) patch.reference_cost = toDecimal(draft.reference_cost, false);
  if (changed("reference_list_price")) patch.reference_list_price = toDecimal(draft.reference_list_price, false);
  if (changed("target_margin_pct")) patch.target_margin_pct = toDecimal(draft.target_margin_pct, true);
  if (changed("program")) patch.program = draft.program.trim() || null;
  if (changed("authorized_by")) patch.authorized_by = draft.authorized_by.trim() || null;
  if (changed("notes")) patch.notes = draft.notes.trim() || null;
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

  const valuePercent = PERCENT_METHODS.includes(support.calc_method ?? "");
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setTier = (index: number, patch: Partial<TierDraft>) =>
    set("tiers", draft.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));

  const patch = buildPatch(support, initial, draft);
  const dirty = Object.keys(patch).length > 1;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    update.mutate(
      { id: support.id, patch },
      {
        onSuccess: onClose,
        onError: (failure) => {
          if (failure instanceof ApiError && failure.status === 403) {
            onForbidden();
            onClose();
          } else if (failure instanceof ApiError && failure.status === 409) {
            setError("Otra persona modificó este apoyo mientras lo editabas. Se cargó la versión nueva: revisa los datos y guarda de nuevo.");
          } else {
            setError(errorMessage(failure));
          }
        },
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={valuePercent ? "Valor del proveedor (%)" : "Valor del proveedor ($)"} htmlFor={`${id}-value`}>
          <Input id={`${id}-value`} inputMode="decimal" value={draft.supplier_value} onChange={(e) => set("supplier_value", e.target.value)} />
        </Field>
        <Field label="% apoyo JDH" htmlFor={`${id}-jdh`} optional>
          <Input id={`${id}-jdh`} inputMode="decimal" value={draft.jdh_pct} onChange={(e) => set("jdh_pct", e.target.value)} />
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
        <Field label="Margen objetivo (%)" htmlFor={`${id}-target`} optional>
          <Input id={`${id}-target`} inputMode="decimal" value={draft.target_margin_pct} onChange={(e) => set("target_margin_pct", e.target.value)} />
        </Field>
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
        <Button type="submit" disabled={!dirty || update.isPending}>
          {update.isPending ? "Guardando" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
