"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Alert } from "@/shared/components/ui/alert";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { useJdhHistory, useRequestAction } from "../hooks/use-requests";
import { useSupport, useSupportPermissions } from "../hooks/use-supports";
import { calcMethodLabel, formatCop, formatSupplierValue } from "../lib/format";
import type { SupplierSupport } from "../types/support.types";
import type { SupportEvent } from "../types/request.types";
import { formatRequestValue, requestValue } from "../lib/request-values";
import DiscardDialog from "./discard-dialog";

const eventLabels: Record<string, string> = { solicitada: "Solicitud creada", aprobada: "Solicitud aprobada", rechazada: "Solicitud rechazada", cancelada: "Aporte JDH cancelado", actualizacion_maestro: "Acuerdo actualizado por administración", creacion: "Acuerdo creado", migracion: "Valores iniciales de migración" };
const fieldLabels: Record<string, string> = { supplier_value: "Valor del proveedor", jdh_pct: "Porcentaje JDH", jdh_net_cost: "Costo pactado JDH", version: "Versión del acuerdo", value: "Valor solicitado", mode: "Modalidad", reference_cost: "Costo de referencia", reference_list_price: "Lista de referencia", value_unit: "Unidad", pack_factor: "Unidades por caja", product_sku: "SKU", customer_nit: "NIT cliente", customer_name: "Cliente", program: "Programa", valid_from: "Desde", valid_to: "Hasta", status: "Estado", is_enabled: "Habilitado" };
function eventValue(key: string, values: Record<string, unknown> | null) {
  const value = values?.[key];
  if (value === null || value === undefined) return "—";
  if (key === "jdh_pct") return formatRequestValue(String(value), false);
  if (key === "supplier_value") return formatSupplierValue(typeof values?.calc_method === "string" ? values.calc_method : null, String(value));
  if (key === "jdh_net_cost" || key === "value") return formatRequestValue(String(value), key === "jdh_net_cost" || values?.mode === "costo_neto");
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

export const dateTime = (date: string | null) => date ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" }).format(new Date(date)) : "—";
export function JdhValues({ support }: { support: Partial<SupplierSupport> }) {
  return <dl className="grid gap-1 text-sm">
    <div><dt className="inline text-text-secondary">Proveedor: </dt><dd className="inline">{formatSupplierValue(support.calc_method ?? null, support.supplier_value ?? null)}</dd></div>
    <div><dt className="inline text-text-secondary">JDH: </dt><dd className="inline">{formatRequestValue(support.calc_method === "costo_neto" ? support.jdh_net_cost : support.jdh_pct, support.calc_method === "costo_neto")} · {support.value_unit ?? "sin unidad"}</dd></div>
    <div><dt className="inline text-text-secondary">Método / base: </dt><dd className="inline">{calcMethodLabel(support.calc_method ?? null)} · costo ref. {formatCop(support.reference_cost)} · lista ref. {formatCop(support.reference_list_price)}</dd></div>
    <div><dt className="inline text-text-secondary">Alcance: </dt><dd className="inline">{support.product_sku ?? "Todos los productos"} · {support.customer_name ?? support.customer_nit ?? "Todos los clientes"} · {support.program ?? "Sin programa"}</dd></div>
    <div><dt className="inline text-text-secondary">Vigencia: </dt><dd className="inline">{support.valid_from ?? "—"} a {support.valid_to ?? "indefinida"} · {support.state ?? "Ver acuerdo"} · {support.pack_factor ?? "—"} unidades/caja</dd></div>
    <div><dt className="inline text-text-secondary">Versión: </dt><dd className="inline">{support.version ?? "—"}</dd></div>
  </dl>;
}
export function JdhEvents({ events }: { events: SupportEvent[] }) {
  return <div className="space-y-3">{events.length === 0 ? <p>Sin eventos registrados.</p> : events.map(event => <article key={event.id} className="rounded-lg border border-border p-3 text-sm">
    <p className="font-medium">{eventLabels[event.event_type] ?? event.event_type.replaceAll("_", " ")} · {dateTime(event.created_at)}</p>
    <p>{event.actor} {event.request_id && `· solicitud ${event.request_id}`}</p>
    {event.reason && <p className="whitespace-pre-wrap">{event.reason}</p>}
    <div className="mt-2 overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Valores anteriores y nuevos del evento</caption><thead><tr><th className="p-2">Concepto</th><th className="p-2">Anterior</th><th className="p-2">Nuevo</th></tr></thead><tbody>{[...new Set(["supplier_value", "jdh_pct", "jdh_net_cost", "version", ...Object.keys(event.before ?? {}), ...Object.keys(event.after ?? {})])].filter(key => fieldLabels[key]).map(key => <tr key={key} className="border-t border-border"><th className="p-2 font-normal">{fieldLabels[key]}</th><td className="p-2">{eventValue(key, event.before)}</td><td className="p-2">{eventValue(key, event.after)}</td></tr>)}</tbody></table></div>
  </article>)}</div>;
}

export default function JdhSupport({ support, context, onEditingChange = () => undefined }: { support: SupplierSupport; context: "commercial" | "manage"; onEditingChange?: (editing: boolean) => void }) {
  const permissions = useSupportPermissions();
  const [action, setAction] = useState<"create" | "cancel" | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const history = useJdhHistory(support.id, showHistory && permissions.data?.can_review === true && context === "manage");
  return <section className="space-y-3 rounded-lg border border-border p-4">
    <h3 className="font-semibold">Aporte JDH</h3><JdhValues support={support} />
    {permissions.isError && <p role="alert">{errorMessage(permissions.error)}</p>}
    {context === "commercial" && permissions.data?.can_request && <p>Selecciona los registros con las casillas del maestro y usa la barra «Solicitar apoyo JDH».</p>}
    {context === "commercial" && (support.state !== "vigente" || support.needs_review) && <p>Solo se puede solicitar sobre un acuerdo vigente, habilitado y sin revisión pendiente.</p>}
    {context === "manage" && permissions.data?.can_manage && <Button variant="outline" disabled={action !== null} onClick={() => { setAction("cancel"); onEditingChange(true); }}>Cancelar solo aporte JDH</Button>}
    {context === "manage" && permissions.data?.can_review && <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>Historial JDH</Button>}
    {showHistory && (history.isPending ? <p aria-busy="true">Cargando historial…</p> : history.isError ? <p role="alert">{errorMessage(history.error)} <Button onClick={() => void history.refetch()}>Reintentar</Button></p> : <JdhEvents events={history.data ?? []} />)}
    {action && <JdhForm key={`${support.id}-${action}`} initial={support} kind={action} onSaved={() => onEditingChange(false)} onClose={() => { setAction(null); onEditingChange(false); }} />}
  </section>;
}
function JdhForm({ initial, kind, onClose, onSaved }: { initial: SupplierSupport; kind: "create" | "cancel"; onClose: () => void; onSaved: () => void }) {
  const detail = useSupport(initial.id);
  const [version, setVersion] = useState(initial.version);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [conflict, setConflict] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [discard, setDiscard] = useState(false);
  const mutation = useRequestAction();
  const support = detail.data ?? initial;
  const net = support.calc_method === "costo_neto";
  const numeric = requestValue(value, net);
  const valid = kind === "cancel" || numeric !== null;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || reason.trim().length < 3 || !confirmed || version !== support.version || mutation.isPending) return;
    try {
      await mutation.mutateAsync(kind === "create" ? { kind, id: support.id, version, value: numeric!, reason: reason.trim() } : { kind, id: support.id, version, reason: reason.trim() });
      setMessage(kind === "create" ? "Solicitud enviada. El maestro no cambia hasta su aprobación." : "Aporte JDH cancelado. Se conserva el acuerdo y el aporte del proveedor.");
      onSaved();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) { setConflict(true); setConfirmed(false); await detail.refetch(); }
    }
  }
  if (message) return <div className="space-y-3"><Alert severity="success">{message}</Alert><Button variant="outline" onClick={onClose}>Cerrar</Button></div>;
  return <><form onSubmit={submit} className="space-y-3 border-t border-border pt-3">
    <h4 className="font-medium">{kind === "create" ? "Nueva solicitud individual" : "Cancelar únicamente JDH"}</h4>
    <p>Registro {support.id} · {support.product_sku ?? "Todos los productos"} · {support.customer_name ?? "Todos los clientes"}</p>
    <JdhValues support={support} />
    {kind === "create" ? <label className="block">{net ? `Costo pactado JDH (${support.value_unit ?? "sin unidad"})` : "Porcentaje JDH (%)"}<Input required type="number" min={net ? 0 : -100} max={net ? undefined : 100} step="any" value={value} onChange={e => { setValue(e.target.value); setConfirmed(false); }} /><span className="text-xs text-text-secondary">{net ? "Hasta 6 decimales; importe menor a 10¹²." : "Entre -100 y 100 %, hasta 4 decimales. Ejemplo: 5 equivale a 5 %."}</span>{value && !valid && <span role="alert" className="block text-danger">Revisa el rango y los decimales del valor.</span>}</label> : <p>El costo del proveedor vuelve a regir. Esta acción conserva el acuerdo y su historial.</p>}
    <label className="block">{kind === "create" ? "Justificación" : "Motivo de cancelación"}<Textarea required minLength={3} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label>
    {conflict && <div role="alert" className="space-y-2"><p>El acuerdo cambió (409). Revisa el valor vigente y confirma nuevamente.</p><JdhValues support={support} />{detail.isError && <p>{errorMessage(detail.error)}</p>}</div>}
    {mutation.isError && <p role="alert" className="text-danger">{errorMessage(mutation.error)}</p>}
    <label className="flex gap-2"><input type="checkbox" checked={confirmed && version === support.version} disabled={detail.isFetching || detail.isError} onChange={e => { setConfirmed(e.target.checked); if (e.target.checked) setVersion(support.version); }} />Confirmo la acción sobre los valores vigentes mostrados (versión {support.version}).</label>
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => { if (value || reason) setDiscard(true); else onClose(); }}>Volver</Button><Button type="submit" disabled={!valid || reason.trim().length < 3 || !confirmed || version !== support.version || detail.isFetching || detail.isError || mutation.isPending || (kind === "create" && (support.state !== "vigente" || support.needs_review))}>{mutation.isPending ? "Enviando…" : kind === "create" ? "Enviar solicitud" : "Confirmar cancelación JDH"}</Button></div>
  </form><DiscardDialog open={discard} onCancel={() => setDiscard(false)} onDiscard={onClose} /></>;
}
