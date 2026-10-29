"use client";

import { useState } from "react";
import Link from "next/link";
import Pager from "@/shared/components/pager";
import { Button } from "@/shared/components/ui/button";
import { Dialog } from "@/shared/components/ui/dialog";
import { Dropdown } from "@/shared/components/ui/dropdown";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { useRequest, useRequestAction, useRequests } from "../hooks/use-requests";
import { useSupportPermissions } from "../hooks/use-supports";
import { formatRequestValue } from "../lib/request-values";
import type { RequestStatus } from "../types/request.types";
import { dateTime, JdhEvents, JdhValues } from "./jdh-support";

const statuses = [{ value: "", label: "Todos los estados" }, { value: "pendiente", label: "Pendientes" }, { value: "aprobada", label: "Aprobadas" }, { value: "rechazada", label: "Rechazadas" }];
export default function RequestsBrowser({ review = false }: { review?: boolean }) {
  const permissions = useSupportPermissions();
  const allowed = review ? permissions.data?.can_review === true : permissions.data?.can_request === true;
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(review ? "pendiente" : "");
  const [text, setText] = useState("");
  const [id, setId] = useState<string | null>(null);
  const q = useDebouncedValue(text.trim());
  const query = useRequests({ page, size: 25, status: (status || undefined) as RequestStatus | undefined, q, mine: !review }, allowed, review ? "review" : "own");
  if (permissions.isPending) return <p aria-busy="true">Validando permisos…</p>;
  if (permissions.isError) return <p role="alert">{errorMessage(permissions.error)} <Button onClick={() => void permissions.refetch()}>Reintentar</Button></p>;
  if (!allowed) return <p role="alert">No tienes permiso para consultar esta bandeja.</p>;
  return <div className="space-y-4">
    <Link className="underline" href={review ? "/bi/apoyos" : "/comercial/apoyos"}>Volver al maestro de apoyos</Link>
    <div className="flex flex-col gap-3 sm:flex-row"><Input aria-label="Buscar solicitudes" type="search" maxLength={100} placeholder="Buscar solicitudes" value={text} onChange={e => { setText(e.target.value); setPage(1); }} /><Dropdown aria-label="Estado de solicitud" value={status} options={statuses} onValueChange={value => { setStatus(value); setPage(1); }} /><Button variant="outline" onClick={() => void query.refetch()}>Recargar</Button></div>
    {query.isPending ? <p aria-busy="true">Cargando solicitudes…</p> : query.isError ? <p role="alert" className="text-danger">{errorMessage(query.error)}</p> : <>
      {query.data.items.length === 0 && <p>No hay solicitudes para estos filtros.</p>}
      <div className="grid gap-3 md:grid-cols-2">{query.data.items.map(item => <button key={item.id} type="button" className="space-y-2 rounded-lg border border-border bg-surface p-4 text-left hover:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-ring" onClick={() => setId(item.id)}>
        <span className="block font-semibold">{item.snapshot.supplier_name ?? "Solicitud JDH"} · {item.status}</span>
        <span className="block text-sm">{item.snapshot.product_sku ?? "Todos los productos"} · {item.snapshot.customer_name ?? "Todos los clientes"}</span>
        <span className="block">Propuesta: {formatRequestValue(item.value, item.mode === "costo_neto")}</span>
        <span className="block text-sm text-text-secondary">{dateTime(item.created_at)} · {item.requested_by}</span><span className="block line-clamp-2 text-sm">{item.reason}</span>
      </button>)}</div>
      <Pager page={query.data.page} size={query.data.size} total={query.data.total} count={query.data.items.length} onPageChange={setPage} />
    </>}
    {id && <RequestDialog key={id} id={id} review={review} onClose={() => setId(null)} />}
  </div>;
}
function RequestDialog({ id, review, onClose }: { id: string; review: boolean; onClose: () => void }) {
  const query = useRequest(id, !review);
  const permission = useSupportPermissions();
  const mutation = useRequestAction();
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState("");
  const data = query.data;
  const revision = data ? `${data.version}:${data.support.version}` : "";
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!data || !decision || confirmed !== revision || mutation.isPending || (decision === "reject" && reason.trim().length < 3)) return;
    try {
      await mutation.mutateAsync(decision === "approve" ? { kind: "approve", id, version: data.version, support_version: data.support.version } : { kind: "reject", id, version: data.version, reason: reason.trim() });
      setDecision(null); setConfirmed(null); setNotice("Decisión registrada."); await query.refetch();
    } catch (error) {
      setConfirmed(null);
      if (error instanceof ApiError && error.status === 409) { setConflict(true); await query.refetch(); }
    }
  }
  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending && (!decision || window.confirm("¿Descartar esta decisión sin enviarla?"))) onClose(); }} title="Solicitud de apoyo JDH" isForm wide>
    {query.isPending ? <p aria-busy="true">Cargando solicitud…</p> : query.isError ? <p role="alert">{errorMessage(query.error)} <Button onClick={() => void query.refetch()}>Reintentar</Button></p> : data && <div className="space-y-4">
      <p>{data.status} · {data.requested_by} · {dateTime(data.created_at)}</p>
      <p className="whitespace-pre-wrap">Justificación: {data.reason}</p>
      <div className="grid gap-4 sm:grid-cols-2"><section><h3 className="font-semibold">Acuerdo al solicitar</h3><JdhValues support={data.snapshot} /></section><section><h3 className="font-semibold">Acuerdo vigente</h3><JdhValues support={data.support} /></section></div>
      <p className="font-semibold">Propuesta inmutable: {formatRequestValue(data.value, data.mode === "costo_neto")} · {data.snapshot.value_unit ?? "sin unidad"}</p>
      {data.decided_at && <p>Decisión: {data.decided_by} · {dateTime(data.decided_at)} · {data.decision_reason ?? "Sin motivo adicional"}</p>}
      {notice && <p role="status">{notice}</p>}
      {conflict && <p role="alert" className="text-danger">La versión cambió (409). Se recargaron los datos. Compara los valores y confirma nuevamente.</p>}
      {review && permission.data?.can_review && data.status === "pendiente" && <form onSubmit={submit} className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { setDecision("approve"); setConfirmed(null); }}>Aprobar valor solicitado</Button><Button type="button" variant="outline" onClick={() => { setDecision("reject"); setConfirmed(null); }}>Rechazar</Button></div>
        {decision && <>{decision === "reject" && <label className="block">Motivo de rechazo<Textarea required minLength={3} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></label>}
          <label className="flex gap-2"><input type="checkbox" checked={confirmed === revision} disabled={query.isFetching} onChange={e => setConfirmed(e.target.checked ? revision : null)} />Revisé el valor vigente y confirmo {decision === "approve" ? "aprobar exactamente la propuesta" : "rechazar la solicitud"}.</label>
          <Button type="submit" disabled={confirmed !== revision || mutation.isPending || query.isFetching || (decision === "reject" && reason.trim().length < 3)}>{mutation.isPending ? "Guardando…" : "Confirmar decisión"}</Button>
        </>}
      </form>}
      {mutation.isError && <p role="alert" className="text-danger">{errorMessage(mutation.error)}</p>}
      <h3 className="font-semibold">Historial de la solicitud</h3><JdhEvents events={data.events} />
    </div>}
  </Dialog>;
}
