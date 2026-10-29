"use client";

import { useId, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Autocomplete, type AutocompleteOption } from "@/shared/components/ui/autocomplete";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { errorMessage } from "@/shared/lib/api-client";
import { Button } from "@/shared/components/ui/button";
import { getPickerPage, nextPickerPage } from "../services/base-picker.service";

type Row = Record<string, unknown>;

export interface BasePickerConfig {
  label: string;
  placeholder: string;
  endpoint: string;
  /** One option per distinct value: the masters repeat a NIT once per branch. */
  toOption: (row: Row) => AutocompleteOption;
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

export const CUSTOMER_PICKER: BasePickerConfig = {
  label: "Cliente",
  placeholder: "Nombre o NIT",
  endpoint: "/commercial/customers",
  toOption: (row) => ({
    value: text(row.nit),
    label: text(row.legal_name) || text(row.establishment_name) || text(row.nit),
    hint: `NIT ${text(row.nit)}`,
  }),
};

export const SUPPLIER_PICKER: BasePickerConfig = {
  label: "Proveedor",
  placeholder: "Nombre o código",
  endpoint: "/commercial/suppliers",
  toOption: (row) => ({
    value: text(row.code),
    label: text(row.name) || text(row.code),
    hint: `Código ${text(row.code)}`,
  }),
};

export const PRODUCT_PICKER: BasePickerConfig = {
  label: "Referencia",
  placeholder: "SKU o descripción",
  endpoint: "/commercial/products",
  toOption: (row) => ({
    value: text(row.sku),
    label: text(row.sku),
    hint: text(row.description) || undefined,
  }),
};

const MIN_CHARS = 2;

/**
 * One optional filter of the base search bar. Empty it is a search field with
 * suggestions from the masters; once a value is chosen it shows as a removable
 * chip, so the active filter is always visible. Requests wait for two
 * characters and for typing to pause: the endpoints are rate limited.
 */
export default function BasePicker({
  config,
  selected,
  onSelect,
  onClear,
}: {
  config: BasePickerConfig;
  selected: AutocompleteOption | null;
  onSelect: (option: AutocompleteOption) => void;
  onClear: () => void;
}) {
  const id = useId();
  const [input, setInput] = useState("");
  const q = useDebouncedValue(input.trim());
  const enabled = selected === null && q.length >= MIN_CHARS;

  const suggestions = useInfiniteQuery({
    queryKey: ["supports-base-picker", config.endpoint, q],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getPickerPage(config.endpoint, q, pageParam),
    getNextPageParam: nextPickerPage,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
  const seen = new Set<string>();
  const options = (suggestions.data?.pages.flatMap(page => page.items) ?? []).map(config.toOption)
    .filter(option => option.value !== "" && !seen.has(option.value) && seen.add(option.value));
  const currentInput = enabled && input.trim() === q;

  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium">
        {config.label}
      </label>
      {selected ? (
        <div className="flex h-9 items-center justify-between gap-2 rounded-md border border-border-control bg-canvas-subtle pl-2.5 pr-1 text-sm">
          <span className="min-w-0 truncate">
            <span className="font-medium">{selected.label}</span>
            {selected.hint && <span className="text-text-secondary"> · {selected.hint}</span>}
          </span>
          <button
            type="button"
            onClick={() => {
              setInput("");
              onClear();
            }}
            aria-label={`Quitar ${config.label.toLowerCase()}: ${selected.label}`}
            className="flex size-7 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <><Autocomplete
          id={id}
          value={input}
          onValueChange={setInput}
          options={currentInput ? options : []}
          isLoading={enabled && suggestions.isFetching}
          emptyText={currentInput && suggestions.isSuccess ? "Sin coincidencias. Prueba con el NIT o menos palabras del nombre." : undefined}
          onSelect={(option) => {
            setInput("");
            onSelect(option);
          }}
          placeholder={config.placeholder}
        />
        {currentInput && suggestions.isError && <p role="alert" className="text-xs text-danger">{errorMessage(suggestions.error)} <Button size="sm" variant="ghost" onClick={() => void suggestions.refetch()}>Reintentar</Button></p>}
        {currentInput && suggestions.hasNextPage && <Button size="sm" variant="outline" disabled={suggestions.isFetchingNextPage} onClick={() => void suggestions.fetchNextPage()}>{suggestions.isFetchingNextPage ? "Cargando…" : "Cargar más coincidencias"}</Button>}
        {currentInput && suggestions.isSuccess && options.length > 0 && <p className="text-xs text-text-secondary">{options.length} opciones cargadas. {suggestions.hasNextPage ? "Hay más resultados; precisa el nombre o NIT o carga la siguiente página." : "Busca por nombre o NIT y elige una opción."}</p>}
        </>
      )}
    </div>
  );
}
