"use client";

import { CheckCircle2, Clock3, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

import { useReviewLines } from "../hooks/use-list-review";
import { formatCount } from "../lib/format";
import { LIST_FILTERS, type ListFilter, MARGIN_FILTERS, REVIEW_FILTERS, reviewOf } from "../lib/list-review";
import type { Quotation, QuotationLine, ReviewStatus } from "../types/quotations.types";

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
 * Each figure filters the table; pressing it again shows every item.
 */
export function ListFilters({
  lines,
  active,
  onSelect,
}: {
  lines: QuotationLine[];
  active: ListFilter;
  onSelect: (filter: ListFilter) => void;
}) {
  const count = (key: Exclude<ListFilter, "all">) => lines.filter(LIST_FILTERS[key]).length;
  const toggle = (key: ListFilter) => onSelect(active === key ? "all" : key);
  return (
    <section aria-label="Estado de la actualización" className="grid gap-3 rounded-lg border border-border bg-surface p-3 @4xl:grid-cols-2">
      <div className="space-y-1">
        <h2 className="px-3 text-xs font-semibold uppercase tracking-[0.06em] text-text-secondary">Revisión de los ítems</h2>
        <div className="grid grid-cols-2 gap-1 @lg:grid-cols-5">
          <FilterButton label="Todos" count={lines.length} help="Todas las referencias de la actualización." pressed={active === "all"} onClick={() => onSelect("all")} />
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

/**
 * What can be done with the ticked items: say their price is ready, validate
 * them (only who validates) or take them back to unmarked. The API skips the
 * ones that cannot take the state and says why.
 */
export function ReviewBar({
  quotation,
  selected,
  canValidate,
  disabled,
  onDone,
}: {
  quotation: Quotation;
  selected: Set<string>;
  canValidate: boolean;
  disabled: boolean;
  onDone: () => void;
}) {
  const review = useReviewLines(quotation.id);
  const ticked = quotation.lines.filter((line) => selected.has(line.sku));
  if (ticked.length === 0) return null;
  const validated = ticked.filter((line) => reviewOf(line) === "validada").length;

  const run = (status: ReviewStatus) =>
    review.mutate(
      { version: quotation.version, skus: ticked.map((line) => line.sku), status },
      {
        onSuccess: (result) => {
          const skipped = result.skipped ?? [];
          const done = ticked.length - skipped.length;
          const verb = status === "validada" ? "validados" : status === "por_validar" ? "marcados por validar" : "desmarcados";
          if (skipped.length > 0) {
            toast.warning(
              `${formatCount(done)} ${verb}. ${formatCount(skipped.length)} no: ${skipped
                .slice(0, 3)
                .map((item) => `${item.sku} (${item.reason})`)
                .join("; ")}${skipped.length > 3 ? "…" : ""}`,
              { duration: 10_000 }
            );
          } else {
            toast.success(`${formatCount(done)} ${done === 1 ? "ítem" : "ítems"} ${verb}.`);
          }
          onDone();
        },
        onError: (failure) => toast.error(errorMessage(failure), { duration: Infinity }),
      }
    );

  const pending = review.isPending ? review.variables?.status : null;
  const spinner = (status: ReviewStatus) => (pending === status ? <Loader2 className="animate-spin" aria-hidden="true" /> : null);

  return (
    <div
      role="region"
      aria-label="Revisión de los ítems seleccionados"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
    >
      <span className="mr-auto text-sm font-medium tabular-nums">
        {formatCount(ticked.length)} {ticked.length === 1 ? "ítem seleccionado" : "ítems seleccionados"}
      </span>
      <Button variant="outline" onClick={() => run("por_validar")} disabled={disabled || review.isPending} className="max-md:h-11">
        {spinner("por_validar") ?? <Clock3 aria-hidden="true" />} Marcar por validar
      </Button>
      {canValidate && (
        <Button onClick={() => run("validada")} disabled={disabled || review.isPending} className="max-md:h-11">
          {spinner("validada") ?? <CheckCircle2 aria-hidden="true" />} Validar
        </Button>
      )}
      <Button
        variant="ghost"
        onClick={() => run("sin_marcar")}
        disabled={disabled || review.isPending || (!canValidate && validated === ticked.length)}
        title={!canValidate && validated > 0 ? "Los ítems validados solo los desmarca quien valida." : undefined}
        className="max-md:h-11"
      >
        {spinner("sin_marcar") ?? <Undo2 aria-hidden="true" />} Desmarcar
      </Button>
    </div>
  );
}
