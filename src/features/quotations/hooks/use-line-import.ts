"use client";

import { useEffect, useRef, useState } from "react";

import { parseReferenceText } from "../lib/format";
import type { ImportResult, LineImport, Quotation } from "../types/quotations.types";
import { useAddLines } from "./use-quotations";

/** Long enough to find the row after the dialog closes; short enough not to linger (MOTION 1). */
const HIGHLIGHT_MS = 2500;

const EMPTY_RESULT: ImportResult = { added: [], revalidated: [], not_found: [], inactive: [], repeated: 0 };

/**
 * Pasting a list into a quotation. The references the paste will add are
 * painted at once as pending rows ("Agregando…"), because the API may take a
 * moment with a cold DWH; the answer replaces them with the real rows, with no
 * GET after it. The ones that were already there and got revalidated are
 * highlighted for a moment. `lastImport` keeps what the paste touched so the
 * editor can filter to it.
 */
export function useLineImport(quotation: Quotation) {
  const add = useAddLines(quotation.id);
  const [pending, setPending] = useState<string[]>([]);
  const [highlight, setHighlight] = useState<Set<string>>(() => new Set());
  const [lastImport, setLastImport] = useState<string[] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const flash = (skus: string[]) => {
    if (timer.current) clearTimeout(timer.current);
    setHighlight(new Set(skus));
    timer.current = setTimeout(() => setHighlight(new Set()), HIGHLIGHT_MS);
  };

  const run = (
    input: LineImport,
    { onResult, onError }: { onResult: (result: ImportResult) => void; onError: (error: Error) => void }
  ) => {
    const existing = new Set(quotation.lines.map((line) => line.sku));
    const all = [...new Set([...(input.skus ?? []), ...parseReferenceText(input.text ?? "").skus])];
    setPending(all.filter((sku) => !existing.has(sku)));
    setLastImport(all);
    add.mutate(
      { version: quotation.version, ...input },
      {
        onSuccess: (updated) => {
          const result = { ...EMPTY_RESULT, ...updated.import_result };
          setPending([]);
          setLastImport([...result.added, ...result.revalidated]);
          // The caller flashes the revalidated rows when the table is in view:
          // at once, or after the dialog it reopens is closed.
          onResult(result);
        },
        onError: (error) => {
          setPending([]);
          setLastImport(null);
          onError(error);
        },
      }
    );
  };

  return {
    run,
    /** References being added, shown as pending rows until the answer arrives. */
    pending,
    /** Revalidated by the last paste, highlighted for a moment. */
    highlight,
    /** What the last paste added or revalidated; null when there is none to filter by. */
    lastImport,
    /** Tints these rows for a moment. */
    flash,
    clearLastImport: () => setLastImport(null),
    isPending: add.isPending,
  };
}

export type LineImporter = ReturnType<typeof useLineImport>;
