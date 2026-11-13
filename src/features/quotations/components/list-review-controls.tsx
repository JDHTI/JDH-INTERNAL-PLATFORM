"use client";

import { cn } from "@/shared/lib/utils";

import { formatCount } from "../lib/format";
import { LIST_FILTERS, type ListFilter, MARGIN_FILTERS, REVIEW_FILTERS } from "../lib/list-review";
import type { QuotationLine } from "../types/quotations.types";

const TONE_TEXT = { success: "text-success", warning: "text-warning", danger: "text-danger" } as const;
const MARGIN_TONE: Record<string, keyof typeof TONE_TEXT | undefined> = { alza: "danger", objetivo: "success", alerta: "warning" };

function FilterButton({
  label,
  count,
  help,
  pressed,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  help: string;
  pressed: boolean;
  tone?: keyof typeof TONE_TEXT;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      title={help}
      className={cn(
        "flex min-h-14 flex-col items-start justify-center rounded-md border px-3 py-1.5 text-left transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        pressed ? "border-primary bg-primary-subtle" : "border-transparent hover:bg-canvas-subtle"
      )}
    >
      <span className={cn("text-xl font-semibold leading-7 tabular-nums", tone && count > 0 && TONE_TEXT[tone])}>{formatCount(count)}</span>
      <span className="text-[13px] leading-4 text-text-secondary">{label}</span>
      <span className="sr-only">. {help}</span>
    </button>
  );
}

/**
 * A list update at a glance, and the way into each group: the items by their
 * review, and by where the list's price leaves the margin against the target.
 * Each figure filters the table; pressing it again shows every item. The
 * review itself is changed on each item's chip, never here.
 */
export function ListFilters({
  lines = [],
  counts,
  total,
  active,
  onSelect,
}: {
  /** The lines to count, in the browser; or `counts` and `total` from the API (the board). */
  lines?: QuotationLine[];
  counts?: Record<string, number>;
  total?: number;
  active: ListFilter;
  onSelect: (filter: ListFilter) => void;
}) {
  const count = (key: Exclude<ListFilter, "all">) => (counts ? (counts[key] ?? 0) : lines.filter(LIST_FILTERS[key]).length);
  const toggle = (key: ListFilter) => onSelect(active === key ? "all" : key);
  return (
    <section aria-label="Estado de la actualización" className="grid gap-3 rounded-lg border border-border bg-surface p-3 @4xl:grid-cols-2">
      <div className="space-y-1">
        <h2 className="px-3 text-xs font-semibold uppercase tracking-[0.06em] text-text-secondary">Revisión de los ítems</h2>
        <div className="grid grid-cols-2 gap-1 @lg:grid-cols-5">
          <FilterButton
            label="Todos"
            count={total ?? lines.length}
            help="Todas las referencias, con los demás filtros."
            pressed={active === "all"}
            onClick={() => onSelect("all")}
          />
          {REVIEW_FILTERS.map((item) => (
            <FilterButton
              key={item.key}
              label={item.label}
              count={count(item.key)}
              help={`Ítems ${item.label.toLowerCase()}.`}
              pressed={active === item.key}
              onClick={() => toggle(item.key)}
            />
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <h2 className="px-3 text-xs font-semibold uppercase tracking-[0.06em] text-text-secondary">
          Margen del precio actual contra el objetivo (±0,5 puntos)
        </h2>
        <div className="grid grid-cols-2 gap-1 @lg:grid-cols-4">
          {MARGIN_FILTERS.map((item) => (
            <FilterButton
              key={item.key}
              label={item.label}
              count={count(item.key)}
              help={item.help}
              tone={MARGIN_TONE[item.key]}
              pressed={active === item.key}
              onClick={() => toggle(item.key)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
