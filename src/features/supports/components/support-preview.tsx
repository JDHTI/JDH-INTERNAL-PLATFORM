"use client";

import { Alert } from "@/shared/components/ui/alert";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useSupportPreview } from "../hooks/use-supports";
import { formatCop, formatPct, marginListLabel } from "../lib/format";
import type { PerUnit, SupportCreateBody, SupportDerived } from "../types/support.types";
import { NO_EFFECT_HELP } from "./support-badges";

const ROWS: [label: string, pick: (derived: SupportDerived | null | undefined) => PerUnit | null | undefined][] = [
  ["Costo", (derived) => derived?.cost],
  ["Precio lista", (derived) => derived?.list_price],
  ["Precio apoyado sugerido", (derived) => derived?.suggested_price_per],
  ["Precio apoyado mínimo", (derived) => derived?.supported_price_per],
];

/**
 * The figures the support would have, asked to the API while the form is
 * filled (`POST /preview`, nothing saved). `body` is null until there is a
 * supplier, a reference and a value: until then it says what is missing.
 */
export default function SupportPreview({ body, missing }: { body: SupportCreateBody | null; missing: string | null }) {
  // The body changes on every keystroke; the API is asked once typing stops.
  const settled = useDebouncedValue(body ? JSON.stringify(body) : null, 500);
  const preview = useSupportPreview(settled ? (JSON.parse(settled) as SupportCreateBody) : null);
  const support = body ? preview.data : undefined;
  const derived = support?.derived;
  const list = marginListLabel(support?.margin_list);

  return (
    <section aria-labelledby="support-preview-title" aria-busy={preview.isFetching} className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="support-preview-title" className="text-base font-semibold">Vista previa de las cifras</h2>
        <span className="text-[13px] text-text-secondary" aria-live="polite">
          {!body ? "" : preview.isFetching ? "Calculando…" : "Por unidad de inventario y por caja. No se guarda nada."}
        </span>
      </div>

      {!body ? (
        <p className="text-[13px] text-text-secondary">{missing ?? "Completa el apoyo para ver sus cifras."}</p>
      ) : preview.isError && !support ? (
        <p role="alert" className="text-sm text-danger">{errorMessage(preview.error)}</p>
      ) : !support ? (
        <div className="h-24 animate-pulse rounded-md bg-canvas-subtle" aria-label="Calculando las cifras" />
      ) : (
        <div className={cn("space-y-3", preview.isFetching && "opacity-60")}>
          {preview.isError && <p role="alert" className="text-sm text-danger">{errorMessage(preview.error)}</p>}
          {derived?.support_above_cost && (
            <Alert severity="warning">
              {NO_EFFECT_HELP} Revisa el valor: así como está, el precio sugerido queda en el precio lista.
            </Alert>
          )}
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Cifras del apoyo antes de guardarlo</caption>
              <thead className="bg-canvas-subtle text-xs font-semibold text-text-secondary">
                <tr>
                  <th scope="col" className="px-3 py-2">Concepto</th>
                  <th scope="col" className="px-3 py-2 text-right">Unidad</th>
                  <th scope="col" className="px-3 py-2 text-right">Caja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border tabular-nums">
                {ROWS.map(([label, pick]) => (
                  <tr key={label}>
                    <td className="px-3 py-2">{label}</td>
                    <td className="px-3 py-2 text-right">{formatCop(pick(derived)?.unit)}</td>
                    <td className="px-3 py-2 text-right">{formatCop(pick(derived)?.box)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex gap-1.5">
              <dt className="text-text-secondary">Margen recompuesto</dt>
              <dd className="tabular-nums">{formatPct(derived?.margin_recomposed)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-text-secondary">Lista de margen</dt>
              <dd>{list ?? "—"}</dd>
            </div>
            {support.business_group && (
              <div className="flex gap-1.5">
                <dt className="text-text-secondary">Grupo empresarial</dt>
                <dd>{support.business_group}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </section>
  );
}
