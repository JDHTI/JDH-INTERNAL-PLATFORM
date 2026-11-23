"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useCreateInternalRequest, useTargetMargins } from "@/features/supports/hooks/use-internal-requests";
import { marginPointsText, todayInBogota } from "@/features/supports/lib/internal-requests";
import { Alert } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import type { InternalRequestKind } from "@/features/supports/types/internal-request.types";

import { formatMargin, formatMoney, parseMarginInput, parseSupplierMarginInput } from "../lib/format";
import type { Quotation, QuotationLine } from "../types/quotations.types";

const ALL_SUPPLIERS = "";
/** Rows on screen whose current margin is asked for up front; past it, only the ticked ones. */
const TARGETS_IN_VIEW = 120;

const th = "px-3 py-2.5 text-left text-xs font-semibold text-text-secondary";
const td = "px-3 py-2.5 align-top";

/** The margin the line is quoted at: the new price's, else the last price's, both with the supplier's support. */
export const quotedMargin = (line: QuotationLine) => line.new_margin_with_support_pct ?? line.current_margin_with_support_pct;

/**
 * A reference that can ask for an authorized margin: any line from SIESA with a supplier
 * (not only one under its minimum), without a request still pending or approved.
 */
export function canAskSupport(line: QuotationLine): boolean {
  if (line.origin === "local" || !line.is_active || !line.supplier_code) return false;
  const asked = line.support_request;
  // Pending, or approved for this reference; one BI left out of an approved request can be asked again.
  return !(asked && (asked.status === "pendiente" || (asked.status === "aprobada" && asked.approved_margin_pct !== null)));
}

/**
 * Its applied support is a «% Margen Garantizado» with the supplier's minimum margin: what it asks
 * is a lower supplier minimum (one-off for this customer and reference), not JDH's margin.
 */
export function asksSupplierMargin(line: QuotationLine): boolean {
  return line.support?.calc_method === "precio_neto" && line.support.supplier_min_margin_pct != null;
}

/** The supplier's minimum in force, the one a supplier request must ask under. */
const supplierMinimum = (line: QuotationLine) => line.support?.supplier_min_margin_pct ?? null;

/** Quoted under its own minimum: its quoted margin is the natural start of the request. */
function belowMinimum(line: QuotationLine): boolean {
  if (line.new_price !== null) return line.compliance === "bajo_minimo";
  const margin = quotedMargin(line);
  return line.below_target || (margin !== null && line.min_margin_pct !== null && Number(margin) < Number(line.min_margin_pct));
}

/**
 * Asks BI for an internal support: one customer (the quotation's) and one or
 * more references, each with the supported margin asked. The API takes one
 * supplier per request, so references of several suppliers become one request
 * each. BI decides whether it is registered as a support or holds only on the
 * order's day.
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
  const askable = useMemo(() => quotation.lines.filter(canAskSupport), [quotation.lines]);
  const byKind: Record<InternalRequestKind, QuotationLine[]> = {
    jdh: askable.filter((line) => !asksSupplierMargin(line)),
    proveedor: askable.filter(asksSupplierMargin),
  };
  // Starts on what the ticked references ask; nothing ticked, on JDH unless only supplier ones are left.
  const ticked = askable.filter((line) => preselected.has(line.sku));
  const startKind: InternalRequestKind =
    ticked.length > 0
      ? ticked.every(asksSupplierMargin)
        ? "proveedor"
        : "jdh"
      : byKind.jdh.length === 0 && byKind.proveedor.length > 0
        ? "proveedor"
        : "jdh";
  const [picked, setPicked] = useState<InternalRequestKind | null>(null);
  const kind = picked ?? startKind;
  const candidates = byKind[kind];
  const supplierNames = [...new Set(byKind.proveedor.map((line) => line.supplier_name ?? line.supplier_code ?? ""))];
  const close = (next: boolean) => {
    if (!next) setPicked(null);
    onOpenChange(next);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title={
        kind === "proveedor"
          ? `Solicitud de margen proveedor${supplierNames.length === 1 ? ` ${supplierNames[0]}` : ""}`
          : "Solicitar margen autorizado"
      }
      description={
        kind === "proveedor"
          ? `Para ${quotation.customer_name}: un margen mínimo del proveedor menor que el vigente de su % Margen Garantizado. Si BI lo aprueba, la referencia toma una copia del apoyo para este cliente con ese mínimo; el apoyo base no cambia.`
          : `Para ${quotation.customer_name}: un margen menor que el actual de cada referencia. BI decide si lo registra como apoyo o si vale solo para este pedido.`
      }
      wide
      isForm
    >
      {open && (
        <div className="space-y-5">
          {/* One request is all JDH or all supplier: both kinds on the quotation, one at a time. */}
          {byKind.jdh.length > 0 && byKind.proveedor.length > 0 && (
            <div role="group" aria-label="Qué se pide" className="flex flex-wrap gap-2">
              {(["jdh", "proveedor"] as const).map((option) => (
                <Button
                  key={option}
                  type="button"
                  size="sm"
                  variant={kind === option ? "primary" : "outline"}
                  aria-pressed={kind === option}
                  onClick={() => setPicked(option)}
                  className="max-md:h-11"
                >
                  {option === "jdh" ? "Margen autorizado JDH" : "Margen mínimo proveedor"} · {byKind[option].length}
                </Button>
              ))}
            </div>
          )}
          {candidates.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm">
                Ninguna referencia de SIESA con proveedor queda para pedir: todas tienen una solicitud pendiente o aprobada.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => close(false)}>Cerrar</Button>
              </DialogFooter>
            </div>
          ) : (
            <RequestForm key={kind} kind={kind} quotation={quotation} candidates={candidates} preselected={preselected} onDone={() => close(false)} />
          )}
        </div>
      )}
    </Dialog>
  );
}

function RequestForm({
  kind,
  quotation,
  candidates,
  preselected,
  onDone,
}: {
  kind: InternalRequestKind;
  quotation: Quotation;
  candidates: QuotationLine[];
  preselected: Set<string>;
  onDone: () => void;
}) {
  const forSupplier = kind === "proveedor";
  const mutation = useCreateInternalRequest(quotation.id);
  const suppliers = useMemo(() => {
    const seen = new Map<string, string>();
    for (const line of candidates) {
      if (line.supplier_code && !seen.has(line.supplier_code)) seen.set(line.supplier_code, line.supplier_name ?? line.supplier_code);
    }
    return [...seen].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [candidates]);
  const supplierName = (code: string) => suppliers.find((option) => option.value === code)?.label ?? code;
  // Only narrows the table: ticks of every supplier are kept, and each supplier becomes its own request.
  const [supplier, setSupplier] = useState(ALL_SUPPLIERS);
  const lines = supplier === ALL_SUPPLIERS ? candidates : candidates.filter((line) => line.supplier_code === supplier);
  const [ticked, setTicked] = useState<Set<string>>(() => {
    const picked = candidates.filter((line) => preselected.has(line.sku)).map((line) => line.sku);
    return new Set(picked.length > 0 ? picked : candidates.length === 1 ? [candidates[0].sku] : []);
  });
  // A JDH line quoted under its minimum starts at its quoted margin; the rest, and every supplier one, start empty.
  const [margins, setMargins] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      candidates.map((line) => [line.sku, !forSupplier && belowMinimum(line) ? marginPointsText(quotedMargin(line)) : ""])
    )
  );
  // JDH: the current margin of each reference (the product's on the customer's list), asked for the
  // ticked ones and the rows on screen while they fit in one request. Supplier: the minimum in force,
  // already on the line. Either way the request must ask less.
  const targetSkus = forSupplier ? [] : [...ticked, ...(lines.length <= TARGETS_IN_VIEW ? lines.map((line) => line.sku) : [])];
  const targets = useTargetMargins(quotation.customer_nit, targetSkus);
  const targetOf = (sku: string) => targets.data?.items.find((item) => item.sku === sku);
  const lineOf = (sku: string) => candidates.find((line) => line.sku === sku);
  const currentOf = (sku: string) => (forSupplier ? supplierMinimum(lineOf(sku)!) : targetOf(sku)?.margin_pct ?? null);
  const [requestedFor, setRequestedFor] = useState(todayInBogota());
  const [agreedWith, setAgreedWith] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<{ message: string; conflict: boolean; created: number[] } | null>(null);

  const chosen = candidates.filter((line) => ticked.has(line.sku));
  const groups = useMemo(() => {
    const bySupplier = new Map<string, QuotationLine[]>();
    for (const line of chosen) {
      const code = line.supplier_code ?? "";
      bySupplier.set(code, [...(bySupplier.get(code) ?? []), line]);
    }
    return [...bySupplier];
  }, [chosen]);
  // A supplier's minimum may be 0 or negative; JDH's stays above 0.
  const parse = forSupplier ? parseSupplierMarginInput : parseMarginInput;
  const parsed = chosen.map((line) => ({ sku: line.sku, result: parse(margins[line.sku] ?? "") }));
  const badMargin = parsed.find((item) => "error" in item.result);
  // The current margin must be known to check that the request asks less; the API checks it too.
  const notLower = parsed.find((item) => {
    const current = currentOf(item.sku);
    return "value" in item.result && current != null && Number(item.result.value) >= Number(current);
  });
  const problem =
    chosen.length === 0
      ? "Marca al menos una referencia."
      : badMargin && "error" in badMargin.result
        ? `${badMargin.sku}: ${badMargin.result.error}`
        : notLower
          ? forSupplier
            ? `${notLower.sku}: el margen pedido debe ser menor que el mínimo vigente del proveedor (${formatMargin(currentOf(notLower.sku))}).`
            : `${notLower.sku}: el margen pedido debe ser menor que su margen actual (${formatMargin(currentOf(notLower.sku))}).`
          : !requestedFor
          ? "Elige la fecha del pedido."
          : agreedWith.trim().length < 3
            ? "Escribe con quién se acordó."
            : reason.trim().length < 3
              ? "Escribe el motivo."
              : null;

  /**
   * The API takes one supplier per request, so one POST per supplier, in turn.
   * Creating a request does not change the quotation's version. If one fails,
   * the ones already created stay, and their references are unticked so a
   * second try sends only what is left.
   */
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (problem || sending) return;
    setSending(true);
    setFailure(null);
    const created: number[] = [];
    const marginOf = new Map(parsed.map((item) => [item.sku, "value" in item.result ? item.result.value : ""]));
    for (const [code, group] of groups) {
      try {
        const request = await mutation.mutateAsync({
          version: quotation.version,
          // Left out for JDH: the API's default, and what older builds understand.
          ...(forSupplier ? { kind: "proveedor" as const } : {}),
          supplier_code: code,
          requested_for: requestedFor,
          agreed_with: agreedWith.trim(),
          reason: reason.trim(),
          items: group.map((line) => ({ sku: line.sku, requested_margin_pct: marginOf.get(line.sku) ?? "" })),
        });
        created.push(request.number);
        setTicked((current) => {
          const next = new Set(current);
          for (const line of group) next.delete(line.sku);
          return next;
        });
      } catch (error) {
        setFailure({
          message: `${supplierName(code)}: ${errorMessage(error)}`,
          conflict: error instanceof ApiError && error.status === 409,
          created,
        });
        setSending(false);
        return;
      }
    }
    setSending(false);
    toast.success(
      created.length === 1
        ? `Solicitud #${created[0]} enviada a BI.`
        : `Se crearon ${created.length} solicitudes, una por proveedor: ${created.map((number) => `#${number}`).join(", ")}.`
    );
    onDone();
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-5">
      {suppliers.length > 1 && (
        <div className="space-y-1.5">
          <label htmlFor="support-request-supplier" className="block text-[13px] font-medium">Ver proveedor</label>
          <Dropdown
            id="support-request-supplier"
            aria-label="Ver proveedor"
            value={supplier}
            options={[{ value: ALL_SUPPLIERS, label: "Todos los proveedores" }, ...suppliers]}
            onValueChange={setSupplier}
          />
        </div>
      )}

      <fieldset className="space-y-2" disabled={sending}>
        <legend className="text-sm font-medium">
          Referencias{suppliers.length === 1 ? ` de ${suppliers[0].label}` : ""}
        </legend>
        <p className="text-[13px] text-text-secondary">
          {forSupplier
            ? "Son las referencias con % Margen Garantizado. Marca una o varias y pide un margen mínimo del proveedor menor que el vigente; puede ser 0 o negativo."
            : "Marca una o varias y pide un margen menor que el actual, el del producto en la lista del cliente. Las que se cotizan bajo su mínimo arrancan en el margen cotizado."}
          {suppliers.length > 1 && " Se crea una solicitud por proveedor."}
        </p>
        {targets.isError && <Alert severity="warning">No se pudo leer el margen actual: {errorMessage(targets.error)}</Alert>}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[680px] text-sm">
            <caption className="sr-only">Referencias para la solicitud</caption>
            <thead className="bg-canvas-subtle">
              <tr>
                <th scope="col" className={th}>Pedir</th>
                <th scope="col" className={th}>Referencia</th>
                <th scope="col" className={`${th} text-right`}>Precio</th>
                <th scope="col" className={`${th} text-right`}>Margen cotizado</th>
                <th scope="col" className={`${th} text-right`}>{forSupplier ? "Mínimo proveedor vigente" : "Margen actual"}</th>
                <th scope="col" className={`${th} ${forSupplier ? "w-40" : "w-32"}`}>
                  {forSupplier ? "Margen mínimo proveedor solicitado (%)" : "Margen pedido (%)"}
                </th>
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
                      {suppliers.length > 1 && <p className="text-xs text-text-secondary">{supplierName(line.supplier_code ?? "")}</p>}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{formatMoney(line.offer_price)}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatMargin(quotedMargin(line))}</td>
                    {forSupplier ? (
                      <td className={`${td} text-right tabular-nums`}>{formatMargin(supplierMinimum(line))}</td>
                    ) : (
                      <td className={`${td} text-right tabular-nums`} title={targetOf(line.sku)?.margin_label}>
                        {targetOf(line.sku) ? formatMargin(targetOf(line.sku)?.margin_pct) : targets.isFetching ? "…" : "—"}
                        {targetOf(line.sku) && <span className="block text-xs text-text-secondary">{targetOf(line.sku)?.margin_label}</span>}
                      </td>
                    )}
                    <td className={td}>
                      <Input
                        // The decimal pad has no minus sign on iOS, and a supplier's minimum may be negative.
                        inputMode={forSupplier ? "text" : "decimal"}
                        aria-label={`${forSupplier ? "Margen mínimo proveedor solicitado" : "Margen pedido"} para ${line.sku}`}
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

      {failure && (
        <Alert severity={failure.conflict ? "warning" : "danger"}>
          {failure.created.length > 0 &&
            `Ya se crearon ${failure.created.map((number) => `#${number}`).join(", ")}; sus referencias se desmarcaron. `}
          {failure.conflict
            ? "La cotización cambió mientras llenabas la solicitud. Cierra, recarga la cotización y vuelve a enviar lo que falta."
            : failure.message}
        </Alert>
      )}
      {problem ? (
        <p className="text-[13px] text-text-secondary">{problem}</p>
      ) : (
        groups.length > 1 && (
          <p className="text-[13px] text-text-secondary">
            Se crean {groups.length} solicitudes, una por proveedor: {groups.map(([code]) => supplierName(code)).join(", ")}.
          </p>
        )
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={sending} onClick={onDone}>Cancelar</Button>
        <Button type="submit" disabled={problem !== null || sending}>
          {sending
            ? "Enviando…"
            : groups.length > 1
              ? `Crear ${groups.length} solicitudes`
              : chosen.length > 1
                ? `Solicitar para ${chosen.length} referencias`
                : "Enviar solicitud"}
        </Button>
      </DialogFooter>
    </form>
  );
}
