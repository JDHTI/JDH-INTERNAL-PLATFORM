"use client";

import { useEffect, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, Plus } from "lucide-react";

import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import { searchPqrsfProducts } from "../services/pqrsf-public.service";
import type {
  PickupOrderAnswer,
  PqrsfProductLine,
  PqrsfProductOption,
} from "../types/pqrsf-public.types";
import { FormField, describedBy } from "./form-field";

export const MAX_PRODUCT_LINES = 20;
export const PICKUP_ORDER_NUMBER_LIMIT = 40;
const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 350;

export type ProductLineField =
  | "invoice_number"
  | "sku"
  | "lot"
  | "expiry_date"
  | "affected_quantity";
export type ProductLineErrors = Partial<Record<ProductLineField, string>>;

export function emptyProductLine(): PqrsfProductLine {
  return {
    key: crypto.randomUUID(),
    invoice_number: "",
    product: null,
    lot: "",
    expiry_date: "",
    affected_quantity: "",
  };
}

const PICKUP_OPTIONS: { value: PickupOrderAnswer; label: string }[] = [
  { value: "yes", label: "Sí" },
  { value: "no", label: "No" },
  { value: "unknown", label: "No sé" },
];

/**
 * The products a complaint or claim is about. Each line is what Quality needs
 * to trace it with the supplier: the invoice it came in, the JDH reference, the
 * lot, its expiry date and how many units are affected (not how many were
 * billed). The supplier is resolved on the server; the public search never
 * sends it.
 */
export default function ProductLinesField({
  lines,
  required,
  error,
  lineErrors,
  pickupOrder,
  pickupOrderNumber,
  pickupOrderError,
  pickupOrderNumberError,
  deliveryDate,
  deliveryDateError,
  maxDeliveryDate,
  onLinesChange,
  onPickupOrderChange,
  onPickupOrderNumberChange,
  onDeliveryDateChange,
}: {
  lines: PqrsfProductLine[];
  required: boolean;
  error?: string;
  lineErrors: Record<string, ProductLineErrors>;
  pickupOrder: PickupOrderAnswer | "";
  pickupOrderNumber: string;
  pickupOrderError?: string;
  pickupOrderNumberError?: string;
  /** AAAA-MM-DD: when the order with these products was delivered. */
  deliveryDate: string;
  deliveryDateError?: string;
  /** Today in AAAA-MM-DD: a delivery is never in the future. */
  maxDeliveryDate: string;
  onLinesChange: (lines: PqrsfProductLine[]) => void;
  onPickupOrderChange: (value: PickupOrderAnswer) => void;
  onPickupOrderNumberChange: (value: string) => void;
  onDeliveryDateChange: (value: string) => void;
}) {
  const update = (key: string, patch: Partial<PqrsfProductLine>) =>
    onLinesChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const remove = (key: string) => onLinesChange(lines.filter((line) => line.key !== key));

  const add = () => onLinesChange([...lines, emptyProductLine()]);

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:col-span-2">
      <section
        id="pqrsf-products"
        tabIndex={-1}
        aria-labelledby="pqrsf-products-title"
        aria-describedby={describedBy("pqrsf-products", true, Boolean(error))}
        className="flex flex-col gap-3 outline-none"
      >
        <div className="space-y-0.5">
          <h2 id="pqrsf-products-title" className="text-[13px] font-medium leading-[1.4]">
            Productos afectados
            {required ? (
              <span className="ml-0.5 text-danger" aria-hidden="true">*</span>
            ) : (
              <span className="font-normal text-text-secondary"> (opcional)</span>
            )}
          </h2>
          <p id="pqrsf-products-hint" className="text-[13px] text-text-secondary">
            {required
              ? "Agrega al menos un producto. Los datos están en la factura y en el empaque."
              : "Si la novedad es con un producto, agrégalo. Los datos están en la factura y en el empaque."}
          </p>
        </div>

        {lines.length > 0 && (
          <ol className="flex flex-col gap-3">
            {lines.map((line, index) => (
              <ProductLineRow
                key={line.key}
                line={line}
                position={index + 1}
                errors={lineErrors[line.key] ?? {}}
                onChange={(patch) => update(line.key, patch)}
                onRemove={() => remove(line.key)}
              />
            ))}
          </ol>
        )}

        {error && (
          <p id="pqrsf-products-error" className="text-[13px] text-danger">
            {error}
          </p>
        )}

        {lines.length < MAX_PRODUCT_LINES ? (
          <Button
            type="button"
            variant="outline"
            onClick={add}
            className="h-11 self-start sm:h-9"
          >
            <Plus aria-hidden="true" />
            {lines.length === 0 ? "Agregar producto" : "Agregar otro producto"}
          </Button>
        ) : (
          <p className="text-[13px] text-text-secondary">
            Llegaste al máximo de {MAX_PRODUCT_LINES} productos por solicitud.
          </p>
        )}
      </section>

      {lines.length > 0 && (
        <FormField
          id="pqrsf-delivery-date"
          label="Fecha de entrega del pedido"
          hint="El día que recibiste el pedido con estos productos."
          error={deliveryDateError}
          className="sm:max-w-xs"
        >
          <Input
            id="pqrsf-delivery-date"
            name="delivery_date"
            type="date"
            aria-required="true"
            max={maxDeliveryDate}
            value={deliveryDate}
            aria-invalid={Boolean(deliveryDateError)}
            aria-describedby={describedBy("pqrsf-delivery-date", true, Boolean(deliveryDateError))}
            onChange={(event) => onDeliveryDateChange(event.target.value)}
            className={cn("min-h-11 sm:min-h-9", deliveryDateError && "border-danger")}
          />
        </FormField>
      )}

      {lines.length > 0 && (
        <fieldset
          role="radiogroup"
          aria-labelledby="pqrsf-pickup-order-legend"
          aria-describedby={describedBy("pqrsf-pickup-order-requested", false, Boolean(pickupOrderError))}
          aria-required="true"
          aria-invalid={Boolean(pickupOrderError) || undefined}
          className="flex flex-col gap-1.5"
        >
          <legend id="pqrsf-pickup-order-legend" className="mb-1.5 text-[13px] font-medium leading-[1.4]">
            ¿Ya solicitaste la orden de recogida?
            <span className="ml-0.5 text-danger" aria-hidden="true">*</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {PICKUP_OPTIONS.map((option, index) => {
              const checked = pickupOrder === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm sm:min-h-9",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring-control",
                    checked ? "border-primary bg-primary-subtle font-medium" : "border-border-control hover:bg-canvas-subtle",
                    pickupOrderError && !checked && "border-danger"
                  )}
                >
                  <input
                    id={index === 0 ? "pqrsf-pickup-order-requested" : undefined}
                    type="radio"
                    name="pickup_order_requested"
                    value={option.value}
                    checked={checked}
                    onChange={() => onPickupOrderChange(option.value)}
                    className="size-4 shrink-0 accent-[var(--primary)] focus-visible:outline-none"
                  />
                  {option.label}
                </label>
              );
            })}
          </div>
          {pickupOrderError && (
            <p id="pqrsf-pickup-order-requested-error" className="text-[13px] text-danger">
              {pickupOrderError}
            </p>
          )}
        </fieldset>
      )}

      {lines.length > 0 && pickupOrder === "yes" && (
        <FormField
          id="pqrsf-pickup-order-number"
          label="Número de la orden de recogida"
          optional
          hint="Si lo tienes a mano. Nos ayuda a encontrarla más rápido."
          error={pickupOrderNumberError}
          className="sm:max-w-xs"
        >
          <Input
            id="pqrsf-pickup-order-number"
            name="pickup_order_number"
            value={pickupOrderNumber}
            maxLength={PICKUP_ORDER_NUMBER_LIMIT}
            aria-invalid={Boolean(pickupOrderNumberError)}
            aria-describedby={describedBy("pqrsf-pickup-order-number", true, Boolean(pickupOrderNumberError))}
            onChange={(event) => onPickupOrderNumberChange(event.target.value)}
            className={cn("min-h-11 sm:min-h-9", pickupOrderNumberError && "border-danger")}
          />
        </FormField>
      )}
    </div>
  );
}

function ProductLineRow({
  line,
  position,
  errors,
  onChange,
  onRemove,
}: {
  line: PqrsfProductLine;
  position: number;
  errors: ProductLineErrors;
  onChange: (patch: Partial<PqrsfProductLine>) => void;
  onRemove: () => void;
}) {
  const prefix = `pqrsf-product-${position}`;

  return (
    <li
      aria-label={`Producto ${position}`}
      className="flex flex-col gap-4 rounded-lg border border-border p-3 md:p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Producto {position}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={`Quitar producto ${position}`}
          className="h-11 sm:h-8"
        >
          Quitar
        </Button>
      </div>

      <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
        <FormField
          id={`${prefix}-sku`}
          label="Referencia o nombre del producto"
          error={errors.sku}
          className="sm:col-span-2"
        >
          <ProductSearch
            id={`${prefix}-sku`}
            value={line.product}
            invalid={Boolean(errors.sku)}
            onChange={(product) => onChange({ product })}
          />
        </FormField>

        <FormField id={`${prefix}-invoice`} label="Número de factura" error={errors.invoice_number}>
          <Input
            id={`${prefix}-invoice`}
            value={line.invoice_number}
            maxLength={40}
            aria-invalid={Boolean(errors.invoice_number)}
            aria-describedby={describedBy(`${prefix}-invoice`, false, Boolean(errors.invoice_number))}
            onChange={(event) => onChange({ invoice_number: event.target.value })}
            className={cn("min-h-11 sm:min-h-9", errors.invoice_number && "border-danger")}
          />
        </FormField>

        <FormField id={`${prefix}-lot`} label="Lote" error={errors.lot}>
          <Input
            id={`${prefix}-lot`}
            value={line.lot}
            maxLength={60}
            aria-invalid={Boolean(errors.lot)}
            aria-describedby={describedBy(`${prefix}-lot`, false, Boolean(errors.lot))}
            onChange={(event) => onChange({ lot: event.target.value })}
            className={cn("min-h-11 sm:min-h-9", errors.lot && "border-danger")}
          />
        </FormField>

        <FormField id={`${prefix}-expiry`} label="Fecha de vencimiento" error={errors.expiry_date}>
          <Input
            id={`${prefix}-expiry`}
            type="date"
            value={line.expiry_date}
            aria-invalid={Boolean(errors.expiry_date)}
            aria-describedby={describedBy(`${prefix}-expiry`, false, Boolean(errors.expiry_date))}
            onChange={(event) => onChange({ expiry_date: event.target.value })}
            className={cn("min-h-11 sm:min-h-9", errors.expiry_date && "border-danger")}
          />
        </FormField>

        <FormField
          id={`${prefix}-quantity`}
          label="Cantidad afectada"
          hint="Unidades con la novedad, no las facturadas."
          error={errors.affected_quantity}
        >
          <Input
            id={`${prefix}-quantity`}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={line.affected_quantity}
            aria-invalid={Boolean(errors.affected_quantity)}
            aria-describedby={describedBy(`${prefix}-quantity`, true, Boolean(errors.affected_quantity))}
            onChange={(event) => onChange({ affected_quantity: event.target.value })}
            className={cn("tabular min-h-11 sm:min-h-9", errors.affected_quantity && "border-danger")}
          />
        </FormField>
      </div>
    </li>
  );
}

interface SearchResult {
  term: string;
  products: PqrsfProductOption[];
  error: string | null;
}

/**
 * Looks the reference up in the product master as the person types. The
 * results only say the reference and its name: the supplier stays on the
 * server. Typing over a chosen product drops it, so what is sent is always a
 * reference the master returned.
 */
function ProductSearch({
  id,
  value,
  invalid,
  onChange,
}: {
  id: string;
  value: PqrsfProductOption | null;
  invalid: boolean;
  onChange: (product: PqrsfProductOption | null) => void;
}) {
  const [query, setQuery] = useState(value?.sku ?? "");
  const [result, setResult] = useState<SearchResult | null>(null);
  const term = query.trim();
  const isChosen = value !== null && term === value.sku;

  useEffect(() => {
    if (isChosen || term.length < MIN_SEARCH_LENGTH) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchPqrsfProducts(term, controller.signal).then(
        (products) => setResult({ term, products, error: null }),
        (error: unknown) => {
          if (!controller.signal.aborted) setResult({ term, products: [], error: errorMessage(error) });
        }
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, isChosen]);

  const isCurrent = result?.term === term;
  const items = isCurrent && !result.error ? result.products : [];
  const message =
    term.length < MIN_SEARCH_LENGTH
      ? "Escribe al menos 2 caracteres de la referencia o del nombre."
      : !isCurrent
        ? "Buscando…"
        : result.error
          ? result.error
          : `No encontramos productos con «${term}». Revisa la referencia en la factura.`;

  return (
    <>
      <Combobox.Root
        items={items}
        filter={null}
        value={value}
        onValueChange={(next) => onChange(next ?? null)}
        inputValue={query}
        onInputValueChange={(next) => {
          setQuery(next);
          if (value && next.trim() !== value.sku) onChange(null);
        }}
        itemToStringLabel={(option) => option?.sku ?? ""}
        itemToStringValue={(option) => option?.sku ?? ""}
        isItemEqualToValue={(option, selected) => option?.sku === selected?.sku}
        autoHighlight
      >
        <Combobox.InputGroup
          className={cn(
            "relative flex h-11 w-full items-center rounded-md border border-border-control bg-transparent transition-colors sm:h-9",
            "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring-control",
            invalid && "border-danger"
          )}
        >
          <Combobox.Input
            id={id}
            placeholder="Ej.: referencia JDH o parte del nombre"
            autoComplete="off"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy(id, Boolean(value), invalid)}
            className="min-w-0 flex-1 bg-transparent px-2.5 py-1 text-sm text-text-primary outline-none placeholder:text-text-secondary"
          />
        </Combobox.InputGroup>

        <Combobox.Portal>
          <Combobox.Positioner className="z-50 outline-none" sideOffset={4}>
            <Combobox.Popup className="w-(--anchor-width) max-w-(--available-width) overflow-hidden rounded-md border border-border-control bg-surface text-text-primary shadow-lg outline-none">
              <Combobox.Empty className="px-3 py-3 text-sm text-text-secondary">
                {message}
              </Combobox.Empty>
              <Combobox.List className="max-h-64 overflow-y-auto p-1 outline-none">
                {(option: PqrsfProductOption) => (
                  <Combobox.Item
                    key={option.sku}
                    value={option}
                    className="grid min-h-11 cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-canvas-subtle sm:min-h-9"
                  >
                    <Combobox.ItemIndicator className="col-start-1">
                      <Check className="size-4" aria-hidden="true" />
                    </Combobox.ItemIndicator>
                    <span className="col-start-2 min-w-0">
                      <span className="block font-mono text-[13px]">{option.sku}</span>
                      {option.description && (
                        <span className="block break-words text-[13px] text-text-secondary">
                          {option.description}
                        </span>
                      )}
                    </span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {value && (
        <p id={`${id}-hint`} className="text-[13px] text-text-secondary">
          {value.description ?? "Referencia encontrada en el maestro de productos."}
        </p>
      )}
    </>
  );
}
