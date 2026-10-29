"use client";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { formatRequestValue } from "../lib/request-values";
import type { SupportRequest } from "../types/request.types";
import { dateTime } from "./jdh-support";

export default function RequestRows({ items, onOpen }: { items: SupportRequest[]; onOpen: (id: string) => void }) {
  return <div className="overflow-x-auto rounded-lg border border-border bg-surface">
    <table className="w-full min-w-max text-left text-sm">
      <caption className="sr-only">Solicitudes de apoyo JDH</caption>
      <thead className="bg-canvas-subtle text-xs font-semibold text-text-secondary"><tr>
        {["Solicitud / proveedor", "Cliente / NIT", "Referencia", "Modalidad / unidad", "Propuesta", "Estado", "Solicitante / fecha", "Justificación", "Decisión"].map(label => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}
      </tr></thead>
      <tbody className="divide-y divide-border">{items.map(item => <tr key={item.id} className="align-top hover:bg-canvas-subtle">
        <td className="px-3 py-3"><p className="font-medium">{item.snapshot.supplier_name ?? item.snapshot.supplier_code ?? "Apoyo JDH"}</p><p className="mt-1 font-mono text-xs">{item.id}</p><Button variant="ghost" size="sm" onClick={() => onOpen(item.id)} aria-label={`Ver solicitud ${item.id}`}>Ver solicitud</Button></td>
        <td className="px-3 py-3"><p>{item.snapshot.customer_name ?? item.snapshot.customer_group ?? "Todos los clientes"}</p><p className="text-text-secondary">NIT {item.snapshot.customer_nit ?? "sin NIT"}</p></td>
        <td className="px-3 py-3"><p className="font-mono">{item.snapshot.product_sku ?? "Todos los productos"}</p><p>{item.snapshot.program ?? "—"}</p></td>
        <td className="px-3 py-3"><p>{item.mode === "costo_neto" ? "Costo pactado JDH" : "Porcentaje JDH"}</p><p className="text-text-secondary">{item.snapshot.value_unit ?? "Sin unidad"}</p></td>
        <td className="px-3 py-3 text-right tabular-nums">{formatRequestValue(item.value, item.mode === "costo_neto")}</td>
        <td className="px-3 py-3"><Badge tone={item.status === "aprobada" ? "success" : item.status === "rechazada" ? "danger" : "warning"}>{item.status === "aprobada" ? "Aprobada" : item.status === "rechazada" ? "Rechazada" : "Pendiente"}</Badge></td>
        <td className="px-3 py-3"><p>{item.requested_by}</p><p className="mt-1 text-xs text-text-secondary">{dateTime(item.created_at)}</p></td>
        <td className="min-w-64 max-w-96 whitespace-pre-wrap break-words px-3 py-3">{item.reason}</td>
        <td className="min-w-56 max-w-96 whitespace-pre-wrap break-words px-3 py-3"><p>{item.decided_by ?? "—"}</p>{item.decided_at && <p className="my-1 text-xs text-text-secondary">{dateTime(item.decided_at)}</p>}{item.decision_reason && <p>{item.decision_reason}</p>}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
