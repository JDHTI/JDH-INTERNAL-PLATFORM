"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";

import { Autocomplete } from "@/shared/components/ui/autocomplete";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

import { useBusinessGroups } from "../hooks/use-supports";

/**
 * A business group of the customer master, picked from `GET /supplier-supports/business-groups`.
 * The same look as the master pickers: a search with suggestions and, once chosen, a removable chip.
 */
export default function BusinessGroupPicker({
  selected,
  onSelect,
  onClear,
}: {
  selected: string | null;
  onSelect: (group: string) => void;
  onClear: () => void;
}) {
  const id = useId();
  const [input, setInput] = useState("");
  const query = useDebouncedValue(input.trim());
  const groups = useBusinessGroups(selected ? "" : query);
  const options = (groups.data ?? []).map((group) => ({
    value: group.name,
    label: group.name,
    hint: group.customers === 1 ? "1 cliente activo" : `${group.customers.toLocaleString("es-CO")} clientes activos`,
  }));

  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium">
        Grupo empresarial
      </label>
      {selected ? (
        <div className="flex h-9 items-center justify-between gap-2 rounded-md border border-border-control bg-canvas-subtle pl-2.5 pr-1 text-sm">
          <span className="min-w-0 truncate font-medium">{selected}</span>
          <button
            type="button"
            onClick={() => {
              setInput("");
              onClear();
            }}
            aria-label={`Quitar el grupo empresarial: ${selected}`}
            className="flex size-7 shrink-0 items-center justify-center rounded-sm text-text-secondary hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <Autocomplete
          id={id}
          value={input}
          onValueChange={setInput}
          options={query.length >= 2 ? options : []}
          isLoading={groups.isFetching}
          emptyText={query.length >= 2 && groups.isSuccess ? "Ningún grupo con ese nombre." : undefined}
          onSelect={(option) => {
            setInput("");
            onSelect(option.value);
          }}
          placeholder="Nombre del grupo"
        />
      )}
    </div>
  );
}
