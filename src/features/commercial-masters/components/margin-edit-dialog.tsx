"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { toNumber, type Decimal } from "@/shared/lib/format";

import { useProduct, useSetProductMargins } from "../hooks/use-commercial-masters";
import { MARGIN_LABELS, fractionToPercentInput, percentInputToFraction } from "../lib/margins";
import { MARGIN_FIELDS, type CommercialProduct, type MarginField } from "../types/commercial-master.types";

const dateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

/** The tax groups the ERP uses for liquor; a product may carry another, kept as is. */
const TAX_GROUPS = [
  { value: "0503", label: "0503 · Vino" },
  { value: "0509", label: "0509 · Licores" },
];

/**
 * The margins of one product, its notes and its liquor tax, set by hand.
 * Sends everything every time (PUT): a margin cannot be left empty, and a
 * product that already pays liquor tax cannot stop paying it here.
 */
export default function MarginEditDialog({ sku, onClose }: { sku: string | null; onClose: () => void }) {
  const product = useProduct(sku);
  return (
    <Dialog
      open={sku !== null}
      onOpenChange={(open) => !open && onClose()}
      isForm
      title="Editar márgenes"
      description={product.data ? `${product.data.description} · SKU ${product.data.sku}` : sku ? `SKU ${sku}` : undefined}
    >
      {product.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando producto" />
      ) : product.isError ? (
        <p role="alert" className="text-sm text-danger">{errorMessage(product.error)}</p>
      ) : (
        <MarginForm key={product.data.sku} product={product.data} onClose={onClose} />
      )}
    </Dialog>
  );
}

const pesos = (value: Decimal | null) => (toNumber(value) === null ? "" : String(toNumber(value)).replace(".", ","));

/** Pesos per unit: a number of 0 or more, typed with a comma or a point. */
function parsePesos(text: string): string | "invalid" {
  const clean = text.trim().replace(",", ".");
  const parsed = Number(clean);
  return clean !== "" && Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : "invalid";
}

type Errors = Partial<Record<MarginField | "national" | "coast" | "group", string>>;

function MarginForm({ product, onClose }: { product: CommercialProduct; onClose: () => void }) {
  const id = useId();
  const save = useSetProductMargins();
  // Paying already is a fact of the product: the switch starts on and stays on.
  const paysAlready = product.liquor_tax !== null || product.liquor_tax_coast !== null || product.liquor_tax_group !== null;
  const [margins, setMargins] = useState<Record<MarginField, string>>(
    () => Object.fromEntries(MARGIN_FIELDS.map((field) => [field, fractionToPercentInput(product[field])])) as Record<MarginField, string>
  );
  const [notes, setNotes] = useState(product.margin_notes ?? "");
  const [paysLiquor, setPaysLiquor] = useState(paysAlready);
  const [national, setNational] = useState(pesos(product.liquor_tax));
  const [coast, setCoast] = useState(pesos(product.liquor_tax_coast));
  const [group, setGroup] = useState(product.liquor_tax_group ?? "");
  const [errors, setErrors] = useState<Errors>({});
  // Editing a field drops its error; the rest stay until the next save.
  const edit = (key: keyof Errors, apply: () => void) => {
    apply();
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const groupOptions =
    group && !TAX_GROUPS.some((option) => option.value === group) ? [...TAX_GROUPS, { value: group, label: group }] : TAX_GROUPS;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found: Errors = {};
    const fractions: Partial<Record<MarginField, string>> = {};
    for (const field of MARGIN_FIELDS) {
      const fraction = percentInputToFraction(margins[field]);
      // The PUT keeps an employee margin that does not arrive and cannot clear
      // one, so an empty box only passes when the product has none yet.
      if (fraction === null && field === "margin_employee" && product.margin_employee === null) continue;
      if (fraction === null) found[field] = "Escribe el margen; no puede quedar vacío.";
      else if (fraction === "invalid") found[field] = "Escribe un porcentaje mayor que 0 y menor que 100.";
      else fractions[field] = fraction;
    }
    let liquor: { national: string; coast: string; group: string } | null = null;
    if (paysLiquor) {
      const nationalValue = parsePesos(national);
      const coastValue = parsePesos(coast);
      if (nationalValue === "invalid") found.national = "Escribe el valor en pesos, 0 o más.";
      if (coastValue === "invalid") found.coast = "Escribe el valor en pesos, 0 o más.";
      if (group === "") found.group = "Elige el grupo impositivo.";
      if (nationalValue !== "invalid" && coastValue !== "invalid" && group !== "") {
        liquor = { national: nationalValue, coast: coastValue, group };
      }
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    save.mutate(
      { sku: product.sku, margins: { ...(fractions as Record<Exclude<MarginField, "margin_employee">, string>), notes: notes.trim() === "" ? null : notes.trim(), liquor_tax: liquor } },
      {
        onSuccess: () => {
          toast.success(`Márgenes de ${product.sku} guardados.`);
          onClose();
        },
      }
    );
  };

  const failure =
    save.error instanceof ApiError && save.error.status === 403
      ? "Solo los gestores de márgenes pueden editarlos."
      : save.isError
        ? errorMessage(save.error)
        : null;

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <fieldset disabled={save.isPending} className="min-w-0 space-y-6">
        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Márgenes</h3>
            <p className="text-[13px] text-text-secondary">
              {product.margin_employee === null
                ? "En porcentaje, por ejemplo 18 o 18,5. Los de canal son obligatorios; Empleado JDH puede quedar vacío."
                : "En porcentaje, por ejemplo 18 o 18,5. Todos son obligatorios."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
            {MARGIN_FIELDS.map((field) => (
              <Field key={field} label={`${MARGIN_LABELS[field]} (%)`} htmlFor={`${id}-${field}`} error={errors[field]}>
                <Input
                  id={`${id}-${field}`}
                  inputMode="decimal"
                  value={margins[field]}
                  aria-invalid={errors[field] ? true : undefined}
                  onChange={(event) => {
                    const next = event.target.value;
                    edit(field, () => setMargins((current) => ({ ...current, [field]: next })));
                  }}
                />
              </Field>
            ))}
          </div>
          <Field label="Notas" htmlFor={`${id}-notes`} optional>
            <Textarea id={`${id}-notes`} rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
        </section>

        <section className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold" id={`${id}-liquor`}>Paga impuesto al consumo</h3>
              <p className="text-[13px] text-text-secondary" id={`${id}-liquor-help`}>
                {paysAlready
                  ? "Este producto ya lo paga: puedes cambiar los valores, no quitarlo."
                  : "Enciéndelo si el producto paga impuesto al consumo (licores y vinos)."}
              </p>
            </div>
            <Switch
              checked={paysLiquor}
              onCheckedChange={setPaysLiquor}
              disabled={paysAlready}
              aria-label="Paga impuesto al consumo"
              aria-describedby={`${id}-liquor-help`}
            />
          </div>
          {paysLiquor && (
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-3">
              <Field label="Nacional ($ por unidad)" htmlFor={`${id}-national`} error={errors.national}>
                <Input
                  id={`${id}-national`}
                  inputMode="decimal"
                  value={national}
                  aria-invalid={errors.national ? true : undefined}
                  onChange={(event) => edit("national", () => setNational(event.target.value))}
                />
              </Field>
              <Field label="Costa ($ por unidad)" htmlFor={`${id}-coast`} error={errors.coast}>
                <Input
                  id={`${id}-coast`}
                  inputMode="decimal"
                  value={coast}
                  aria-invalid={errors.coast ? true : undefined}
                  onChange={(event) => edit("coast", () => setCoast(event.target.value))}
                />
              </Field>
              <Field label="Grupo impositivo" htmlFor={`${id}-group`} error={errors.group}>
                <Dropdown
                  id={`${id}-group`}
                  placeholder="Elige el grupo"
                  aria-invalid={errors.group ? true : undefined}
                  options={groupOptions}
                  value={group}
                  onValueChange={(value) => edit("group", () => setGroup(value))}
                />
              </Field>
            </div>
          )}
        </section>
      </fieldset>

      {product.margin_updated_at && (
        <p className="text-xs text-text-secondary">
          Última edición: {dateTime.format(new Date(product.margin_updated_at))}
          {product.margin_updated_by ? `, ${product.margin_updated_by}` : ""}.
        </p>
      )}
      <DialogError message={failure} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={save.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Guardar márgenes
        </Button>
      </DialogFooter>
    </form>
  );
}
