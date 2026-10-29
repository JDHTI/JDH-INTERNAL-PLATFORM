"use client";
import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogFooter } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ApiError, errorMessage } from "@/shared/lib/api-client";
import { useBatchRequests } from "../hooks/use-requests";
import { supportKeys } from "../hooks/use-supports";
import { getSupport } from "../services/supports.service";
import { requestSelectionError } from "../lib/request-selection";
import { requestValue } from "../lib/request-values";
import type { SupplierSupport } from "../types/support.types";
import { JdhValues } from "./jdh-support";
import DiscardDialog from "./discard-dialog";

export default function BatchRequestDialog({ records, onClose, onSuccess }: { records: SupplierSupport[]; onClose: () => void; onSuccess: () => void }) {
  const queries = useQueries({ queries: records.map(record => ({ queryKey: supportKeys.detail(record.id), queryFn: () => getSupport(record.id), retry: false, staleTime: 0 })) });
  const current = records.map((record, index) => queries[index].data ?? record);
  const [drafts, setDrafts] = useState<Record<string, { value: string; reason: string }>>(() => Object.fromEntries(records.map(record => [record.id, { value: "", reason: "" }])));
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const [conflict, setConflict] = useState(false);
  const mutation = useBatchRequests();
  const revision = JSON.stringify(current.map(record => [record.id, record.version]));
  const loading = queries.some(query => query.isPending || query.isFetching);
  const failed = queries.some(query => query.isError);
  const scopeError = requestSelectionError(current);
  const items = current.map(record => ({ support_id: record.id, version: record.version, value: requestValue(drafts[record.id].value, record.calc_method === "costo_neto"), reason: drafts[record.id].reason.trim() }));
  const valid = !scopeError && items.every(item => item.value !== null && item.reason.length >= 3 && item.reason.length <= 2000);
  const dirty = Object.values(drafts).some(draft => draft.value || draft.reason);
  const close = () => { if (mutation.isPending) return; if (dirty) setDiscard(true); else onClose(); };
  function update(id: string, key: "value" | "reason", value: string) { setDrafts(old => ({ ...old, [id]: { ...old[id], [key]: value } })); setConfirmed(null); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || failed || loading || confirmed !== revision || mutation.isPending) return;
    try {
      await mutation.mutateAsync(items.map(item => ({ ...item, value: item.value! })));
      onSuccess();
    } catch (error) {
      setConfirmed(null);
      if (error instanceof ApiError && error.status === 409) { setConflict(true); await Promise.all(queries.map(query => query.refetch())); }
    }
  }
  return <><Dialog open title={`Solicitar apoyo JDH (${records.length})`} description="Cada registro conserva su valor, unidad y solicitud independiente. Se envían todos juntos; si uno falla, no se crea ninguna solicitud." onOpenChange={open => { if (!open) close(); }} isForm wide>
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm">Proveedor: {current[0]?.supplier_name ?? current[0]?.supplier_code} · Cliente: {current[0]?.customer_name ?? current[0]?.customer_group ?? "Todos los clientes"} · NIT {current[0]?.customer_nit ?? "sin NIT"}</p>
      {current.map((record, index) => <fieldset key={record.id} className="space-y-3 rounded-lg border border-border p-4" disabled={mutation.isPending}>
        <legend className="px-1 font-semibold">{record.product_sku ? `SKU ${record.product_sku}` : "Todos los productos"} · {record.program ?? record.id}</legend>
        <JdhValues support={record} />
        {queries[index].isError && <p role="alert" className="text-danger">{errorMessage(queries[index].error)} <Button type="button" variant="outline" onClick={() => void queries[index].refetch()}>Recargar</Button></p>}
        <label className="block text-sm">{record.calc_method === "costo_neto" ? `Costo pactado JDH (${record.value_unit ?? "sin unidad"})` : "Porcentaje JDH (%)"}<Input type="number" required min={record.calc_method === "costo_neto" ? 0 : -100} max={record.calc_method === "costo_neto" ? undefined : 100} step="any" value={drafts[record.id].value} onChange={event => update(record.id, "value", event.target.value)} /><span className="text-xs text-text-secondary">{record.calc_method === "costo_neto" ? "Importe menor a 10¹², hasta 6 decimales." : "Entre -100 y 100 %, hasta 4 decimales. 5 equivale a 5 %."}</span></label>
        {drafts[record.id].value && items[index].value === null && <p role="alert" className="text-sm text-danger">Revisa el rango y los decimales del valor.</p>}
        <label className="block text-sm">Justificación<Textarea required minLength={3} maxLength={2000} value={drafts[record.id].reason} onChange={event => update(record.id, "reason", event.target.value)} /></label>
      </fieldset>)}
      {scopeError && <p role="alert" className="text-danger">{scopeError}</p>}
      {conflict && <p role="alert" className="text-danger">Cambió al menos un acuerdo (409). Revisa los valores recargados y confirma otra vez antes de enviar el conjunto.</p>}
      {mutation.isError && <p role="alert" className="text-danger">{errorMessage(mutation.error)} No se confirmó la creación del conjunto.</p>}
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed === revision} disabled={loading || failed || mutation.isPending} onChange={event => setConfirmed(event.target.checked ? revision : null)} />Revisé los valores vigentes y confirmo estas propuestas por registro.</label>
      <DialogFooter><Button type="button" variant="outline" disabled={mutation.isPending} onClick={close}>Volver</Button><Button type="submit" disabled={!valid || loading || failed || confirmed !== revision || mutation.isPending}>{mutation.isPending ? "Enviando…" : `Enviar ${records.length} solicitudes`}</Button></DialogFooter>
    </form>
  </Dialog><DiscardDialog open={discard} onCancel={() => setDiscard(false)} onDiscard={onClose} /></>;
}
