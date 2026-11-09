"use client";

import { useId, useState } from "react";
import { AlertTriangle, ChevronDown, CircleSlash, Eraser, ListChecks, Loader2, Percent, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";

import { Badge, type BadgeTone } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import ConfirmDeleteDialog from "@/shared/components/ui/confirm-delete-dialog";
import { InfoPopover } from "@/shared/components/ui/info-popover";
import { Input } from "@/shared/components/ui/input";
import { errorMessage } from "@/shared/lib/api-client";
import { toNumber } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { useUpdateLines } from "../hooks/use-quotations";
import { formatCount, parseMarginInput } from "../lib/format";
import type { LineChange, Quotation, QuotationLine, SkippedLine } from "../types/quotations.types";

type Mode = "optimo" | "minimo" | "personalizado";

const MODES: { value: Mode; label: string }[] = [
  { value: "optimo", label: "Margen óptimo" },
  { value: "minimo", label: "Margen mínimo" },
  { value: "personalizado", label: "Personalizado" },
];

/** The price a mode gives a line, or why it gives none. Custom margins are priced by the API. */
function presetPrice(line: QuotationLine, mode: "optimo" | "minimo"): { price: string } | { reason: string } {
  if (line.origin === "local") return { reason: "producto solo para cotización, sin costo" };
  if (!line.is_active) return { reason: "inactiva en SIESA" };
  const price = mode === "optimo" ? line.optimal_price : line.min_price;
  if (toNumber(price) === null) return { reason: "sin costo o sin margen objetivo" };
  // Whole pesos already; the API rounds them that way.
  return { price: String(Math.round(Number(price))) };
}

/**
 * Prices many references at once, out in the open instead of behind the row
 * checkboxes: pick the margin (the product's optimal, its minimum, or one
 * typed here), choose the rows, apply. Optimal and minimum send each line's own
 * price; a custom margin goes to the API, which prices it with the support and
 * the list's rounding. What cannot be priced stays selected with its reason.
 */
export default function BulkPricingPanel({
  quotation,
  selected,
  filteredSkus,
  onSelectionChange,
  disabled,
}: {
  quotation: Quotation;
  selected: Set<string>;
  /** Every reference the active filters show, across pages. */
  filteredSkus: string[];
  onSelectionChange: (next: Set<string>) => void;
  /** Prices unsaved or another write running: a bulk write needs the current version. */
  disabled: boolean;
}) {
  const update = useUpdateLines(quotation.id);
  const clear = useUpdateLines(quotation.id);
  const id = useId();
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<Mode>("optimo");
  const [margin, setMargin] = useState("");
  const [marginInvalid, setMarginInvalid] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const count = selected.size;
  const selectedLines = quotation.lines.filter((line) => selected.has(line.sku));
  const withPrice = selectedLines.filter((line) => line.new_price !== null).map((line) => line.sku);
  const allFiltered = filteredSkus.length > 0 && filteredSkus.every((sku) => selected.has(sku));
  const countLabel = count === 1 ? "1 línea seleccionada" : `${formatCount(count)} líneas seleccionadas`;
  // Errors stay until dismissed (DESIGN.md §7.6); nothing is written under the panel.
  const fail = (message: string) => toast.error(message, { duration: Infinity });

  const finish = (sent: number, left: SkippedLine[], what: string) => {
    const done = sent - left.length;
    if (done > 0) toast.success(`${done === 1 ? "1 línea quedó" : `${formatCount(done)} líneas quedaron`} ${what}.`);
    if (left.length > 0) {
      toast.warning(
        `Sin precio (${formatCount(left.length)}): ${left.map((line) => `${line.sku ?? "—"} (${line.reason})`).join(", ")}. Quedaron seleccionadas para revisarlas.`,
        { duration: Infinity }
      );
    }
    // What could not be priced stays selected, to see or fix; the rest is done.
    onSelectionChange(new Set(left.map((line) => line.sku).filter((sku): sku is string => sku !== null)));
  };

  const apply = (event: React.FormEvent) => {
    event.preventDefault();

    if (mode === "personalizado") {
      const parsed = parseMarginInput(margin);
      if ("error" in parsed) {
        setMarginInvalid(true);
        fail(parsed.error);
        return;
      }
      const skus = [...selected];
      update.mutate(
        { version: quotation.version, lines: skus.map((sku) => ({ sku, margin_pct: parsed.value })) },
        {
          onSuccess: (updated) => {
            finish(skus.length, updated.skipped ?? [], `al ${margin.replace(/\s|%/g, "")} %`);
            if ((updated.skipped ?? []).length === 0) setMargin("");
          },
          onError: (failure) => fail(errorMessage(failure)),
        }
      );
      return;
    }

    const changes: LineChange[] = [];
    const left: SkippedLine[] = [];
    for (const line of selectedLines) {
      const result = presetPrice(line, mode);
      if ("price" in result) changes.push({ sku: line.sku, new_price: result.price });
      else left.push({ sku: line.sku, reason: result.reason });
    }
    if (changes.length === 0) {
      fail("Ninguna línea seleccionada tiene ese precio: les falta costo o margen objetivo.");
      return;
    }
    update.mutate(
      { version: quotation.version, lines: changes },
      {
        onSuccess: (updated) =>
          finish(selectedLines.length, [...left, ...(updated.skipped ?? [])], mode === "optimo" ? "en su precio óptimo" : "en su precio mínimo"),
        onError: (failure) => fail(errorMessage(failure)),
      }
    );
  };

  const runClear = () => {
    setClearError(null);
    clear.mutate(
      { version: quotation.version, lines: withPrice.map((sku) => ({ sku, new_price: null })) },
      {
        onSuccess: () => {
          setConfirmClear(false);
          toast.success(
            withPrice.length === 1 ? "Se limpió el precio nuevo de 1 línea." : `Se limpiaron los precios nuevos de ${formatCount(withPrice.length)} líneas.`
          );
          onSelectionChange(new Set());
        },
        onError: (failure) => setClearError(errorMessage(failure)),
      }
    );
  };

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2 pr-3">
        <h2 id={`${id}-title`} className="min-w-0 flex-1 text-base font-semibold">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls={`${id}-body`}
            className="flex min-h-12 w-full items-center gap-2 rounded-lg px-3 text-left hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronDown className={cn("size-4 shrink-0 text-text-secondary", !open && "-rotate-90")} aria-hidden="true" />
            <span>Asignación masiva de precio</span>
          </button>
        </h2>
        <span className="text-[13px] tabular-nums text-text-secondary" aria-live="polite">{countLabel}</span>
        <InfoPopover label="Alertas de margen" title="Cómo leer los márgenes">
          <MarginLegend />
        </InfoPopover>
      </div>

      {open && (
        <div id={`${id}-body`} className="border-t border-border p-3">
          <form onSubmit={apply} noValidate className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <fieldset className="space-y-1.5">
              <legend className="mb-1.5 text-[13px] font-medium">Asignar con</legend>
              <div className="flex flex-wrap gap-2">
                {MODES.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm max-md:min-h-11",
                      "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                      mode === option.value ? "border-primary bg-primary-subtle font-medium" : "border-border-control hover:bg-canvas-subtle"
                    )}
                  >
                    <input
                      type="radio"
                      name={`${id}-mode`}
                      value={option.value}
                      checked={mode === option.value}
                      onChange={() => {
                        setMode(option.value);
                        setMarginInvalid(false);
                      }}
                      className="size-4 accent-[var(--primary)]"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor={`${id}-margin`} className="block text-[13px] font-medium">Margen a aplicar</label>
              <div className="relative w-28">
                <Input
                  id={`${id}-margin`}
                  inputMode="decimal"
                  autoComplete="off"
                  value={mode === "personalizado" ? margin : ""}
                  onChange={(event) => {
                    setMargin(event.target.value);
                    setMarginInvalid(false);
                  }}
                  disabled={mode !== "personalizado"}
                  placeholder={mode === "personalizado" ? "Ej.: 18" : "Por línea"}
                  title={mode === "personalizado" ? "Margen con apoyo, en puntos" : "Óptimo y mínimo usan el precio de cada producto"}
                  aria-invalid={marginInvalid && mode === "personalizado" ? true : undefined}
                  className="pr-7 text-right tabular-nums max-md:h-11"
                />
                <Percent className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
              </div>
            </div>

            <Button type="submit" variant="secondary" disabled={disabled || count === 0 || update.isPending} className="max-md:h-11">
              {update.isPending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Aplicar a las seleccionadas
            </Button>

            {/* The selection's own actions, in the room the row left on the right. */}
            <div role="group" aria-label="Selección" className="flex flex-wrap items-center gap-1 lg:ml-auto">
              <Button
                variant="outline"
                onClick={() => onSelectionChange(new Set(filteredSkus))}
                disabled={filteredSkus.length === 0 || allFiltered}
                title={`Selecciona las ${formatCount(filteredSkus.length)} líneas que dejan ver los filtros, en todas las páginas`}
                className="max-md:h-11"
              >
                <ListChecks aria-hidden="true" /> Filtradas ({formatCount(filteredSkus.length)})
                <span className="sr-only">: seleccionar todas las líneas filtradas</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setClearError(null);
                  setConfirmClear(true);
                }}
                disabled={disabled || withPrice.length === 0 || clear.isPending}
                title={count > 0 && withPrice.length === 0 ? "Ninguna línea seleccionada tiene precio nuevo." : "Quita el precio nuevo de las líneas seleccionadas"}
                className="max-md:h-11"
              >
                <Eraser aria-hidden="true" /> Limpiar precios{withPrice.length > 0 && ` (${formatCount(withPrice.length)})`}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSelectionChange(new Set())}
                disabled={count === 0}
                aria-label="Quitar selección"
                title="Quitar selección"
                className="max-md:size-11"
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDeleteDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={withPrice.length === 1 ? "¿Limpiar 1 precio nuevo?" : `¿Limpiar ${formatCount(withPrice.length)} precios nuevos?`}
        confirmLabel="Limpiar precios"
        onConfirm={runClear}
        isPending={clear.isPending}
        error={clearError}
      >
        Esas líneas vuelven a «Sin precio nuevo» y salen del Excel y del plano. El resto de la cotización no cambia.
      </ConfirmDeleteDialog>
    </section>
  );
}

const LEGEND: { tone: BadgeTone; icon: typeof ThumbsUp; label: string; text: string }[] = [
  { tone: "success", icon: ThumbsUp, label: "Cumple", text: "El margen con apoyo llega al objetivo del producto o lo supera." },
  { tone: "warning", icon: AlertTriangle, label: "En rango", text: "Entre el mínimo y el objetivo: se puede confirmar, pero queda bajo el margen ideal." },
  { tone: "danger", icon: ThumbsDown, label: "Bajo el mínimo", text: "Con un precio nuevo así la cotización no se puede confirmar." },
  { tone: "warning", icon: CircleSlash, label: "Sin costo u objetivo", text: "La regla no lo puede evaluar: falta el costo o el margen del canal." },
];

/**
 * What each margin mark means and how the three modes price, kept in a
 * tooltip so the panel stays one row. The badges are the same ones the table uses.
 */
function MarginLegend() {
  return (
    <div className="max-w-xs space-y-3 text-sm">
      <ul className="space-y-2">
        {LEGEND.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label} className="space-y-0.5">
              <Badge tone={item.tone} className="px-1.5 py-0">
                <Icon aria-hidden="true" /> {item.label}
              </Badge>
              <p className="text-[13px] text-text-secondary">{item.text}</p>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-border pt-2 text-[13px] text-text-secondary">
        Óptimo y mínimo ponen a cada línea el precio de su producto (costo, apoyos vigentes y margen objetivo). El
        personalizado fija el mismo margen con apoyo para todas. El último precio se marca igual, con su margen actual.
      </p>
    </div>
  );
}
