import { currentJdhValue, formatRequestValue, requestModeLabel } from "../lib/request-values";
import type { RequestDetail, RequestMode } from "../types/request.types";
import type { SupplierSupport } from "../types/support.types";

/** The support's JDH value for what is asked; a new request asks for the authorized minimum margin. */
export function CurrentJdh({ support, mode = "margen_minimo" }: { support: Partial<SupplierSupport>; mode?: RequestMode }) {
  return <span>{formatRequestValue(currentJdhValue(support, mode), mode)}{mode === "costo_neto" && support.value_unit ? ` / ${support.value_unit}` : ""}</span>;
}

export default function RequestJdhValues({ request }: { request: RequestDetail }) {
  const label = requestModeLabel(request);
  return <div className="space-y-2">
    <p className="text-sm text-text-secondary">Se pide: {label}</p>
    <dl className="grid gap-4 rounded-lg bg-canvas-subtle p-4 sm:grid-cols-3">
      <div><dt className="text-sm text-text-secondary">Al solicitar</dt><dd className="mt-1 font-semibold tabular-nums"><CurrentJdh support={request.snapshot} mode={request.mode} /></dd></div>
      <div><dt className="text-sm text-text-secondary">Vigente</dt><dd className="mt-1 font-semibold tabular-nums"><CurrentJdh support={request.support} mode={request.mode} /></dd></div>
      <div><dt className="text-sm text-text-secondary">Propuesto</dt><dd className="mt-1 font-semibold tabular-nums">{formatRequestValue(request.value, request.mode)}{request.mode === "costo_neto" && request.snapshot.value_unit ? ` / ${request.snapshot.value_unit}` : ""}</dd></div>
    </dl>
  </div>;
}
