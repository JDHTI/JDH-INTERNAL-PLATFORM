"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { cn } from "@/shared/lib/utils";

import { useAssignees, useSuggestions } from "../hooks/use-pqrsf";
import { personName } from "../lib/format";
import type { DocumentType, Person, SuggestionField } from "../types/pqrsf.types";
import { Autocomplete } from "./autocomplete";

type InputPassthrough = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "onSelect" | "role" | "defaultValue"
>;

/** Accent- and case-insensitive, so "certificacion" finds "Certificación". */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Free text that offers what was typed before in the same column: the
 * spreadsheet has hundreds of spellings of the same customer, and this is
 * how the next one stops being new.
 */
export function SuggestionInput({
  field,
  value,
  onValueChange,
  ...inputProps
}: InputPassthrough & {
  field: SuggestionField;
  value: string;
  onValueChange: (text: string) => void;
}) {
  const [isFocused, setIsFocused] = React.useState(false);
  const q = useDebouncedValue(value.trim());
  const suggestions = useSuggestions(field, q, isFocused);
  const options = (suggestions.data ?? [])
    // Offering exactly what is already typed is noise.
    .filter((text) => normalize(text) !== normalize(value))
    .map((text) => ({ value: text, label: text }));

  return (
    <Autocomplete
      {...inputProps}
      value={value}
      onValueChange={onValueChange}
      options={isFocused ? options : []}
      onSelect={(option) => onValueChange(option.value)}
      isLoading={suggestions.isFetching}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
  );
}

/**
 * Picks one of the 62 document types by typing part of its name. The
 * response time shows in the list, because choosing the type is choosing
 * the deadline.
 */
export function DocumentTypePicker({
  documentTypes,
  value,
  onChange,
  ...inputProps
}: InputPassthrough & {
  documentTypes: DocumentType[];
  value: DocumentType | null;
  onChange: (value: DocumentType | null) => void;
}) {
  const [text, setText] = React.useState(value?.name ?? "");
  const [syncedId, setSyncedId] = React.useState(value?.id);
  // Follows a value set from outside (a row reset) without an effect.
  if (syncedId !== value?.id) {
    setSyncedId(value?.id);
    setText(value?.name ?? "");
  }

  // Every word must appear somewhere: "cert calidad" finds "Certificado Calidad".
  const words = normalize(text).split(/\s+/).filter(Boolean);
  const matches = documentTypes
    .filter((type) => {
      const name = normalize(type.name);
      return type.is_active && words.every((word) => name.includes(word));
    })
    .slice(0, 50)
    .map((type) => ({
      value: type.id,
      label: type.name,
      hint: `${type.sla_days} ${type.sla_days === 1 ? "día hábil" : "días hábiles"}`,
    }));

  return (
    <Autocomplete
      {...inputProps}
      value={text}
      onValueChange={(next) => {
        setText(next);
        if (next.trim() === "") onChange(null);
      }}
      options={matches}
      emptyText="Ningún tipo de documento coincide"
      onSelect={(option) => {
        const picked = documentTypes.find((type) => type.id === option.value) ?? null;
        setText(picked?.name ?? "");
        onChange(picked);
      }}
      onBlur={() => {
        // Only catalog types are valid here: half-typed text snaps back.
        setText(value?.name ?? "");
      }}
    />
  );
}

/**
 * A select whose popup opens with a search box: reads like the dropdowns
 * next to it, and searches platform users on the server as you type.
 */
export function AssigneeSelect({
  id,
  value,
  onChange,
  placeholder = "Cualquiera",
}: {
  id?: string;
  value: Person | null;
  onChange: (value: Person | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const q = useDebouncedValue(query.trim());
  const assignees = useAssignees(q, open);
  const results = assignees.data ?? [];
  // The chosen person stays a known item even when the search leaves it out.
  const items =
    value && !results.some((person) => person.id === value.id) ? [value, ...results] : results;

  return (
    <Combobox.Root
      items={items}
      value={value}
      onValueChange={(next) => onChange(next)}
      inputValue={query}
      onInputValueChange={(next) => setQuery(next)}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
      filter={null}
      itemToStringLabel={(person: Person) => personName(person)}
      isItemEqualToValue={(item: Person, selected: Person) => item.id === selected.id}
    >
      <div className="relative w-full">
        <Combobox.Trigger
          id={id}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border-control bg-transparent px-2.5 text-left text-sm text-text-primary",
            "transition-colors duration-150 outline-none hover:bg-canvas-subtle data-[popup-open]:bg-canvas-subtle",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-control",
            "max-md:h-11",
            value && "pr-16"
          )}
        >
          <span className={cn("min-w-0 truncate", !value && "text-text-secondary")}>
            {value ? personName(value) : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
        </Combobox.Trigger>
        {value && (
          <button
            type="button"
            aria-label="Quitar filtro de responsable"
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
            aria-label="Buscar responsable"
            aria-busy={assignees.isFetching || undefined}
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
              {assignees.isFetching && (
                <Loader2
                  className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-text-secondary"
                  aria-hidden="true"
                />
              )}
            </div>
            <Combobox.Empty className="px-3 py-3 text-sm text-text-secondary empty:hidden">
              {assignees.isFetching
                ? null
                : "Nadie coincide. La persona debe haber iniciado sesión una vez en la plataforma."}
            </Combobox.Empty>
            <Combobox.List className="max-h-60 overflow-y-auto p-1 outline-none empty:hidden">
              {(person: Person) => (
                <Combobox.Item
                  key={person.id}
                  value={person}
                  className="grid min-h-8 cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-sm px-2 py-1 text-sm outline-none select-none data-highlighted:bg-canvas-subtle max-md:min-h-11"
                >
                  <Combobox.ItemIndicator className="col-start-1">
                    <Check className="size-4" aria-hidden="true" />
                  </Combobox.ItemIndicator>
                  <span className="col-start-2 min-w-0">
                    <span className="block truncate">{personName(person)}</span>
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

/** Platform users who can take the case. Managers only: the API enforces it. */
export function AssigneePicker({
  value,
  onChange,
  ...inputProps
}: InputPassthrough & {
  value: Person | null;
  onChange: (value: Person | null) => void;
}) {
  const [text, setText] = React.useState(personName(value));
  const [syncedId, setSyncedId] = React.useState(value?.id);
  if (syncedId !== value?.id) {
    setSyncedId(value?.id);
    setText(personName(value));
  }
  const [isFocused, setIsFocused] = React.useState(false);
  const q = useDebouncedValue(text.trim());
  const assignees = useAssignees(q === personName(value) ? "" : q, isFocused);

  const options = (assignees.data ?? []).map((person) => ({
    value: person.id,
    label: personName(person),
    hint: person.email && person.display_name ? person.email : undefined,
  }));

  return (
    <Autocomplete
      {...inputProps}
      value={text}
      onValueChange={(next) => {
        setText(next);
        if (next.trim() === "") onChange(null);
      }}
      options={isFocused ? options : []}
      isLoading={assignees.isFetching}
      emptyText="Nadie coincide. La persona debe haber iniciado sesión una vez en la plataforma."
      onSelect={(option) => {
        const picked = assignees.data?.find((person) => person.id === option.value) ?? null;
        setText(personName(picked));
        onChange(picked);
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        setText(personName(value));
      }}
    />
  );
}
