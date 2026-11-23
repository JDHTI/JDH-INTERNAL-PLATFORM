"use client";

import { useState } from "react";

import { formatDay, formatMargin, formatMoney, parseMarginInput, parseSupplierMarginInput } from "@/features/quotations/lib/format";
import Pager from "@/shared/components/pager";
import { Alert } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";

import { useSession } from "@/features/session/hooks/use-session";
import type { SessionUser } from "@/features/session/types/session.types";

import { useDecideInternalRequest, useInternalRequest, useInternalRequests } from "../hooks/use-internal-requests";
import { internalStatusLabel, internalStatusTone, marginPointsText } from "../lib/internal-requests";
import type { InternalRequestItem, InternalSupportRequest } from "../types/internal-request.types";
import type { RequestStatus } from "../types/request.types";
import DiscardDialog from "./discard-dialog";
import { dateTime } from "./jdh-support";

const STATUSES = [
  { value: "", label: "Todos los estados" },
  { value: "pendiente", label: "Pendientes" },
  { value: "aprobada", label: "Aprobadas" },
  { value: "rechazada", label: "Rechazadas" },
];

const th = "px-3 py-2.5 text-left text-xs font-semibold text-text-secondary";
const td = "px-3 py-2.5 align-top";

/** BI reviews every request; whoever quotes sees their own. Every status at first, for both. */
export default function InternalRequestsBrowser({ review }: { review: boolean }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const me = useSession().data;
  const q = useDebouncedValue(text.trim());
  const query = useInternalRequests(
    { page, size: 25, status: (status || undefined) as RequestStatus | undefined, q: q || undefined, mine: !review },
    true,
    review ? "review" : "own"
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label="Buscar por cliente, proveedor o referencia"
          type="search"
          maxLength={100}
          placeholder="Cliente, proveedor o referencia"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setPage(1);
          }}
        />
        <Dropdown
          aria-label="Estado de la solicitud"
          value={status}
          options={STATUSES}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </div>
      {query.isPending ? (
        <p aria-busy="true" className="text-sm text-text-secondary">Cargando solicitudes…</p>
      ) : query.isError ? (
        <Alert severity="danger">
          {errorMessage(query.error)}{" "}
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>Reintentar</Button>
        </Alert>
      ) : query.data.items.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {status || q
            ? "Ninguna solicitud coincide con estos filtros."
            : review
              ? "No hay solicitudes de apoyo interno. Llegan cuando alguien las pide desde una cotización."
              : "Aún no has pedido apoyos internos. Se piden desde una cotización, en las referencias que quedan bajo el margen mínimo."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[600px] text-sm">
              <caption className="sr-only">Solicitudes de apoyo interno</caption>
              <thead className="bg-canvas-subtle">
                <tr>
                  <th scope="col" className={th}>Solicitud</th>
                  <th scope="col" className={th}>Cliente</th>
                  <th scope="col" className={th}>Proveedor y referencias</th>
                  <th scope="col" className={th}>Estado</th>
                  <th scope="col" className={th}><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {query.data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-canvas-subtle">
                    <td className={td}>
                      <p className="font-medium tabular-nums">#{item.number}</p>
                      {item.kind_label && <p className="text-xs">{item.kind_label}</p>}
                      <p className="text-xs text-text-secondary">{item.requested_by} · {dateTime(item.created_at)}</p>
                    </td>
                    <td className={td}>
                      <p>{item.customer_name ?? "Sin nombre"}</p>
                      <p className="text-xs text-text-secondary">NIT {item.customer_nit}</p>
                    </td>
                    <td className={td}>
                      <p>{item.supplier_name ?? item.supplier_code}</p>
                      <p className="text-xs text-text-secondary">
                        {item.items.length === 1 ? item.items[0].sku : `${item.items.length} referencias`} · pedido del {formatDay(item.requested_for)}
                      </p>
                    </td>
                    <td className={td}>
                      <Badge tone={internalStatusTone(item.status)}>{internalStatusLabel(item)}</Badge>
                    </td>
                    <td className={`${td} text-right`}>
                      <Button variant="outline" size="sm" onClick={() => setOpenId(item.id)} aria-label={`Ver solicitud ${item.number}`}>
                        {review && item.status === "pendiente" && !askedBy(item, me) ? "Revisar" : "Ver"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={query.data.page} size={query.data.size} total={query.data.total} count={query.data.items.length} onPageChange={setPage} />
        </>
      )}
      {openId && <InternalRequestDialog key={openId} id={openId} review={review} onClose={() => setOpenId(null)} />}
    </div>
  );
}

type Choice = "persistente" | "unica_vez" | "rechazar";

/**
 * Whether the person asked for it: nobody decides their own request (the API answers 403).
 * By id when the API sends it, else by the email or name it records as the requester.
 */
function askedBy(request: InternalSupportRequest, me: SessionUser | undefined): boolean {
  if (!me) return false;
  if (request.requested_by_id) return request.requested_by_id === me.id;
  const by = request.requested_by.trim().toLowerCase();
  return by === me.email.toLowerCase() || by === me.displayName.trim().toLowerCase();
}

function InternalRequestDialog({ id, review, onClose }: { id: string; review: boolean; onClose: () => void }) {
  const query = useInternalRequest(id, !review);
  const me = useSession().data;
  const data = query.data;
  const own = data ? askedBy(data, me) : false;
  const canDecide = review && data?.status === "pendiente" && !own;

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={data ? `${data.kind_label || "Solicitud de apoyo interno"} #${data.number}` : "Solicitud de apoyo interno"}
      wide
      isForm={canDecide}
    >
      {query.isPending ? (
        <p aria-busy="true" className="text-sm text-text-secondary">Cargando solicitud…</p>
      ) : query.isError ? (
        <Alert severity="danger">
          {errorMessage(query.error)}{" "}
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>Reintentar</Button>
        </Alert>
      ) : !data ? null : canDecide ? (
        <DecisionForm key={data.version} request={data} onDone={onClose} onConflict={() => void query.refetch()} />
      ) : (
        <div className="space-y-4">
          <RequestSummary request={data} />
          <ItemsTable request={data} />
          {review && own && data.status === "pendiente" ? (
            <p className="text-sm text-text-secondary">La pediste tú: la decide otra persona del área BI.</p>
          ) : (
            <DecisionSummary request={data} />
          )}
        </div>
      )}
    </Dialog>
  );
}

function RequestSummary({ request }: { request: InternalSupportRequest }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {request.kind_label && (
        <div className="sm:col-span-2"><dt className="text-text-secondary">Qué se pide</dt><dd>{request.kind_label}</dd></div>
      )}
      <div><dt className="text-text-secondary">Cliente</dt><dd>{request.customer_name ?? "Sin nombre"} · NIT {request.customer_nit}</dd></div>
      <div><dt className="text-text-secondary">Proveedor</dt><dd>{request.supplier_name ?? request.supplier_code}</dd></div>
      <div><dt className="text-text-secondary">Cotización</dt><dd>{request.quotation_label ?? request.quotation_id ?? "Sin cotización: pedida desde el panel"}</dd></div>
      <div><dt className="text-text-secondary">Fecha del pedido</dt><dd>{formatDay(request.requested_for)}</dd></div>
      <div><dt className="text-text-secondary">Solicitó</dt><dd>{request.requested_by} · {dateTime(request.created_at)}</dd></div>
      <div><dt className="text-text-secondary">Acordado con</dt><dd>{request.agreed_with}</dd></div>
      <div className="sm:col-span-2"><dt className="text-text-secondary">Motivo</dt><dd className="whitespace-pre-wrap break-words">{request.reason}</dd></div>
    </dl>
  );
}

/** A supplier request lowers a «% Margen Garantizado»'s supplier minimum, which may go negative. */
const isSupplierRequest = (request: InternalSupportRequest) => request.kind === "proveedor";

/**
 * The margin columns: on a JDH request the rule's minimum and the authorized margin asked; on a
 * supplier one the supplier's minimum in force when asked (`target_margin_pct`) and the one asked.
 */
function marginColumns(request: InternalSupportRequest) {
  return isSupplierRequest(request)
    ? {
        floor: { label: "Mínimo proveedor vigente", of: (item: InternalRequestItem) => item.target_margin_pct ?? null },
        asked: "Mínimo proveedor solicitado",
      }
    : { floor: { label: "Mínimo", of: (item: InternalRequestItem) => item.min_margin_pct }, asked: "Margen mínimo autorizado" };
}

function ItemsTable({ request }: { request: InternalSupportRequest }) {
  const decided = request.status !== "pendiente";
  const columns = marginColumns(request);
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Referencias de la solicitud</caption>
        <thead className="bg-canvas-subtle">
          <tr>
            <th scope="col" className={th}>Referencia</th>
            <th scope="col" className={`${th} text-right`}>Precio cotizado</th>
            <th scope="col" className={`${th} text-right`}>Margen cotizado</th>
            <th scope="col" className={`${th} text-right`}>{columns.floor.label}</th>
            <th scope="col" className={`${th} text-right`}>{columns.asked}</th>
            {decided && <th scope="col" className={`${th} text-right`}>Aprobado</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {request.items.map((item) => (
            <tr key={item.sku}>
              <td className={td}><p className="font-mono text-xs">{item.sku}</p><p>{item.description ?? "Sin descripción"}</p></td>
              <td className={`${td} text-right tabular-nums`}>{formatMoney(item.quoted_price)}</td>
              <td className={`${td} text-right tabular-nums`}>{formatMargin(item.margin_pct)}</td>
              <td className={`${td} text-right tabular-nums`}>{formatMargin(columns.floor.of(item))}</td>
              <td className={`${td} text-right tabular-nums`}>{formatMargin(item.requested_margin_pct)}</td>
              {decided &&<td className={`${td} text-right tabular-nums`}>{item.approved_margin_pct === null ? "No aprobado" : formatMargin(item.approved_margin_pct)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DecisionSummary({ request }: { request: InternalSupportRequest }) {
  if (request.status === "pendiente") return <p className="text-sm text-text-secondary">Pendiente de revisión por BI.</p>;
  const validity =
    request.decision === "unica_vez"
      ? `Válido solo el ${formatDay(request.valid_from ?? request.requested_for)}.`
      : request.decision === "persistente"
        ? `Vigente desde el ${formatDay(request.valid_from)}${request.valid_to ? ` hasta el ${formatDay(request.valid_to)}` : ", sin fecha de fin"}.`
        : null;
  return (
    <section className="space-y-1 rounded-lg border border-border p-4 text-sm">
      <p className="font-medium">{internalStatusLabel(request)}</p>
      {validity && <p>{validity}</p>}
      <p className="text-text-secondary">{request.decided_by} · {dateTime(request.decided_at)}</p>
      {request.decision_reason && <p className="whitespace-pre-wrap break-words">{request.decision_reason}</p>}
    </section>
  );
}

function DecisionForm({ request, onDone, onConflict }: { request: InternalSupportRequest; onDone: () => void; onConflict: () => void }) {
  const mutation = useDecideInternalRequest();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [margins, setMargins] = useState<Record<string, string>>(() =>
    Object.fromEntries(request.items.map((item) => [item.sku, marginPointsText(item.requested_margin_pct)]))
  );
  const [included, setIncluded] = useState<Set<string>>(() => new Set(request.items.map((item) => item.sku)));
  // A support registered from a request starts, by default, on the order's day.
  const [validFrom, setValidFrom] = useState(request.requested_for);
  const [validTo, setValidTo] = useState("");
  const [note, setNote] = useState("");
  const [conflict, setConflict] = useState(false);
  const [discard, setDiscard] = useState(false);

  const approving = choice === "persistente" || choice === "unica_vez";
  const forSupplier = isSupplierRequest(request);
  const columns = marginColumns(request);
  // A supplier's minimum may be 0 or negative, and must stay under the one in force when it was asked.
  const parseOne = (item: InternalRequestItem): { value: string } | { error: string } => {
    const result = (forSupplier ? parseSupplierMarginInput : parseMarginInput)(margins[item.sku] ?? "");
    const floor = item.target_margin_pct;
    if (forSupplier && "value" in result && floor != null && Number(result.value) >= Number(floor)) {
      return { error: `debe ser menor que el mínimo vigente del proveedor (${formatMargin(floor)}).` };
    }
    return result;
  };
  const parsed = request.items
    .filter((item) => included.has(item.sku))
    .map((item) => ({ sku: item.sku, result: parseOne(item) }));
  const marginError = parsed.find((item) => "error" in item.result);
  const noteRequired = choice === "unica_vez" || choice === "rechazar";
  const errors = [
    approving && parsed.length === 0 && "Deja al menos una referencia para aprobar.",
    approving && marginError && "error" in marginError.result && `${marginError.sku}: ${marginError.result.error}`,
    choice === "persistente" && !validFrom && "Elige desde cuándo rige.",
    choice === "persistente" && validTo && validTo < validFrom && "La fecha de fin no puede ser anterior a la de inicio.",
    noteRequired && note.trim().length < 3 && (choice === "rechazar" ? "Escribe el motivo del rechazo." : "Escribe por qué se aprueba solo esta vez."),
  ].filter(Boolean) as string[];
  const dirty = choice !== null || note.trim() !== "";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!choice || errors.length > 0 || mutation.isPending) return;
    try {
      if (choice === "rechazar") {
        await mutation.mutateAsync({ kind: "reject", id: request.id, body: { version: request.version, reason: note.trim() } });
      } else {
        await mutation.mutateAsync({
          kind: "approve",
          id: request.id,
          body: {
            version: request.version,
            decision: choice,
            ...(choice === "persistente" ? { valid_from: validFrom, valid_to: validTo || null } : {}),
            note: note.trim(),
            items: parsed.map((item) => ({ sku: item.sku, approved_margin_pct: "value" in item.result ? item.result.value : "" })),
          },
        });
      }
      onDone();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setConflict(true);
        onConflict();
      }
    }
  }

  const options: { value: Choice; label: string; hint: string }[] = forSupplier
    ? [
        {
          value: "persistente",
          label: "Registrar como apoyo",
          hint: "Crea una copia del % Margen Garantizado para este cliente y esta referencia, con el mínimo aprobado y las vigencias que pongas. El apoyo base no cambia.",
        },
        {
          value: "unica_vez",
          label: "Aprobar por una sola vez",
          hint: `Crea la copia con el mínimo aprobado solo para pedidos del ${formatDay(request.requested_for)}. El apoyo base no cambia.`,
        },
        { value: "rechazar", label: "Rechazar", hint: "No registra nada. Quien lo pidió ve el motivo." },
      ]
    : [
        { value: "persistente", label: "Registrar como apoyo", hint: "Queda en el maestro con las vigencias que pongas. El validador de pedidos lo aplica mientras esté vigente." },
        { value: "unica_vez", label: "Aprobar por una sola vez", hint: `Queda documentado y el validador lo aplica solo a pedidos del ${formatDay(request.requested_for)}.` },
        { value: "rechazar", label: "Rechazar", hint: "No registra nada. Quien lo pidió ve el motivo." },
      ];

  return (
    <>
      <form onSubmit={submit} className="space-y-5">
        <RequestSummary request={request} />

        <fieldset className="space-y-2" disabled={mutation.isPending}>
          <legend className="mb-2 text-sm font-medium">Decisión</legend>
          {options.map((option) => (
            <label key={option.value} className="flex gap-3 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary">
              <input type="radio" name="decision" value={option.value} checked={choice === option.value} onChange={() => setChoice(option.value)} className="mt-0.5" />
              <span><span className="block font-medium">{option.label}</span><span className="text-text-secondary">{option.hint}</span></span>
            </label>
          ))}
        </fieldset>

        {approving ? (
          <fieldset className="space-y-2" disabled={mutation.isPending}>
            <legend className="text-sm font-medium">
              {forSupplier ? "Referencias y margen mínimo proveedor aprobado" : "Referencias y margen apoyado aprobado"}
            </legend>
            <p className="text-[13px] text-text-secondary">Puedes ajustar el margen de cada referencia o quitar las que no se aprueban.</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[680px] text-sm">
                <caption className="sr-only">Referencias a aprobar</caption>
                <thead className="bg-canvas-subtle">
                  <tr>
                    <th scope="col" className={th}>Aprobar</th>
                    <th scope="col" className={th}>Referencia</th>
                    <th scope="col" className={`${th} text-right`}>Margen cotizado</th>
                    <th scope="col" className={`${th} text-right`}>{columns.floor.label}</th>
                    <th scope="col" className={`${th} text-right`}>{columns.asked}</th>
                    <th scope="col" className={`${th} w-32`}>Aprobado (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {request.items.map((item) => {
                    const on = included.has(item.sku);
                    return (
                      <tr key={item.sku}>
                        <td className={td}>
                          <input
                            type="checkbox"
                            checked={on}
                            aria-label={`Aprobar ${item.sku}`}
                            onChange={() =>
                              setIncluded((current) => {
                                const next = new Set(current);
                                if (!next.delete(item.sku)) next.add(item.sku);
                                return next;
                              })
                            }
                          />
                        </td>
                        <td className={td}><p className="font-mono text-xs">{item.sku}</p><p>{item.description ?? "Sin descripción"}</p></td>
                        <td className={`${td} text-right tabular-nums`}>{formatMargin(item.margin_pct)}</td>
                        <td className={`${td} text-right tabular-nums`}>{formatMargin(columns.floor.of(item))}</td>
                        <td className={`${td} text-right tabular-nums`}>{formatMargin(item.requested_margin_pct)}</td>
                        <td className={td}>
                          <Input
                            // The decimal pad has no minus sign on iOS, and a supplier's minimum may be negative.
                            inputMode={forSupplier ? "text" : "decimal"}
                            aria-label={`Margen aprobado para ${item.sku}`}
                            disabled={!on}
                            value={margins[item.sku] ?? ""}
                            onChange={(event) => setMargins((current) => ({ ...current, [item.sku]: event.target.value }))}
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
        ) : (
          <ItemsTable request={request} />
        )}

        {choice === "persistente" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="internal-valid-from" className="block text-[13px] font-medium">Rige desde</label>
              <DatePicker id="internal-valid-from" value={validFrom} onChange={setValidFrom} disabled={mutation.isPending} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="internal-valid-to" className="block text-[13px] font-medium">
                Hasta <span className="font-normal text-text-secondary">(opcional)</span>
              </label>
              <DatePicker id="internal-valid-to" value={validTo} onChange={setValidTo} min={validFrom || undefined} placeholder="Sin fecha de fin" clearable disabled={mutation.isPending} />
            </div>
          </div>
        )}

        {choice && (
          <div className="space-y-1.5">
            <label htmlFor="internal-note" className="block text-[13px] font-medium">
              {choice === "rechazar" ? "Motivo del rechazo" : choice === "unica_vez" ? "Por qué se aprueba solo esta vez" : "Observación"}
              {choice === "persistente" && <span className="font-normal text-text-secondary"> (opcional)</span>}
            </label>
            <Textarea id="internal-note" maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} disabled={mutation.isPending} />
          </div>
        )}

        {conflict && <Alert severity="warning">Otra persona cambió la solicitud mientras la revisabas. Se recargó; revisa y decide de nuevo.</Alert>}
        {mutation.isError && !conflict && <Alert severity="danger">{errorMessage(mutation.error)}</Alert>}
        {choice && errors.length > 0 && <p className="text-[13px] text-text-secondary">{errors[0]}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => (dirty ? setDiscard(true) : onDone())}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!choice || errors.length > 0 || mutation.isPending}>
            {mutation.isPending ? "Guardando…" : choice === "rechazar" ? "Rechazar solicitud" : choice === "unica_vez" ? "Aprobar por una vez" : "Registrar apoyo"}
          </Button>
        </DialogFooter>
      </form>
      <DiscardDialog open={discard} onCancel={() => setDiscard(false)} onDiscard={onDone} />
    </>
  );
}
