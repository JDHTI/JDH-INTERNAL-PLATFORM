"use client";

import { useId } from "react";
import { AlertTriangle, CheckCircle2, PackagePlus, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogError, DialogFooter } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/field";
import { cn } from "@/shared/lib/utils";

import { MAX_REFERENCES_PER_IMPORT, formatCount, parseReferenceText } from "../lib/format";
import type { ImportResult, Quotation } from "../types/quotations.types";
import ProductMultiSearch, { type ProductPick } from "./product-multi-search";

export type ImportPick = ProductPick;

export interface ImportDraft {
  picks: ImportPick[];
  text: string;
}

export const EMPTY_DRAFT: ImportDraft = { picks: [], text: "" };

/**
 * Add references to the quotation: pick them from the master, paste a column
 * from Excel, or both; everything goes in one request. References already in
 * the quotation are revalidated, not refused, and unknown ones do not block
 * the rest. The draft lives in the editor, so the dialog can close the moment
 * it is sent (the table paints the rows as pending) and reopen with what is
 * left to fix.
 */
export default function AddProductsDialog({
  quotation,
  open,
  onOpenChange,
  draft,
  onDraftChange,
  result,
  error,
  onSubmit,
}: {
  quotation: Quotation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ImportDraft;
  onDraftChange: (draft: ImportDraft) => void;
  /** The last paste's outcome, when it left references to correct. */
  result: ImportResult | null;
  error: string | null;
  onSubmit: () => void;
}) {
  const pasteId = useId();
  const existing = new Set(quotation.lines.map((line) => line.sku));
  const pasted = parseReferenceText(draft.text);
  const all = [...new Set([...draft.picks.map((pick) => pick.sku), ...pasted.skus])];
  const fresh = all.filter((sku) => !existing.has(sku)).length;
  const already = all.length - fresh;
  const tooMany = all.length > MAX_REFERENCES_PER_IMPORT;

  const setPicks = (picks: ImportPick[]) => onDraftChange({ ...draft, picks });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      isForm
      wide
      title="Agregar productos a la cotización"
      description="Busca y marca varios productos, o pega una columna de Excel. Los nuevos entran al final con su costo, margen objetivo, apoyos e impuesto de licores; los que ya están se revalidan con los datos de hoy y conservan su precio nuevo."
    >
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (all.length > 0 && !tooMany) onSubmit();
        }}
      >
        {result && <ResultSummary result={result} />}

        <div className="grid gap-5 md:grid-cols-2">
          <div className="min-w-0 space-y-3">
            <ProductMultiSearch
              picked={draft.picks}
              existing={existing}
              onToggle={(pick) =>
                setPicks(
                  draft.picks.some((item) => item.sku === pick.sku)
                    ? draft.picks.filter((item) => item.sku !== pick.sku)
                    : [...draft.picks, pick]
                )
              }
              onPickMany={(picks) => setPicks([...draft.picks, ...picks])}
            />
            {draft.picks.length > 0 && (
              <h3 className="text-[13px] font-medium">
                Marcados <span className="tabular-nums">({formatCount(draft.picks.length)})</span>
              </h3>
            )}
            {draft.picks.length > 0 && (
              <ul className="max-h-40 divide-y divide-border overflow-y-auto rounded-md border border-border" aria-label="Productos marcados">
                {draft.picks.map((pick) => (
                  <li key={pick.sku} className="flex min-h-10 items-center gap-3 px-3 py-1.5 text-sm">
                    <span className="w-16 shrink-0 font-mono text-[13px]">{pick.sku}</span>
                    <span className="min-w-0 flex-1 truncate" title={pick.description}>{pick.description ?? "—"}</span>
                    {existing.has(pick.sku) && <span className="shrink-0 text-xs text-text-secondary">Se revalida</span>}
                    <button
                      type="button"
                      onClick={() => setPicks(draft.picks.filter((item) => item.sku !== pick.sku))}
                      aria-label={`Quitar ${pick.sku} de la lista`}
                      className="flex size-7 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring max-md:size-11"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="min-w-0 space-y-1.5">
            <label htmlFor={pasteId} className="block text-[13px] font-medium">Pegar referencias</label>
            <Textarea
              id={pasteId}
              value={draft.text}
              onChange={(event) => onDraftChange({ ...draft, text: event.target.value })}
              placeholder="Pega una columna de Excel o separa por comas"
              aria-describedby={`${pasteId}-count`}
              className="min-h-32 font-mono"
              spellCheck={false}
            />
            <p id={`${pasteId}-count`} className="text-[13px] text-text-secondary" aria-live="polite">
              {pasted.skus.length === 0
                ? "Una por línea, o separadas por coma, punto y coma, tabulador o espacio."
                : `${pasted.skus.length === 1 ? "Se detectó 1 referencia" : `Se detectaron ${formatCount(pasted.skus.length)} referencias`}${
                    pasted.repeated === 1
                      ? " (1 repetida se cuenta una vez)"
                      : pasted.repeated > 1
                        ? ` (${formatCount(pasted.repeated)} repetidas se cuentan una vez)`
                        : ""
                  }.`}
            </p>
          </div>
        </div>

        <p className="text-sm" aria-live="polite">
          {all.length === 0
            ? "Aún no hay referencias para enviar."
            : [
                fresh > 0 ? `${formatCount(fresh)} ${fresh === 1 ? "nueva" : "nuevas"}` : null,
                already > 0 ? `${formatCount(already)} ya en la cotización (se revalidan)` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
        </p>
        {tooMany && (
          <p role="alert" className="text-sm text-danger">
            Son {formatCount(all.length)}; se envían máximo {MAX_REFERENCES_PER_IMPORT} por vez. Divide la lista.
          </p>
        )}

        <DialogError message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="max-md:h-11">Cancelar</Button>
          <Button type="submit" disabled={all.length === 0 || tooMany} className="max-md:h-11">
            <PackagePlus aria-hidden="true" />
            {all.length === 0 ? "Agregar" : all.length === 1 ? "Agregar 1 referencia" : `Agregar ${formatCount(all.length)} referencias`}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

/**
 * What the last paste did, shown when some references could not be added: the
 * unknown ones are back in the paste box to correct, the inactive ones are
 * only listed (retyping them will not help).
 */
function ResultSummary({ result }: { result: ImportResult }) {
  const counts = [
    result.added.length > 0 ? `${formatCount(result.added.length)} ${result.added.length === 1 ? "agregada" : "agregadas"}` : null,
    result.revalidated.length > 0
      ? `${formatCount(result.revalidated.length)} ${result.revalidated.length === 1 ? "revalidada" : "revalidadas"}`
      : null,
  ].filter(Boolean);
  return (
    <div className="space-y-2 rounded-md bg-warning-surface px-3 py-2 text-sm" role="status">
      {counts.length > 0 && (
        <p className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          <span>{counts.join(" · ")}.</span>
        </p>
      )}
      {result.not_found.length > 0 && (
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            <strong>No existen en el maestro ({formatCount(result.not_found.length)}):</strong>{" "}
            <span className="font-mono">{result.not_found.join(", ")}</span>. Quedaron abajo para que las corrijas.
          </span>
        </p>
      )}
      {result.inactive.length > 0 && (
        <p className={cn("flex items-start gap-2")}>
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <span>
            <strong>Inactivas, no se agregan ({formatCount(result.inactive.length)}):</strong>{" "}
            <span className="font-mono">{result.inactive.join(", ")}</span>.
          </span>
        </p>
      )}
    </div>
  );
}
