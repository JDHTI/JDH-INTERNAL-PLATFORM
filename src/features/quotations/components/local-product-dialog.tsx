"use client";

import { useId, useState } from "react";
import { Loader2, PackageOpen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useAddLocalLine } from "../hooks/use-quotations";
import { formatMoney, parsePriceInput } from "../lib/format";
import type { LocalLineInput, LocalVat, Quotation } from "../types/quotations.types";

const VATS: LocalVat[] = [19, 5, 0];
const MAX_TEXT = 120;

interface Draft {
  description: string;
  supplier: string;
  price: string;
  vat: LocalVat;
}

const EMPTY: Draft = { description: "", supplier: "", price: "", vat: 19 };

type Errors = Partial<Record<"description" | "price", string>>;

function validate(draft: Draft): { errors: Errors; price: string | null } {
  const errors: Errors = {};
  if (draft.description.trim() === "") errors.description = "Escribe qué producto es, como lo vería el cliente.";
  const parsed = parsePriceInput(draft.price);
  let price: string | null = null;
  if ("error" in parsed) errors.price = parsed.error;
  else if (parsed.value === null || Number(parsed.value) <= 0) errors.price = "Escribe el precio estimado, en pesos enteros sin IVA.";
  else price = parsed.value;
  return { errors, price };
}

/**
 * A product the customer asks for that is not in the portfolio: the advisor
 * describes it and quotes it at an estimated price. The API marks it "solo
 * cotización" with its own reference; it lives only in this quotation, has no
 * cost or rule and never reaches SIESA. A form modal: it does not close on an
 * outside click (§7.4).
 */
export default function LocalProductDialog({
  quotation,
  open,
  onOpenChange,
  onCreated,
}: {
  quotation: Quotation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The new line's reference, to show it in the table. */
  onCreated: (sku: string) => void;
}) {
  const id = useId();
  const add = useAddLocalLine(quotation.id);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const close = (next: boolean) => {
    if (!next) {
      setDraft(EMPTY);
      setErrors({});
      setFailure(null);
    }
    onOpenChange(next);
  };

  const parsedPrice = parsePriceInput(draft.price);
  const preview = "value" in parsedPrice && parsedPrice.value !== null ? Math.round(Number(parsedPrice.value) * (1 + draft.vat / 100)) : null;

  const send = (input: LocalLineInput, name: string) => {
    setFailure(null);
    const before = new Set(quotation.lines.map((line) => line.sku));
    add.mutate(
      { version: quotation.version, input },
      {
        onSuccess: (updated) => {
          const created = updated.lines.find((line) => line.origin === "local" && !before.has(line.sku));
          toast.success(`${name} quedó en la cotización como producto solo para cotizar.`);
          close(false);
          if (created) onCreated(created.sku);
        },
        onError: (error) => setFailure(errorMessage(error)),
      }
    );
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const { errors: found, price } = validate(draft);
    setErrors(found);
    if (price === null || Object.keys(found).length > 0) return;
    send({ description: draft.description.trim(), supplier_name: draft.supplier.trim() || null, price, vat_pct: draft.vat }, draft.description.trim());
  };

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      isForm
      wide={false}
      title="Crear producto para cotizar"
      description="Para una referencia que no existe en el portafolio. Queda marcada como «Solo cotización» y vive solo en esta cotización: no tiene costo ni margen objetivo y no sale en el Excel ni en el plano de SIESA."
    >
      <form noValidate onSubmit={submit} className="space-y-4">
        <Field label="Descripción" htmlFor={`${id}-description`} error={errors.description}>
          <Input
            id={`${id}-description`}
            value={draft.description}
            maxLength={MAX_TEXT}
            onChange={(event) => set("description", event.target.value)}
            onBlur={() => draft.description !== "" && setErrors((current) => ({ ...current, description: validate(draft).errors.description }))}
            placeholder="Ej.: Aceite de oliva 500 ml"
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? `${id}-description-error` : undefined}
            className="max-md:h-11"
          />
        </Field>

        <Field label="Proveedor" htmlFor={`${id}-supplier`} optional>
          <Input
            id={`${id}-supplier`}
            value={draft.supplier}
            maxLength={MAX_TEXT}
            onChange={(event) => set("supplier", event.target.value)}
            className="max-md:h-11"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Precio estimado sin IVA"
            htmlFor={`${id}-price`}
            error={errors.price}
            hint={preview !== null ? `Con IVA: ${formatMoney(preview)}` : "En pesos enteros, por unidad."}
          >
            <Input
              id={`${id}-price`}
              inputMode="numeric"
              autoComplete="off"
              value={draft.price}
              onChange={(event) => set("price", event.target.value)}
              onBlur={() => draft.price !== "" && setErrors((current) => ({ ...current, price: validate(draft).errors.price }))}
              aria-invalid={errors.price ? true : undefined}
              aria-describedby={errors.price ? `${id}-price-error` : `${id}-price-hint`}
              className="text-right tabular-nums max-md:h-11"
            />
          </Field>

          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-[13px] font-medium">IVA</legend>
            <div className="flex gap-2">
              {VATS.map((vat) => (
                <label
                  key={vat}
                  className={cn(
                    "inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm tabular-nums max-md:min-h-11",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                    draft.vat === vat ? "border-primary bg-primary-subtle font-medium" : "border-border-control hover:bg-canvas-subtle"
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-vat`}
                    value={vat}
                    checked={draft.vat === vat}
                    onChange={() => set("vat", vat)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  {vat} %
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <DialogError message={failure} />
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} className="max-md:h-11">Cancelar</Button>
          <Button type="submit" disabled={add.isPending} className="max-md:h-11">
            {add.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <PackageOpen aria-hidden="true" />}
            Crear producto
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
