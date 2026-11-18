"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { parseMarginInput } from "@/features/quotations/lib/format";
import BasePicker, { CUSTOMER_PICKER, PRODUCT_PICKER } from "@/shared/components/pickers/base-picker";
import { Alert } from "@/shared/components/ui/alert";
import type { AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { errorMessage } from "@/shared/lib/api-client";

import { useCreateDirectRequest, useTargetMargins } from "../hooks/use-internal-requests";
import { formatPct } from "../lib/format";
import { todayInBogota } from "../lib/internal-requests";

const th = "px-3 py-2.5 text-left text-xs font-semibold text-text-secondary";
const td = "px-3 py-2.5 align-top";

/**
 * Asks BI for an authorized margin by customer and reference, with no quotation
 * behind it (it used to be a JDH % on an existing support). Each margin must be
 * lower than the reference's current one, the product's on the customer's list;
 * the references go together only when they are of one supplier.
 */
export default function MarginRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Pedir margen autorizado"
      description="Para un cliente y una o varias referencias de un mismo proveedor. BI decide si lo registra como apoyo o si vale solo para el pedido."
      wide
      isForm
    >
      {open && <RequestForm onDone={onClose} />}
    </Dialog>
  );
}

function RequestForm({ onDone }: { onDone: () => void }) {
  const mutation = useCreateDirectRequest();
  const [customer, setCustomer] = useState<AutocompleteOption | null>(null);
  const [products, setProducts] = useState<AutocompleteOption[]>([]);
  // A fresh picker after each pick, so it is ready for the next reference.
  const [pickerKey, setPickerKey] = useState(0);
  const [margins, setMargins] = useState<Record<string, string>>({});
  const [requestedFor, setRequestedFor] = useState(todayInBogota());
  const [agreedWith, setAgreedWith] = useState("");
  const [reason, setReason] = useState("");

  const skus = products.map((product) => product.value);
  const targets = useTargetMargins(customer?.value ?? null, skus);
  const found = targets.data?.items ?? [];
  const targetOf = (sku: string) => found.find((item) => item.sku === sku);
  const suppliers = new Set(found.map((item) => item.supplier_code).filter(Boolean));
  const parsed = found.map((item) => ({ item, result: parseMarginInput(margins[item.sku] ?? "") }));
  const bad = parsed.find(({ result }) => "error" in result);
  const notLower = parsed.find(
    ({ item, result }) => "value" in result && item.margin_pct != null && Number(result.value) >= Number(item.margin_pct)
  );
  const problem = !customer
    ? "Elige el cliente."
    : skus.length === 0
      ? "Agrega al menos una referencia."
      : targets.isPending
        ? "Leyendo el margen actual de las referencias."
        : found.length === 0
          ? "Ninguna de las referencias tiene margen para este cliente."
          : suppliers.size > 1
            ? "Las referencias deben ser de un mismo proveedor: deja solo las de uno."
            : bad && "error" in bad.result
              ? `${bad.item.sku}: ${bad.result.error}`
              : notLower
                ? `${notLower.item.sku}: el margen pedido debe ser menor que su margen actual (${formatPct(notLower.item.margin_pct)}).`
                : agreedWith.trim().length < 3
                  ? "Escribe con quién se acordó."
                  : reason.trim().length < 3
                    ? "Escribe el motivo."
                    : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (problem || mutation.isPending || !customer) return;
    try {
      const created = await mutation.mutateAsync({
        customer_nit: customer.value,
        requested_for: requestedFor || undefined,
        agreed_with: agreedWith.trim(),
        reason: reason.trim(),
        items: parsed.map(({ item, result }) => ({ sku: item.sku, requested_margin_pct: "value" in result ? result.value : "" })),
      });
      toast.success(`Solicitud #${created.number} enviada a BI.`);
      onDone();
    } catch {
      // The API's message shows in the form (409: a reference already pending for this customer).
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <BasePicker config={CUSTOMER_PICKER} selected={customer} onSelect={setCustomer} onClear={() => setCustomer(null)} />
        <div className="space-y-2">
          <BasePicker
            key={pickerKey}
            config={{ ...PRODUCT_PICKER, label: "Agregar referencia" }}
            selected={null}
            onSelect={(option) => {
              setProducts((current) => (current.some((item) => item.value === option.value) ? current : [...current, option]));
              setPickerKey((value) => value + 1);
            }}
            onClear={() => undefined}
          />
          {products.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Referencias de la solicitud">
              {products.map((product) => (
                <li key={product.value} className="inline-flex items-center gap-1 rounded-sm bg-canvas-subtle py-0.5 pl-2 pr-0.5 text-sm">
                  <span className="font-mono text-xs">{product.value}</span>
                  <button
                    type="button"
                    onClick={() => setProducts((current) => current.filter((item) => item.value !== product.value))}
                    aria-label={`Quitar la referencia ${product.value}`}
                    className="flex size-6 items-center justify-center rounded-sm text-text-secondary hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {targets.isError && <Alert severity="danger">{errorMessage(targets.error)}</Alert>}

      {customer && skus.length > 0 && found.length > 0 && (
        <fieldset className="space-y-2" disabled={mutation.isPending}>
          <legend className="text-sm font-medium">Margen pedido por referencia</legend>
          <p className="text-[13px] text-text-secondary">
            Debe ser menor que el margen actual: el del producto en la lista de márgenes del cliente.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <caption className="sr-only">Referencias y margen pedido</caption>
              <thead className="bg-canvas-subtle">
                <tr>
                  <th scope="col" className={th}>Referencia</th>
                  <th scope="col" className={`${th} text-right`}>Margen actual</th>
                  <th scope="col" className={`${th} w-36`}>Margen pedido (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {skus.map((sku) => {
                  const item = targetOf(sku);
                  return (
                    <tr key={sku}>
                      <td className={td}>
                        <p className="font-mono text-xs">{sku}</p>
                        <p>{item?.description ?? "No se encontró para este cliente"}</p>
                      </td>
                      <td className={`${td} text-right tabular-nums`}>
                        {formatPct(item?.margin_pct)}
                        {item && <span className="block text-xs text-text-secondary">{item.margin_label}</span>}
                      </td>
                      <td className={td}>
                        {item && (
                          <Input
                            inputMode="decimal"
                            aria-label={`Margen pedido para ${sku}`}
                            value={margins[sku] ?? ""}
                            onChange={(event) => setMargins((current) => ({ ...current, [sku]: event.target.value }))}
                            className="text-right tabular-nums"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="margin-request-day" className="block text-[13px] font-medium">Fecha del pedido</label>
          <DatePicker id="margin-request-day" value={requestedFor} onChange={setRequestedFor} disabled={mutation.isPending} />
          <p className="text-[13px] text-text-secondary">Si BI lo aprueba por una sola vez, vale solo para pedidos de este día.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="margin-request-agreed" className="block text-[13px] font-medium">Acordado con</label>
          <Input
            id="margin-request-agreed"
            maxLength={300}
            value={agreedWith}
            onChange={(event) => setAgreedWith(event.target.value)}
            placeholder="Quién autorizó el margen"
            disabled={mutation.isPending}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="margin-request-reason" className="block text-[13px] font-medium">Motivo</label>
        <Textarea
          id="margin-request-reason"
          maxLength={1000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Qué se negoció con el cliente y por qué"
          disabled={mutation.isPending}
        />
      </div>

      {mutation.isError && <Alert severity="danger">{errorMessage(mutation.error)}</Alert>}
      {problem && <p className="text-[13px] text-text-secondary">{problem}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={problem !== null || mutation.isPending}>
          {mutation.isPending ? "Enviando…" : found.length > 1 ? `Pedir para ${found.length} referencias` : "Enviar solicitud"}
        </Button>
      </DialogFooter>
    </form>
  );
}
