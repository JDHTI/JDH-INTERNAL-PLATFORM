"use client";

import { cn } from "@/shared/lib/utils";

import { formatCount } from "../lib/format";
import { INDICATORS, type Indicator } from "../lib/line-status";
import type { QuotationLine } from "../types/quotations.types";

/** The three standings (with a tone) explain a margin: no tooltip in the commercial view. */
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

type Item = (typeof ITEMS)[number];

/** A list update's words where they differ: its reference is the list's price in force, not a sale. */
const LIST_COPY: Partial<Record<Indicator, Item>> = {
  objetivo: {
    key: "objetivo",
    label: "Cumplen objetivo",
    tone: "success",
    help: "El precio nuevo, o el de la lista si aún no tiene, deja el margen con apoyo en el objetivo o por encima.",
  },
  sin_referencia: { key: "sin_referencia", label: "Sin precio en la lista", help: "La lista no tiene precio vigente: el precio nuevo la agrega." },
  all: { key: "all", label: "Líneas totales", help: "Todas las referencias de la actualización." },
};

const TONE_TEXT = { success: "text-success", warning: "text-warning", danger: "text-danger" } as const;
const TONE_BAR = { success: "bg-success", warning: "bg-warning", danger: "bg-danger" } as const;

/**
 * How the quotation stands at a glance: a summary, not a control. Filtering is
 * the toolbar's job (and «Más filtros»), so the figures do not click. The bar,
 * on its own above the cards, splits the lines the rule can judge into the
 * three standings; the cards under it are its labels, so it never carries
 * meaning by color alone. One card per figure: eight in a row on a wide
 * container, four or two on narrower ones.
 */
export default function QuotationIndicators({
  lines,
  forList = false,
  marginHints = true,
}: {
  lines: QuotationLine[];
  forList?: boolean;
  /** False in the commercial view: the bar and the standings say nothing on hover. */
  marginHints?: boolean;
}) {
  // A list update has no products only for quoting, and its reference price is the list's.
  const items = forList ? ITEMS.filter((item) => item.key !== "local").map((item) => LIST_COPY[item.key] ?? item) : ITEMS;
  const counts = Object.fromEntries(items.map((item) => [item.key, lines.filter(INDICATORS[item.key]).length])) as Record<Indicator, number>;
  const judged = counts.objetivo + counts.rango + counts.minimo;

  return (
    <section aria-label={forList ? "Indicadores de la actualización" : "Indicadores de la cotización"} className="space-y-3">
      {/* Square ends: a proportion, not a pill. */}
      <div
        className="flex h-2.5 overflow-hidden bg-canvas-subtle"
        role="img"
        aria-label={
          judged === 0
            ? "Aún no hay precios que evaluar contra la regla."
            : `${formatCount(counts.objetivo)} cumplen el objetivo, ${formatCount(counts.rango)} en rango y ${formatCount(counts.minimo)} bajo el mínimo.`
        }
        title={marginHints ? `Según el precio nuevo de cada línea, o ${forList ? "el de la lista" : "el último"} si aún no tiene.` : undefined}
      >
        {(["objetivo", "rango", "minimo"] as const).map((key, index) => {
          const tone = (["success", "warning", "danger"] as const)[index];
          return counts[key] > 0 ? (
            <span key={key} className={TONE_BAR[tone]} style={{ width: `${(counts[key] / judged) * 100}%` }} />
          ) : null;
        })}
      </div>
      <dl className={cn("grid grid-cols-2 gap-3 @2xl:grid-cols-4", forList ? "@6xl:grid-cols-7" : "@6xl:grid-cols-8")}>
        {items.map((item) => (
          <div key={item.key} className="min-w-0 space-y-1 rounded-lg border border-border bg-surface px-3 py-2.5"
            title={item.tone && !marginHints ? undefined : item.help}
          >
            <dt className="truncate text-[13px] text-text-secondary">{item.label}</dt>
            <dd className={cn("text-2xl font-semibold tabular-nums", item.tone && counts[item.key] > 0 && TONE_TEXT[item.tone])}>
              {formatCount(counts[item.key])}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
