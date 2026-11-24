"use client";

import { useId, useState } from "react";

import { formatCop } from "@/features/supports/lib/format";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Field } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useUpdateRequestLine } from "../hooks/use-increase-requests";
import { amountInput, parseAmount, parsePercent, percentInput } from "../lib/format";
import { regionalLabel, regionalList } from "../lib/regionals";
import { OBSERVATIONS, REST, type RequestLine } from "../types/increase-requests.types";
import PercentInput from "./percent-input";

/**
 * Corrects one line of a request in review: what the supplier sent can be
 * fixed before approving. The regional is not edited here; the API
 * recalculates the taxed costs, the change and its status.
 */
export default function LineEditDialog({ requestId, line, onClose }: { requestId: string; line: RequestLine | null; onClose: () => void }) {
  return (
    <Dialog
      open={line !== null}
      onOpenChange={(next) => !next && onClose()}
      isForm
      title={line ? `Corregir ${line.sku} · ${regionalLabel(line.regional)}` : "Corregir línea"}
      description={line?.description ?? undefined}
    >
      {line && <LineForm key={line.id} requestId={requestId} line={line} onClose={onClose} />}
    </Dialog>
  );
}

function LineForm({ requestId, line, onClose }: { requestId: string; line: RequestLine; onClose: () => void }) {
  const id = useId();
  const [newCost, setNewCost] = useState(amountInput(line.new_cost));
  const [increasedOn, setIncreasedOn] = useState(line.increased_on ?? "");
  const [discount, setDiscount] = useState(percentInput(line.regular_discount_pct));
  const [publicPrice, setPublicPrice] = useState(amountInput(line.public_price));
  const [observation, setObservation] = useState(line.observation ?? "");
  const [touched, setTouched] = useState(false);
  const save = useUpdateRequestLine();

  const costError = parseAmount(newCost) === null ? "Escribe el costo nuevo sin impuesto saludable." : null;
  const dateError = increasedOn === "" ? "Elige la fecha del incremento." : null;
  const discountError = parsePercent(discount) === undefined ? "Escribe un porcentaje de 0 a 100, con coma para los decimales: 2,5." : null;
  const priceError = publicPrice.trim() !== "" && parseAmount(publicPrice) === null ? "Escribe un PVP mayor que cero, o déjalo vacío." : null;
  // The line's own observation stays a choice even if it is not one of the list's.
  const options = [
    { value: "", label: "Sin observación" },
    ...[...new Set([...OBSERVATIONS, ...(line.observation ? [line.observation] : [])])].map((value) => ({ value, label: value.replace(/_/g, " ") })),
  ];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (costError || dateError || discountError || priceError) return;
    save.mutate(
      {
        id: requestId,
        lineId: line.id,
        patch: {
          new_cost: parseAmount(newCost)!,
          increased_on: increasedOn,
          regular_discount_pct: parsePercent(discount) ?? null,
          public_price: publicPrice.trim() === "" ? null : parseAmount(publicPrice),
          observation: observation || null,
        },
      },
      { onSuccess: onClose }
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-[13px] tabular-nums text-text-secondary">
        Costo anterior {formatCop(line.old_cost)} · con impuesto saludable {formatCop(line.old_cost_with_tax)}
        {line.regional === REST && line.regionals.length > 0 && <> · Resto de regionales: {regionalList(line.regionals)}</>}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Costo nuevo sin impuesto saludable" htmlFor={`${id}-cost`} error={touched ? costError : null}>
          <Input
            id={`${id}-cost`}
            value={newCost}
            inputMode="decimal"
            onChange={(event) => setNewCost(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={(touched && costError !== null) || undefined}
            className="tabular-nums"
          />
        </Field>
        <Field label="Fecha del incremento" htmlFor={`${id}-date`} error={touched ? dateError : null}>
          <Input id={`${id}-date`} type="date" value={increasedOn} onChange={(event) => setIncreasedOn(event.target.value)} className="tabular-nums" />
        </Field>
        <Field label="Descuento regular" htmlFor={`${id}-discount`} optional error={discountError}>
          <PercentInput id={`${id}-discount`} value={discount} onChange={setDiscount} />
        </Field>
        <Field label="PVP sin IVA" htmlFor={`${id}-pvp`} optional error={touched ? priceError : null}>
          <Input
            id={`${id}-pvp`}
            value={publicPrice}
            inputMode="decimal"
            onChange={(event) => setPublicPrice(event.target.value)}
            aria-invalid={(touched && priceError !== null) || undefined}
            className="tabular-nums"
          />
        </Field>
        <div className="min-w-0 space-y-1.5 sm:col-span-2">
          <span id={`${id}-obs`} className="block text-[13px] font-medium">
            Observación
          </span>
          <Dropdown value={observation} options={options} onValueChange={setObservation} aria-labelledby={`${id}-obs`} />
        </div>
      </div>
      <DialogError message={save.isError ? errorMessage(save.error) : null} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar corrección"}
        </Button>
      </DialogFooter>
    </form>
  );
}
