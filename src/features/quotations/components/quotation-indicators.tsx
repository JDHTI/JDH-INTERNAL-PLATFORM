"use client";

import { cn } from "@/shared/lib/utils";

import { formatCount } from "../lib/format";
import { INDICATORS, type Indicator } from "../lib/line-status";
import type { QuotationLine } from "../types/quotations.types";

const ITEMS: { key: Indicator; label: string; tone?: "success" | "warning" | "danger"; help: string }[] = [
  { key: "all", label: "Líneas totales", help: "Todas las referencias de la cotización." },
  {
    key: "objetivo",
    label: "Cumplen objetivo",
    tone: "success",
    help: "El precio nuevo, o el último si aún no tiene, deja el margen con apoyo en el objetivo o por encima.",
  },
  {
    key: "rango",
    label: "En rango (autonomía)",
    tone: "warning",
    help: "Entre el mínimo y el objetivo: se puede confirmar, pero queda por debajo del margen ideal.",
  },
  {
    key: "minimo",
    label: "Inferior al mínimo",
    tone: "danger",
    help: "Por debajo del margen mínimo. Con precio nuevo así no se puede confirmar.",
  },
  { key: "sin_referencia", label: "Sin precio de referencia", help: "El cliente no la compró en la ventana: no hay último precio." },
  { key: "local", label: "Sin SKU en SIESA", help: "Productos creados solo para cotizar. No salen en el Excel ni en el plano." },
  { key: "sin_precio", label: "Sin precio nuevo", help: "Referencias activas a las que aún no se les escribe precio." },
  { key: "apoyo", label: "Con apoyo aplicado", help: "Referencias con un apoyo del proveedor que entra en el margen." },
];

const TONE_TEXT = { success: "text-success", warning: "text-warning", danger: "text-danger" } as const;
const TONE_BAR = { success: "bg-success", warning: "bg-warning", danger: "bg-danger" } as const;

/**
 * How the quotation stands at a glance, and the way into each group: every
 * figure is a filter for the table below (pressed reads as selected). The bar
 * splits the lines that the rule can judge into the three standings; its
 * labels are the figures under it, so it never carries meaning by color alone.
 */
export default function QuotationIndicators({
  lines,
  active,
  onSelect,
}: {
  lines: QuotationLine[];
  active: Indicator | null;
  onSelect: (indicator: Indicator) => void;
}) {
  const counts = Object.fromEntries(ITEMS.map((item) => [item.key, lines.filter(INDICATORS[item.key]).length])) as Record<Indicator, number>;
  const judged = counts.objetivo + counts.rango + counts.minimo;

  return (
    <section aria-label="Indicadores de la cotización" className="space-y-3 rounded-lg border border-border bg-surface p-3">
      <div className="space-y-1.5">
        <div
          className="flex h-2 overflow-hidden rounded-full bg-canvas-subtle"
          role="img"
          aria-label={
            judged === 0
              ? "Aún no hay precios que evaluar contra la regla."
              : `${formatCount(counts.objetivo)} cumplen el objetivo, ${formatCount(counts.rango)} en rango y ${formatCount(counts.minimo)} bajo el mínimo.`
          }
        >
          {(["objetivo", "rango", "minimo"] as const).map((key, index) => {
            const tone = (["success", "warning", "danger"] as const)[index];
            return counts[key] > 0 ? (
              <span key={key} className={TONE_BAR[tone]} style={{ width: `${(counts[key] / judged) * 100}%` }} />
            ) : null;
          })}
        </div>
        <p className="text-[13px] text-text-secondary">Según el precio nuevo de cada línea, o el último si aún no tiene. Toca una cifra para filtrar la tabla.</p>
      </div>

      <div className="grid grid-cols-2 gap-1 @2xl:grid-cols-4">
        {ITEMS.map((item) => {
          const pressed = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={pressed}
              onClick={() => onSelect(item.key)}
              title={item.help}
              className={cn(
                "flex min-h-14 flex-col items-start justify-center rounded-md border px-3 py-1.5 text-left transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                pressed ? "border-primary bg-primary-subtle" : "border-transparent hover:bg-canvas-subtle"
              )}
            >
              <span className={cn("text-xl font-semibold leading-7 tabular-nums", item.tone && counts[item.key] > 0 && TONE_TEXT[item.tone])}>
                {formatCount(counts[item.key])}
              </span>
              <span className="text-[13px] leading-4 text-text-secondary">{item.label}</span>
              <span className="sr-only">. {item.help}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
