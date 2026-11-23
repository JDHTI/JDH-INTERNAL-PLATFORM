"use client";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { formatRequestValue, REQUEST_MODE_LABELS } from "../lib/request-values";
import type { SupportRequest } from "../types/request.types";
import { dateTime } from "./jdh-support";
import { requestSupplier } from "../lib/request-label";

/**
 * JDH requests on a support, one per row. With `selection`, a first column ticks them (each row
 * and the page); with `onOpen`, the last one opens it.
 */
export default function RequestRows({
  items,
  onOpen,
  selection,
}: {
  items: SupportRequest[];
  onOpen?: (id: string) => void;
  selection?: { ticked: Set<string>; onToggle: (id: string) => void; onTogglePage: () => void };
}) {
  const pageTicked = items.length > 0 && items.every((item) => selection?.ticked.has(item.id));
  return <div className="overflow-x-auto rounded-lg border border-border bg-surface">
    <table className="w-full min-w-max text-left text-sm">
      <caption className="sr-only">Solicitudes de apoyo JDH</caption>
      <thead className="bg-canvas-subtle text-xs font-semibold text-text-secondary"><tr>
        {selection && <th scope="col" className="w-10 px-3 py-3">
          <input type="checkbox" aria-label="Seleccionar las solicitudes de esta página" checked={pageTicked} onChange={selection.onTogglePage} className="size-4 accent-[var(--primary)]" />
        </th>}
        {["Solicitud", "Cliente", "Referencia", "Propuesto", "Estado", "Solicitante / fecha", ...(onOpen ? ["Acciones"] : [])].map(label => <th key={label} scope="col" className={`px-3 py-3 ${label === "Propuesto" ? "text-center" : ""}`}>{label}</th>)}
      </tr></thead>
      <tbody className="divide-y divide-border">{items.map(item => <tr key={item.id} className="align-middle hover:bg-canvas-subtle">
        {selection && <td className="px-3 py-3">
          <input type="checkbox" aria-label={`Seleccionar la solicitud de ${requestSupplier(item)} sobre ${item.snapshot.product_sku ?? "todos los productos"}`} checked={selection.ticked.has(item.id)} onChange={() => selection.onToggle(item.id)} className="size-4 accent-[var(--primary)]" />
        </td>}
        <td className="px-3 py-3 font-medium">Margen JDH · {requestSupplier(item)}</td>
        <td className="px-3 py-3"><p>{item.snapshot.customer_name ?? item.snapshot.customer_group ?? "Todos los clientes"}</p><p className="text-text-secondary">NIT {item.snapshot.customer_nit ?? "sin NIT"}</p></td>
        <td className="px-3 py-3 font-mono">{item.snapshot.product_sku ?? "Todos los productos"}</td>
        <td className="px-3 py-3 text-center tabular-nums">{formatRequestValue(item.value, item.mode)}{item.mode === "costo_neto" && item.snapshot.value_unit ? ` / ${item.snapshot.value_unit}` : ""}<span className="block text-xs text-text-secondary">{REQUEST_MODE_LABELS[item.mode] ?? item.mode}</span></td>
        <td className="px-3 py-3"><Badge tone={item.status === "aprobada" ? "success" : item.status === "rechazada" ? "danger" : "warning"}>{item.status === "aprobada" ? "Aprobada" : item.status === "rechazada" ? "Rechazada" : "Pendiente"}</Badge></td>
        <td className="px-3 py-3"><p>{item.requested_by}</p><p className="mt-1 text-xs text-text-secondary">{dateTime(item.created_at)}</p></td>
        {onOpen && <td className="px-3 py-3 text-right"><Button variant="outline" size="sm" onClick={() => onOpen(item.id)} aria-label={`Ver solicitud ${item.id}`}>Ver solicitud</Button></td>}
      </tr>)}</tbody>
    </table>
  </div>;
}
