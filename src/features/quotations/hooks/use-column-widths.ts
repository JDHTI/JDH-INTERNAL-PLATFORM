"use client";

import { useCallback, useRef, useState } from "react";

/** The table's fixed columns, left to right; the product column takes what they leave. */
export type ColumnKey = "last" | "bounds" | "price" | "margin" | "support" | "vat" | "final" | "qty" | "variation";

export const COLUMN_DEFAULTS: Record<ColumnKey, number> = {
  last: 128,
  bounds: 144,
  price: 112,
  margin: 112,
  support: 112,
  vat: 56,
  final: 112,
  qty: 112,
  variation: 96,
};

const COLUMN_MIN: Record<ColumnKey, number> = {
  last: 96,
  bounds: 112,
  price: 88,
  margin: 80,
  support: 72,
  vat: 48,
  final: 88,
  qty: 80,
  variation: 64,
};

/** The product column never gets narrower than this: its name has to stay readable. */
const PRODUCT_MIN = 176;
const STORAGE_KEY = "jdh-cotizador-columnas";

function load(): Record<ColumnKey, number> {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Record<ColumnKey, unknown>> | null;
    if (!stored) return COLUMN_DEFAULTS;
    const widths = { ...COLUMN_DEFAULTS };
    for (const key of Object.keys(COLUMN_DEFAULTS) as ColumnKey[]) {
      const value = stored[key];
      if (typeof value === "number" && Number.isFinite(value)) widths[key] = Math.max(COLUMN_MIN[key], Math.round(value));
    }
    return widths;
  } catch {
    return COLUMN_DEFAULTS;
  }
}

function save(widths: Record<ColumnKey, number>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  } catch {
    // Private mode or blocked storage: the widths still hold for this visit.
  }
}

/**
 * Column widths the person adjusts by moving the dividers, remembered in this
 * browser (a per-person convenience, not shared state).
 *
 * Moving the divider between two fixed columns is zero-sum: one grows what
 * the other loses, so the table never changes width. The divider after the
 * product column trades with the first fixed column, and never leaves the
 * product narrower than PRODUCT_MIN.
 */
export function useColumnWidths(columns: ColumnKey[], fixedExtra: number) {
  // The table only renders in the browser, once the quotation has loaded (the server sends the
  // skeleton), so the saved widths can be read on the first render without a hydration mismatch.
  const [widths, setWidths] = useState<Record<ColumnKey, number>>(() => (typeof window === "undefined" ? COLUMN_DEFAULTS : load()));
  const tableRef = useRef<HTMLTableElement>(null);
  const drag = useRef<{ boundary: number; x: number; start: Record<ColumnKey, number> } | null>(null);

  /** `boundary` 0 is the divider after the product column; n is between columns n-1 and n. */
  const move = useCallback(
    (boundary: number, dx: number, from: Record<ColumnKey, number>) => {
      const next = { ...from };
      if (boundary === 0) {
        const first = columns[0];
        const table = tableRef.current?.clientWidth ?? 0;
        const used = columns.reduce((sum, key) => sum + from[key], 0) + fixedExtra;
        const slack = Math.max(0, table - used - PRODUCT_MIN);
        // Moving it right narrows the first column and widens the product.
        next[first] = Math.min(from[first] + slack, Math.max(COLUMN_MIN[first], from[first] - dx));
      } else {
        const left = columns[boundary - 1];
        const right = columns[boundary];
        const shift = Math.min(from[right] - COLUMN_MIN[right], Math.max(COLUMN_MIN[left] - from[left], dx));
        next[left] = from[left] + shift;
        next[right] = from[right] - shift;
      }
      return next;
    },
    [columns, fixedExtra]
  );

  const startDrag = (boundary: number, event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { boundary, x: event.clientX, start: widths };
  };

  const onDrag = (event: React.PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current) return;
    setWidths(move(current.boundary, event.clientX - current.x, current.start));
  };

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setWidths((current) => {
      save(current);
      return current;
    });
  };

  /** Arrow keys move the divider 8px (32px with Shift); Enter puts every column back. */
  const onKey = (boundary: number, event: React.KeyboardEvent<HTMLElement>) => {
    const step = event.shiftKey ? 32 : 8;
    let next: Record<ColumnKey, number> | null = null;
    if (event.key === "ArrowLeft") next = move(boundary, -step, widths);
    else if (event.key === "ArrowRight") next = move(boundary, step, widths);
    else if (event.key === "Enter") next = COLUMN_DEFAULTS;
    if (!next) return;
    event.preventDefault();
    setWidths(next);
    save(next);
  };

  const reset = () => {
    setWidths(COLUMN_DEFAULTS);
    save(COLUMN_DEFAULTS);
  };

  return { widths, tableRef, startDrag, onDrag, endDrag, onKey, reset, min: COLUMN_MIN };
}
