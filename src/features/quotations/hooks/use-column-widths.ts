"use client";

import { useCallback, useRef, useState } from "react";

/** The table's fixed columns, left to right; the product column takes what they leave. */
export type ColumnKey = "last" | "bounds" | "price" | "support" | "vat" | "consumption" | "final" | "qty" | "variation";

export const COLUMN_DEFAULTS: Record<ColumnKey, number> = {
  last: 136,
  // Fits BI's "Costo más alto" beside a seven-digit price, and each price's margin chip (2026-11-23).
  bounds: 256,
  price: 128,
  support: 112,
  vat: 56,
  consumption: 104,
  final: 120,
  qty: 112,
  variation: 96,
};

const COLUMN_MIN: Record<ColumnKey, number> = {
  last: 104,
  bounds: 200,
  price: 104,
  support: 72,
  vat: 48,
  consumption: 80,
  final: 96,
  qty: 80,
  variation: 64,
};

/**
 * Columns of figures and fields, whose content must never spill: they stop where it starts to.
 * "Apoyo" is left out because its badge truncates with an ellipsis, so its full text is not a limit.
 */
const CONTENT_BOUND: ReadonlySet<ColumnKey> = new Set(["last", "bounds", "price", "vat", "consumption", "final", "qty", "variation"]);

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

/**
 * The narrowest each fixed column can be without its figures or fields spilling
 * into the next one: its min-content width, read off the table as it is now. An
 * auto-layout table squeezed to nothing lays every column out at exactly that
 * width; the styles go back before the browser paints, so nothing flickers.
 */
function measureContent(table: HTMLTableElement, columns: ColumnKey[]): Partial<Record<ColumnKey, number>> {
  const cols = Array.from(table.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col"));
  const header = table.tHead?.rows[0];
  if (!header || header.cells.length !== cols.length) return {};
  const first = cols.length - columns.length;
  const saved = { layout: table.style.tableLayout, width: table.style.width, cols: cols.map((col) => col.style.width) };
  table.style.tableLayout = "auto";
  table.style.width = "0";
  for (const col of cols) col.style.width = "0";
  const fit: Partial<Record<ColumnKey, number>> = {};
  columns.forEach((key, index) => {
    fit[key] = Math.ceil(header.cells[first + index].getBoundingClientRect().width);
  });
  table.style.tableLayout = saved.layout;
  table.style.width = saved.width;
  cols.forEach((col, index) => {
    col.style.width = saved.cols[index];
  });
  return fit;
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
 * Moving the divider between two fixed columns trades width between them; once
 * the right one is as narrow as it gets, widening the left one takes from the
 * product column, never below PRODUCT_MIN. The divider after the product
 * column trades with the first fixed column. A column of figures or fields
 * never gets narrower than its content (prices, margins, the input), measured
 * when a divider starts to move.
 */
export function useColumnWidths(columns: ColumnKey[], fixedExtra: number) {
  // The table only renders in the browser, once the quotation has loaded (the server sends the
  // skeleton), so the saved widths can be read on the first render without a hydration mismatch.
  const [widths, setWidths] = useState<Record<ColumnKey, number>>(() => (typeof window === "undefined" ? COLUMN_DEFAULTS : load()));
  const tableRef = useRef<HTMLTableElement>(null);
  const drag = useRef<{ boundary: number; x: number; start: Record<ColumnKey, number> } | null>(null);
  const fit = useRef<Partial<Record<ColumnKey, number>>>({});

  const measure = () => {
    if (tableRef.current) fit.current = measureContent(tableRef.current, columns);
  };

  /** `boundary` 0 is the divider after the product column; n is between columns n-1 and n. */
  const move = useCallback(
    (boundary: number, dx: number, from: Record<ColumnKey, number>) => {
      // Where a column stops: its content, for figures and fields. A saved width already under
      // it is not pushed open, it just cannot shrink further.
      const floor = (key: ColumnKey) => {
        const content = CONTENT_BOUND.has(key) ? (fit.current[key] ?? 0) : 0;
        return Math.max(COLUMN_MIN[key], Math.min(content, from[key]));
      };
      const room = (key: ColumnKey) => Math.max(0, from[key] - floor(key));
      const table = tableRef.current?.clientWidth ?? 0;
      const used = columns.reduce((sum, key) => sum + from[key], 0) + fixedExtra;
      // What the product column can give before reaching its own minimum.
      const slack = Math.max(0, table - used - PRODUCT_MIN);
      const next = { ...from };
      if (boundary === 0) {
        const first = columns[0];
        // Moving it right narrows the first column and widens the product.
        next[first] = Math.min(from[first] + slack, Math.max(floor(first), from[first] - dx));
      } else if (dx < 0) {
        // Narrowing the left column: the right one takes what it gives.
        const left = columns[boundary - 1];
        const give = Math.min(-dx, room(left));
        next[left] = from[left] - give;
        next[columns[boundary]] = from[columns[boundary]] + give;
      } else {
        // Widening the left column: first from the right one, down to its content, then from the
        // product, so a divider still moves when its neighbor is already as narrow as it gets.
        const left = columns[boundary - 1];
        const right = columns[boundary];
        const fromRight = Math.min(dx, room(right));
        const fromProduct = Math.min(dx - fromRight, slack);
        next[left] = from[left] + fromRight + fromProduct;
        next[right] = from[right] - fromRight;
      }
      return next;
    },
    [columns, fixedExtra]
  );

  const startDrag = (boundary: number, event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    measure();
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
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") measure();
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
