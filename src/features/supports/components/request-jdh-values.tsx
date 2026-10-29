import { formatRequestValue } from "../lib/request-values";
import type { RequestDetail } from "../types/request.types";
import type { SupplierSupport } from "../types/support.types";

export function CurrentJdh({ support }: { support: Partial<SupplierSupport> }) {
  const net = support.calc_method === "costo_neto";
  return <span>{formatRequestValue(net ? support.jdh_net_cost : support.jdh_pct, net)}{net && support.value_unit ? ` / ${support.value_unit}` : ""}</span>;
}

export default function RequestJdhValues({ request }: { request: RequestDetail }) {
  return <dl className="grid gap-4 rounded-lg bg-canvas-subtle p-4 sm:grid-cols-3">
    <div><dt className="text-sm text-text-secondary">JDH al solicitar</dt><dd className="mt-1 font-semibold tabular-nums"><CurrentJdh support={request.snapshot} /></dd></div>
    <div><dt className="text-sm text-text-secondary">JDH vigente</dt><dd className="mt-1 font-semibold tabular-nums"><CurrentJdh support={request.support} /></dd></div>
    <div><dt className="text-sm text-text-secondary">JDH propuesto</dt><dd className="mt-1 font-semibold tabular-nums">{formatRequestValue(request.value, request.mode === "costo_neto")}{request.mode === "costo_neto" && request.snapshot.value_unit ? ` / ${request.snapshot.value_unit}` : ""}</dd></div>
  </dl>;
}
