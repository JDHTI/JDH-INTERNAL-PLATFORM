"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { cn } from "@/shared/lib/utils";

export interface SelectablePerson {
  id: string;
  display_name: string | null;
  email: string | null;
}

export function personLabel(person: SelectablePerson | null | undefined): string {
  if (!person) return "";
  return person.display_name || person.email || "Usuario sin nombre";
}

/**
 * What the select asks for while open: the debounced text and whether to
 * search at all. Each module runs its own query with it, since who can be
 * picked differs between them.
 */
export function usePersonSearchState() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const q = useDebouncedValue(query.trim());
  return { q, enabled: open, onQueryChange: setQuery, onOpenChange: setOpen };
}

/**
 * A select whose popup opens with a search box: reads like the dropdowns
 * next to it, and searches people on the server as you type.
 */
export function PersonSelect<P extends SelectablePerson>({
  id,
  value,
  onChange,
  results,
  isFetching,
  onQueryChange,
  onOpenChange,
  placeholder,
  clearLabel,
  popupLabel = "Buscar persona",
  emptyText = "Nadie coincide. La persona debe haber iniciado sesión una vez en la plataforma.",
  disabled,
}: {
  id?: string;
  value: P | null;
  onChange: (value: P | null) => void;
  results: P[];
  isFetching: boolean;
  onQueryChange: (query: string) => void;
  onOpenChange: (open: boolean) => void;
  placeholder: string;
  clearLabel: string;
  popupLabel?: string;
  emptyText?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const search = { isFetching };
  // The chosen person stays a known item even when the search leaves it out.
  const items =
    value && !results.some((person) => person.id === value.id) ? [value, ...results] : results;

  return (
    <Combobox.Root
      items={items}
      value={value}
      onValueChange={(next) => onChange(next)}
      inputValue={query}
      onInputValueChange={(next) => {
        setQuery(next);
        onQueryChange(next);
      }}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange(next);
        if (!next) {
          setQuery("");
          onQueryChange("");
        }
      }}
      filter={null}
      disabled={disabled}
      itemToStringLabel={(person: P) => personLabel(person)}
      isItemEqualToValue={(item: P, selected: P) => item.id === selected.id}
    >
      <div className="relative w-full">
        <Combobox.Trigger
          id={id}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border-control bg-transparent px-2.5 text-left text-sm text-text-primary",
            "transition-colors duration-150 outline-none hover:bg-canvas-subtle data-[popup-open]:bg-canvas-subtle",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-control",
            "disabled:pointer-events-none disabled:opacity-50",
            "max-md:h-11",
            value && "pr-16"
          )}
        >
          <span className={cn("min-w-0 truncate", !value && "text-text-secondary")}>
            {value ? personLabel(value) : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
        </Combobox.Trigger>
        {value && !disabled && (
          <button
            type="button"
            aria-label={clearLabel}
            title={clearLabel}
            onClick={() => onChange(null)}
            className="absolute top-1/2 right-8 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring-control"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <Combobox.Portal>
        <Combobox.Positioner align="start" sideOffset={4} className="z-50 outline-none">
          <Combobox.Popup
            aria-label={popupLabel}
            aria-busy={search.isFetching || undefined}
            className="w-(--anchor-width) min-w-64 max-w-(--available-width) overflow-hidden rounded-md border border-border-control bg-surface-raised text-text-primary shadow-lg outline-none"
          >
            <div className="relative border-b border-border p-1.5">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-text-secondary"
                aria-hidden="true"
              />
              <Combobox.Input
                placeholder="Nombre o correo"
                className="h-8 w-full rounded-sm bg-transparent pr-8 pl-8 text-sm outline-none placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-ring-control"
              />
              {search.isFetching && (
                <Loader2
                  className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-text-secondary"
                  aria-hidden="true"
                />
              )}
            </div>
            <Combobox.Empty className="px-3 py-3 text-sm text-text-secondary empty:hidden">
              {search.isFetching ? null : emptyText}
            </Combobox.Empty>
            <Combobox.List className="max-h-60 overflow-y-auto p-1 outline-none empty:hidden">
              {(person: P) => (
                <Combobox.Item
                  key={person.id}
                  value={person}
                  className="grid min-h-8 cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none select-none data-highlighted:bg-canvas-subtle max-md:min-h-11"
                >
                  <Combobox.ItemIndicator className="col-start-1">
                    <Check className="size-4" aria-hidden="true" />
                  </Combobox.ItemIndicator>
                  <span className="col-start-2 min-w-0">
                    <span className="block truncate">{personLabel(person)}</span>
                    {person.email && person.display_name && (
                      <span className="block truncate text-[13px] text-text-secondary">
                        {person.email}
                      </span>
                    )}
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
