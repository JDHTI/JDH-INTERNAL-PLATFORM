"use client";

import { useId, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field, Textarea } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { toNumber, type Decimal } from "@/shared/lib/format";

import { useProduct, useUpdateProduct } from "../hooks/use-commercial-masters";
import {
  MARGIN_LABELS,
  MARGIN_SOURCE_LABELS,
  fractionToPercentInput,
  formatMargin,
  percentInputToFraction,
  sameMargin,
} from "../lib/margins";
import { MARGIN_FIELDS, type CommercialProduct, type MarginField, type ProductPatch } from "../types/commercial-master.types";

const dateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

const TEXT_FIELDS = [
  { key: "description", label: "Descripción", max: 300, required: true },
  { key: "supplier_sku", label: "SKU del proveedor", max: 100 },
  { key: "manufacturer", label: "Fabricante", max: 200 },
  { key: "brand", label: "Marca", max: 200 },
  { key: "category", label: "Categoría", max: 200 },
  { key: "subcategory", label: "Subcategoría", max: 200 },
  { key: "product_line", label: "Línea", max: 200 },
  { key: "product_subline", label: "Sublínea", max: 200 },
  { key: "product_group", label: "Grupo", max: 200 },
  { key: "inventory_unit", label: "Unidad de inventario", max: 20 },
  { key: "main_barcode", label: "Código de barras", max: 50 },
] as const;

type TextKey = (typeof TEXT_FIELDS)[number]["key"];
type NumberKey = "pack_factor" | "liquor_tax" | "liquor_tax_coast";

const NUMBER_FIELDS: { key: NumberKey; label: string }[] = [
  { key: "pack_factor", label: "Factor de empaque" },
  { key: "liquor_tax", label: "Impuesto al licor" },
  { key: "liquor_tax_coast", label: "Impuesto al licor (costa)" },
];

/**
 * One product: its identity and margins. Managers edit it in place and only the
 * fields they changed are sent; everyone else reads it. State, active and the
 * commercial supplier come from the DWH and are never editable here.
 */
export default function ProductDialog({
  sku,
  canManage,
  onClose,
}: {
  sku: string | null;
  canManage: boolean;
  onClose: () => void;
}) {
  const product = useProduct(sku);

  return (
    <Dialog
      open={sku !== null}
      onOpenChange={(open) => !open && onClose()}
      isForm={canManage}
      wide
      title={product.data ? product.data.description : "Producto"}
      description={sku ? `SKU ${sku}` : undefined}
    >
      {product.isPending ? (
        <div className="h-64 animate-pulse rounded-lg bg-canvas-subtle" aria-busy="true" aria-label="Cargando producto" />
      ) : product.isError ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage(product.error)}
        </p>
      ) : canManage ? (
        <ProductForm product={product.data} onClose={onClose} />
      ) : (
        <ProductReadOnly product={product.data} />
      )}
    </Dialog>
  );
}

function StateLine({ product }: { product: CommercialProduct }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {product.is_active ? <Badge tone="success">Activo</Badge> : <Badge>Inactivo</Badge>}
      {product.commercial_supplier_code && (
        <span className="text-text-secondary">
          Proveedor comercial <span className="font-mono text-text-primary">{product.commercial_supplier_code}</span>
        </span>
      )}
    </div>
  );
}

function Traceability({ product }: { product: CommercialProduct }) {
  if (!product.margin_source && !product.margin_updated_by) return <p className="text-xs text-text-secondary">Los márgenes aún no se han cargado.</p>;
  return (
    <p className="text-xs text-text-secondary">
      Márgenes por {product.margin_source ? MARGIN_SOURCE_LABELS[product.margin_source].toLowerCase() : "origen desconocido"}
      {product.margin_updated_by ? `, ${product.margin_updated_by}` : ""}
      {product.margin_updated_at ? `, ${dateTime.format(new Date(product.margin_updated_at))}` : ""}.
    </p>
  );
}

function ProductReadOnly({ product }: { product: CommercialProduct }) {
  const rows: [string, string | null][] = [
    ["SKU del proveedor", product.supplier_sku],
    ["Fabricante", product.manufacturer],
    ["Marca", product.brand],
    ["Categoría", product.category],
    ["Subcategoría", product.subcategory],
    ["Línea", product.product_line],
    ["Sublínea", product.product_subline],
    ["Grupo", product.product_group],
    ["Unidad de inventario", product.inventory_unit],
    ["Código de barras", product.main_barcode],
  ];
  return (
    <div className="space-y-5 text-sm">
      <StateLine product={product} />
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-text-secondary">{label}</dt>
            <dd className="font-medium">{value ?? "—"}</dd>
          </div>
        ))}
      </dl>
      <section className="space-y-2">
        <h3 className="font-semibold">Márgenes</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          {MARGIN_FIELDS.map((field) => (
            <div key={field}>
              <dt className="text-xs text-text-secondary">{MARGIN_LABELS[field]}</dt>
              <dd className="font-medium tabular-nums">{formatMargin(product[field])}</dd>
            </div>
          ))}
        </dl>
        {product.margin_notes && <p className="max-w-prose text-text-secondary">{product.margin_notes}</p>}
        <Traceability product={product} />
      </section>
      {toNumber(product.liquor_tax) ? (
        <p>
          <Badge tone="warning">Impuesto al consumo</Badge>{" "}
          <span className="text-text-secondary tabular-nums">
            Nacional {product.liquor_tax}
            {toNumber(product.liquor_tax_coast) ? ` · Costa ${product.liquor_tax_coast}` : ""}
          </span>
        </p>
      ) : null}
    </div>
  );
}

type Values = Record<TextKey | NumberKey | MarginField | "margin_notes" | "liquor_tax_group", string>;

function initialValues(product: CommercialProduct): Values {
  const text = (value: string | null) => value ?? "";
  const number = (value: Decimal | null) => (toNumber(value) === null ? "" : String(toNumber(value)).replace(".", ","));
  return {
    description: product.description,
    supplier_sku: text(product.supplier_sku),
    manufacturer: text(product.manufacturer),
    brand: text(product.brand),
    category: text(product.category),
    subcategory: text(product.subcategory),
    product_line: text(product.product_line),
    product_subline: text(product.product_subline),
    product_group: text(product.product_group),
    inventory_unit: text(product.inventory_unit),
    main_barcode: text(product.main_barcode),
    pack_factor: number(product.pack_factor),
    liquor_tax: number(product.liquor_tax),
    liquor_tax_coast: number(product.liquor_tax_coast),
    liquor_tax_group: text(product.liquor_tax_group),
    margin_list: fractionToPercentInput(product.margin_list),
    margin_wholesale: fractionToPercentInput(product.margin_wholesale),
    margin_mass_food: fractionToPercentInput(product.margin_mass_food),
    margin_market: fractionToPercentInput(product.margin_market),
    margin_employee: fractionToPercentInput(product.margin_employee),
    margin_notes: text(product.margin_notes),
  };
}

/** A non-negative number typed with a comma or a point; empty clears it. */
function parseNumber(text: string): number | null | "invalid" {
  const clean = text.trim().replace(",", ".");
  if (clean === "") return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : "invalid";
}

function failureMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 403) return "Tu usuario puede consultar los productos, pero no modificarlos.";
  return errorMessage(error);
}

function ProductForm({ product, onClose }: { product: CommercialProduct; onClose: () => void }) {
  const id = useId();
  const initial = initialValues(product);
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const update = useUpdateProduct();

  const set = (key: keyof Values, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found: Partial<Record<keyof Values, string>> = {};
    const patch: Record<string, unknown> = {};

    for (const { key, ...rest } of TEXT_FIELDS) {
      const next = values[key].trim();
      if ("required" in rest && next === "") found[key] = "La descripción no puede quedar vacía.";
      else if (next !== initial[key].trim()) patch[key] = next === "" ? null : next;
    }
    for (const { key, label } of NUMBER_FIELDS) {
      if (values[key] === initial[key]) continue;
      const parsed = parseNumber(values[key]);
      if (parsed === "invalid") found[key] = `${label}: escribe un número igual o mayor que 0.`;
      else patch[key] = parsed;
    }
    for (const field of MARGIN_FIELDS) {
      if (values[field] === initial[field]) continue;
      const fraction = percentInputToFraction(values[field]);
      if (fraction === "invalid") found[field] = "Escribe un porcentaje mayor que 0 y menor que 100.";
      else if (!sameMargin(fraction, product[field])) patch[field] = fraction;
    }
    for (const key of ["margin_notes", "liquor_tax_group"] as const) {
      const next = values[key].trim();
      if (next !== initial[key].trim()) patch[key] = next === "" ? null : next;
    }

    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    update.mutate(
      { sku: product.sku, patch: patch as ProductPatch },
      {
        onSuccess: () => {
          toast.success(`Producto ${product.sku} actualizado.`);
          onClose();
        },
      }
    );
  };

  const text = (key: TextKey, label: string, max: number) => (
    <Field key={key} label={label} htmlFor={`${id}-${key}`} error={errors[key]}>
      <Input
        id={`${id}-${key}`}
        value={values[key]}
        maxLength={max}
        aria-invalid={errors[key] ? true : undefined}
        onChange={(event) => set(key, event.target.value)}
      />
    </Field>
  );

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <StateLine product={product} />
        <p className="rounded-md bg-canvas-subtle px-3 py-2 text-sm text-text-secondary">
          La descripción, la marca, la categoría y lo demás que viene del DWH se sobrescribe en la próxima sincronización. Los
          márgenes, las notas y el impuesto al licor no.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Datos del producto</h3>
        <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
          {TEXT_FIELDS.map(({ key, label, max }) => text(key, label, max))}
          <Field label="Factor de empaque" htmlFor={`${id}-pack_factor`} error={errors.pack_factor}>
            <Input
              id={`${id}-pack_factor`}
              inputMode="decimal"
              value={values.pack_factor}
              aria-invalid={errors.pack_factor ? true : undefined}
              onChange={(event) => set("pack_factor", event.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Márgenes</h3>
          <p className="text-[13px] text-text-secondary">En porcentaje, por ejemplo 18 o 18,5. Vacío quita el margen.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
          {MARGIN_FIELDS.map((field) => (
            <Field key={field} label={`${MARGIN_LABELS[field]} (%)`} htmlFor={`${id}-${field}`} error={errors[field]}>
              <Input
                id={`${id}-${field}`}
                inputMode="decimal"
                value={values[field]}
                aria-invalid={errors[field] ? true : undefined}
                onChange={(event) => set(field, event.target.value)}
              />
            </Field>
          ))}
        </div>
        <Field label="Notas del margen" htmlFor={`${id}-margin_notes`} optional>
          <Textarea id={`${id}-margin_notes`} rows={2} maxLength={1000} value={values.margin_notes} onChange={(event) => set("margin_notes", event.target.value)} />
        </Field>
        <Traceability product={product} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Impuesto al licor</h3>
        <div className="grid gap-x-4 gap-y-4 sm:grid-cols-3">
          {NUMBER_FIELDS.filter((field) => field.key !== "pack_factor").map(({ key, label }) => (
            <Field key={key} label={label} htmlFor={`${id}-${key}`} error={errors[key]}>
              <Input
                id={`${id}-${key}`}
                inputMode="decimal"
                value={values[key]}
                aria-invalid={errors[key] ? true : undefined}
                onChange={(event) => set(key, event.target.value)}
              />
            </Field>
          ))}
          <Field label="Grupo de impuesto" htmlFor={`${id}-liquor_tax_group`}>
            <Input id={`${id}-liquor_tax_group`} maxLength={20} value={values.liquor_tax_group} onChange={(event) => set("liquor_tax_group", event.target.value)} />
          </Field>
        </div>
      </section>

      <DialogError message={update.isError ? failureMessage(update.error) : null} />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={update.isPending}>
          Guardar cambios
        </Button>
      </DialogFooter>
    </form>
  );
}
