"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useCreateInternalRequest } from "@/features/supports/hooks/use-internal-requests";
import { marginPointsText, todayInBogota } from "@/features/supports/lib/internal-requests";
import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { formatMargin, formatMoney, parseMarginInput } from "../lib/format";
import type { Quotation, QuotationLine } from "../types/quotations.types";

const th = "px-3 py-2.5 text-left text-xs font-semibold text-text-secondary";
const td = "px-3 py-2.5 align-top";

/** The margin the line is quoted at: the new price's, else the last price's, both with the supplier's support. */
export const quotedMargin = (line: QuotationLine) => line.new_margin_with_support_pct ?? line.current_margin_with_support_pct;

/**
 * A reference that can ask for an internal support: from SIESA, with a supplier,
 * quoted under its minimum, and without a request still pending or approved.
 */
export function canAskSupport(line: QuotationLine): boolean {
  if (line.origin === "local" || !line.is_active || !line.supplier_code) return false;
  if (line.support_request && line.support_request.status !== "rechazada") return false;
  const margin = Number(quotedMargin(line));
  const minimum = Number(line.min_margin_pct);
  if (line.compliance === "bajo_minimo" || line.below_target) return true;
  return quotedMargin(line) !== null && line.min_margin_pct !== null && margin < minimum;
}

/**
 * Asks BI for an internal support: one customer (the quotation's) and one or
 * more references of a single supplier, each with the supported margin asked.
 * BI decides whether it is registered as a support or holds only on the order's day.
 */
export default function SupportRequestDialog({
  quotation,
  preselected,
  open,
  onOpenChange,
}: {
  quotation: Quotation;
  /** The references ticked in the table, if any: the dialog starts on their supplier. */
  preselected: Set<string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const candidates = useMemo(() => quotation.lines.filter(canAskSupport), [quotation.lines]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Solicitar apoyo interno"
      description={`Para ${quotation.customer_name}. BI decide si lo registra como apoyo o si vale solo para este pedido.`}
      wide
      isForm
    >
      {open &&
        (candidates.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm">
              Ninguna referencia queda bajo su margen mínimo, o todas ya tienen una solicitud pendiente o aprobada.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          <RequestForm quotation={quotation} candidates={candidates} preselected={preselected} onDone={() => onOpenChange(false)} />
        ))}
    </Dialog>
  );
}

function RequestForm({
  quotation,
  candidates,
  preselected,
  onDone,
}: {
  quotation: Quotation;
  candidates: QuotationLine[];
  preselected: Set<string>;
  onDone: () => void;
}) {
  const mutation = useCreateInternalRequest(quotation.id);
  const suppliers = useMemo(() => {
    const seen = new Map<string, string>();
    for (const line of candidates) {
      if (line.supplier_code && !seen.has(line.supplier_code)) seen.set(line.supplier_code, line.supplier_name ?? line.supplier_code);
    }
    return [...seen].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [candidates]);
  const firstPicked = candidates.find((line) => preselected.has(line.sku))?.supplier_code;
  const [supplier, setSupplier] = useState(firstPicked ?? suppliers[0]?.value ?? "");
  const lines = candidates.filter((line) => line.supplier_code === supplier);
  const [ticked, setTicked] = useState<Set<string>>(() => {
    const picked = candidates.filter((line) => preselected.has(line.sku) && line.supplier_code === supplier).map((line) => line.sku);
    return new Set(picked.length > 0 ? picked : lines.length === 1 ? [lines[0].sku] : []);
  });
  const [margins, setMargins] = useState<Record<string, string>>(() =>
    Object.fromEntries(candidates.map((line) => [line.sku, marginPointsText(quotedMargin(line))]))
  );
  const [requestedFor, setRequestedFor] = useState(todayInBogota());
  const [agreedWith, setAgreedWith] = useState("");
  const [reason, setReason] = useState("");

  const chosen = lines.filter((line) => ticked.has(line.sku));
  const parsed = chosen.map((line) => ({ sku: line.sku, result: parseMarginInput(margins[line.sku] ?? "") }));
  const badMargin = parsed.find((item) => "error" in item.result);
  const problem =
    chosen.length === 0
      ? "Marca al menos una referencia."
      : badMargin && "error" in badMargin.result
        ? `${badMargin.sku}: ${badMargin.result.error}`
        : !requestedFor
          ? "Elige la fecha del pedido."
          : agreedWith.trim().length < 3
            ? "Escribe con quién se acordó."
            : reason.trim().length < 3
              ? "Escribe el motivo."
              : null;

  const changeSupplier = (next: string) => {
    setSupplier(next);
    const only = candidates.filter((line) => line.supplier_code === next);
    setTicked(new Set(only.length === 1 ? [only[0].sku] : []));
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (problem || mutation.isPending) return;
    try {
      const created = await mutation.mutateAsync({
        version: quotation.version,
        supplier_code: supplier,
        requested_for: requestedFor,
        agreed_with: agreedWith.trim(),
        reason: reason.trim(),
        items: parsed.map((item) => ({ sku: item.sku, requested_margin_pct: "value" in item.result ? item.result.value : "" })),
      });
      toast.success(`Solicitud #${created.number} enviada a BI.`);
      onDone();
    } catch {
      // The error shows in the form; a 409 asks to reload the quotation.
    }
  }

  const conflict = mutation.error instanceof ApiError && mutation.error.status === 409;

  return (
    <form onSubmit={submit} className="space-y-5">
      {suppliers.length > 1 && (
        <div className="space-y-1.5">
          <label htmlFor="support-request-supplier" className="block text-[13px] font-medium">Proveedor</label>
          <Dropdown id="support-request-supplier" aria-label="Proveedor" value={supplier} options={suppliers} onValueChange={changeSupplier} />
          <p className="text-[13px] text-text-secondary">Una solicitud agrupa referencias de un solo proveedor.</p>
        </div>
      )}

      <fieldset className="space-y-2" disabled={mutation.isPending}>
        <legend className="text-sm font-medium">
          Referencias bajo el mínimo{suppliers.length === 1 ? ` de ${suppliers[0].label}` : ""}
        </legend>
        <p className="text-[13px] text-text-secondary">
          El margen pedido arranca en el margen cotizado. Cámbialo si se acordó otro.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[680px] text-sm">
            <caption className="sr-only">Referencias para la solicitud</caption>
            <thead className="bg-canvas-subtle">
              <tr>
                <th scope="col" className={th}>Pedir</th>
                <th scope="col" className={th}>Referencia</th>
                <th scope="col" className={`${th} text-right`}>Precio</th>
                <th scope="col" className={`${th} text-right`}>Margen cotizado</th>
                <th scope="col" className={`${th} text-right`}>Mínimo</th>
                <th scope="col" className={`${th} w-32`}>Margen pedido (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((line) => {
                const on = ticked.has(line.sku);
                return (
                  <tr key={line.sku}>
                    <td className={td}>
                      <input
                        type="checkbox"
                        checked={on}
                        aria-label={`Pedir apoyo para ${line.sku}`}
                        onChange={() =>
                          setTicked((current) => {
                            const next = new Set(current);
                            if (!next.delete(line.sku)) next.add(line.sku);
                            return next;
                          })
                        }
                      />
                    </td>
                    <td className={td}>
                      <p className="font-mono text-xs">{line.sku}</p>
                      <p>{line.description ?? "Sin descripción"}</p>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{formatMoney(line.offer_price)}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatMargin(quotedMargin(line))}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatMargin(line.min_margin_pct)}</td>
                    <td className={td}>
                      <Input
                        inputMode="decimal"
                        aria-label={`Margen pedido para ${line.sku}`}
                        disabled={!on}
                        value={margins[line.sku] ?? ""}
                        onChange={(event) => setMargins((current) => ({ ...current, [line.sku]: event.target.value }))}
                        className="text-right tabular-nums"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="support-request-day" className="block text-[13px] font-medium">Fecha del pedido</label>
          <DatePicker
            id="support-request-day"
            value={requestedFor}
            onChange={setRequestedFor}
            disabled={mutation.isPending}
            aria-describedby="support-request-day-hint"
          />
          <p id="support-request-day-hint" className="text-[13px] text-text-secondary">
            Si BI lo aprueba por una sola vez, vale solo para pedidos de este día.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="support-request-agreed" className="block text-[13px] font-medium">Acordado con</label>
          <Input
            id="support-request-agreed"
            maxLength={200}
            value={agreedWith}
            onChange={(event) => setAgreedWith(event.target.value)}
            placeholder="Quién autorizó el margen"
            disabled={mutation.isPending}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="support-request-reason" className="block text-[13px] font-medium">Motivo</label>
        <Textarea
          id="support-request-reason"
          maxLength={2000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Qué se negoció con el cliente y por qué"
          disabled={mutation.isPending}
        />
      </div>

      {conflict ? (
        <Alert severity="warning">La cotización cambió mientras llenabas la solicitud. Cierra, recarga la cotización y vuelve a enviarla.</Alert>
      ) : (
        mutation.isError && <Alert severity="danger">{errorMessage(mutation.error)}</Alert>
      )}
      {problem && <p className="text-[13px] text-text-secondary">{problem}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={problem !== null || mutation.isPending}>
          {mutation.isPending ? "Enviando…" : chosen.length > 1 ? `Solicitar para ${chosen.length} referencias` : "Enviar solicitud"}
        </Button>
      </DialogFooter>
    </form>
  );
}
