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
import { amountInput, parseAmount, percentInput } from "../lib/format";
import { OBSERVATIONS, REGIONALS, type Regional, type RequestLine } from "../types/increase-requests.types";
import DiscountFields, { discountsPayload, type DiscountDraft } from "./discount-fields";

/**
 * Corrects one line of a request in review: what the supplier sent can be
 * fixed before approving. The API recalculates the taxed costs, the change and
 * its status.
 */
export default function LineEditDialog({ requestId, line, onClose }: { requestId: string; line: RequestLine | null; onClose: () => void }) {
  return (
    <Dialog
      open={line !== null}
      onOpenChange={(next) => !next && onClose()}
      isForm
      title={line ? `Corregir ${line.sku}` : "Corregir línea"}
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
  const [observation, setObservation] = useState(line.observation ?? "");
  const [discounts, setDiscounts] = useState<DiscountDraft>({
    regular: percentInput(line.regular_discount_pct),
    regionals: Object.fromEntries(REGIONALS.map((regional) => [regional, percentInput(line.regional_discounts[regional])])) as Record<Regional, string>,
  });
  const [touched, setTouched] = useState(false);
  const save = useUpdateRequestLine();

  const costError = parseAmount(newCost) === null ? "Escribe el costo nuevo sin impuesto saludable." : null;
  const dateError = increasedOn === "" ? "Elige la fecha del incremento." : null;
  const payload = discountsPayload(discounts);
  // The line's own observation stays a choice even if it is not one of the list's.
  const options = [
    { value: "", label: "Sin observación" },
    ...[...new Set([...OBSERVATIONS, ...(line.observation ? [line.observation] : [])])].map((value) => ({ value, label: value.replace(/_/g, " ") })),
  ];

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (costError || dateError || payload === null) return;
    save.mutate(
      {
        id: requestId,
        lineId: line.id,
        patch: { new_cost: parseAmount(newCost)!, increased_on: increasedOn, ...payload, observation: observation || null },
      },
      { onSuccess: onClose }
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-[13px] tabular-nums text-text-secondary">
        Costo anterior {formatCop(line.old_cost)} · con impuesto saludable {formatCop(line.old_cost_with_tax)}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
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
        <div className="min-w-0 space-y-1.5">
          <span id={`${id}-obs`} className="block text-[13px] font-medium">
            Observación
          </span>
          <Dropdown value={observation} options={options} onValueChange={setObservation} aria-labelledby={`${id}-obs`} />
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Descuentos</legend>
        <DiscountFields value={discounts} onChange={setDiscounts} />
      </fieldset>
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
