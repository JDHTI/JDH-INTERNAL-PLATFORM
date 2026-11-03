"use client";

import { useId, useState } from "react";
import { Loader2, Percent, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";

import { useUpdateLines } from "../hooks/use-quotations";
import { formatCount, parseMarginInput } from "../lib/format";
import type { Quotation, SkippedLine } from "../types/quotations.types";

/**
 * Takes the selected references to one margin: the API turns the margin into
 * each one's price with the list's rounding, never under the minimum when the
 * margin passes the rule, and says which it could not price (no cost). Shown
 * while there is a selection; it also offers to extend it to every row of the
 * active filter.
 */
export default function MarginSelectionBar({
  quotation,
  selected,
  filteredSkus,
  onSelectionChange,
  disabled,
}: {
  quotation: Quotation;
  selected: Set<string>;
  /** Every reference the active filter and search show, across pages. */
  filteredSkus: string[];
  onSelectionChange: (next: Set<string>) => void;
  /** Prices unsaved or another write running: the margin needs the current version. */
  disabled: boolean;
}) {
  const update = useUpdateLines(quotation.id);
  const inputId = useId();
  const [margin, setMargin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<SkippedLine[]>([]);
  const count = selected.size;
  const allFiltered = filteredSkus.length > 0 && filteredSkus.every((sku) => selected.has(sku));

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = parseMarginInput(margin);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    setSkipped([]);
    const skus = [...selected];
    update.mutate(
      { version: quotation.version, lines: skus.map((sku) => ({ sku, margin_pct: parsed.value })) },
      {
        onSuccess: (updated) => {
          const left = updated.skipped ?? [];
          const done = skus.length - left.length;
          setSkipped(left);
          toast.success(
            `${done === 1 ? "1 referencia quedó" : `${formatCount(done)} referencias quedaron`} al ${margin.replace(/\s|%/g, "")} %.`
          );
          // What could not be priced stays selected, to see or fix; the rest is done.
          onSelectionChange(new Set(left.map((line) => line.sku).filter((sku): sku is string => sku !== null)));
          if (left.length === 0) setMargin("");
        },
        onError: (failure) => setError(errorMessage(failure)),
      }
    );
  };

  if (count === 0 && skipped.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border border-border-control bg-surface px-3 py-2" role="region" aria-label="Margen para la selección">
      <form onSubmit={apply} className="flex flex-wrap items-center gap-x-3 gap-y-2" noValidate>
        <span className="text-sm font-medium tabular-nums" aria-live="polite">
          {count === 1 ? "1 referencia seleccionada" : `${formatCount(count)} referencias seleccionadas`}
        </span>
        {!allFiltered && filteredSkus.length > count && (
          <Button variant="ghost" size="sm" onClick={() => onSelectionChange(new Set(filteredSkus))} className="max-md:h-11">
            Seleccionar las {formatCount(filteredSkus.length)} del filtro
          </Button>
        )}
        <div className="flex items-center gap-2 sm:ml-auto">
          <label htmlFor={inputId} className="text-sm">Margen</label>
          <div className="relative w-24">
            <Input
              id={inputId}
              inputMode="decimal"
              autoComplete="off"
              value={margin}
              onChange={(event) => {
                setMargin(event.target.value);
                setError(null);
              }}
              placeholder="30"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
              className="h-8 pr-7 text-right tabular-nums max-md:h-11"
              disabled={count === 0}
            />
            <Percent className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          </div>
          <Button type="submit" size="sm" disabled={disabled || count === 0 || update.isPending} className="max-md:h-11">
            {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
            Aplicar margen
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setSkipped([]);
              setError(null);
              onSelectionChange(new Set());
            }}
            aria-label="Quitar la selección"
            title="Quitar la selección"
            className="max-md:size-11"
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </form>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-[13px] text-danger">{error}</p>
      )}
      {skipped.length > 0 && (
        <p role="status" className="text-[13px] text-text-secondary">
          Sin precio ({formatCount(skipped.length)}): {skipped.map((line) => `${line.sku ?? "—"} (${line.reason})`).join(", ")}. Quedaron
          seleccionadas para revisarlas.
        </p>
      )}
    </div>
  );
}
