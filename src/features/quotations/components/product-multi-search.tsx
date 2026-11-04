"use client";

import { useId, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";

import { getPickerPage, nextPickerPage } from "@/shared/components/pickers/base-picker.service";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";

import { formatCount } from "../lib/format";

const ENDPOINT = "/commercial/products";
const MIN_CHARS = 2;
/** The product search is indexed in the API (20 to 115 ms), so it waits less than the usual 350. */
const DEBOUNCE_MS = 200;

export interface ProductPick {
  sku: string;
  description?: string;
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * Search the product master and tick several results to add them at once.
 * Unlike the single pickers, the results stay open as a checklist; an
 * inactive product is listed but cannot be ticked, since it would not be added.
 */
export default function ProductMultiSearch({
  picked,
  existing,
  onToggle,
  onPickMany,
}: {
  picked: ProductPick[];
  /** References already in the quotation: ticking them revalidates them. */
  existing: Set<string>;
  onToggle: (pick: ProductPick) => void;
  onPickMany: (picks: ProductPick[]) => void;
}) {
  const id = useId();
  const [input, setInput] = useState("");
  const q = useDebouncedValue(input.trim(), DEBOUNCE_MS);
  const enabled = q.length >= MIN_CHARS;
  const results = useInfiniteQuery({
    queryKey: ["quotation-product-search", q],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getPickerPage(ENDPOINT, q, pageParam),
    getNextPageParam: nextPickerPage,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
  const rows = (results.data?.pages.flatMap((page) => page.items) ?? []).map((row) => ({
    sku: text(row.sku),
    description: text(row.description) || undefined,
    active: row.is_active !== false,
  }));
  const pickedSet = new Set(picked.map((pick) => pick.sku));
  const selectable = rows.filter((row) => row.sku !== "" && row.active);
  const allPicked = selectable.length > 0 && selectable.every((row) => pickedSet.has(row.sku));
  const typing = input.trim() !== q;

  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-[13px] font-medium">Buscar productos</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
        <Input
          id={id}
          type="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="SKU o nombre, por ejemplo 26278 o ginebra"
          autoComplete="off"
          aria-describedby={`${id}-status`}
          className="pl-9 max-md:h-11"
        />
        {enabled && results.isFetching && (
          <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-text-secondary" aria-hidden="true" />
        )}
      </div>

      <p id={`${id}-status`} className="text-[13px] text-text-secondary" aria-live="polite">
        {!enabled
          ? "Escribe al menos dos letras. Marca los resultados que quieras agregar."
          : results.isError
            ? errorMessage(results.error)
            : results.isSuccess && !typing
              ? rows.length === 0
                ? "Sin coincidencias. Prueba con el SKU o menos palabras."
                : `${formatCount(rows.length)} ${rows.length === 1 ? "resultado" : "resultados"}${results.hasNextPage ? " cargados; hay más" : ""}.`
              : "Buscando…"}
      </p>

      {enabled && rows.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={selectable.length === 0 || allPicked}
              onClick={() => onPickMany(selectable.filter((row) => !pickedSet.has(row.sku)))}
              className="max-md:h-11"
            >
              Marcar los {formatCount(selectable.length)} resultados
            </Button>
            {results.hasNextPage && (
              <Button variant="ghost" size="sm" disabled={results.isFetchingNextPage} onClick={() => void results.fetchNextPage()} className="max-md:h-11">
                {results.isFetchingNextPage ? "Cargando…" : "Cargar más"}
              </Button>
            )}
          </div>
          <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border" aria-label="Resultados de la búsqueda">
            {rows.map((row) => (
              <li key={row.sku}>
                <label className={row.active ? "flex min-h-10 cursor-pointer items-center gap-3 px-3 py-1.5 text-sm hover:bg-canvas-subtle" : "flex min-h-10 items-center gap-3 px-3 py-1.5 text-sm text-text-secondary"}>
                  <input
                    type="checkbox"
                    checked={pickedSet.has(row.sku)}
                    disabled={!row.active}
                    onChange={() => onToggle({ sku: row.sku, description: row.description })}
                    className="size-4 shrink-0 accent-[var(--primary)] max-md:size-5"
                  />
                  <span className="w-16 shrink-0 font-mono text-[13px]">{row.sku}</span>
                  <span className="min-w-0 flex-1 truncate" title={row.description}>{row.description ?? "—"}</span>
                  {!row.active ? (
                    <span className="shrink-0 text-xs">Inactiva</span>
                  ) : (
                    existing.has(row.sku) && <span className="shrink-0 text-xs text-text-secondary">Ya está</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
