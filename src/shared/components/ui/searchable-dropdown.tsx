"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Combobox } from "@base-ui/react/combobox";

import { cn } from "@/shared/lib/utils";

export interface SearchableDropdownOption {
  value: string;
  label: string;
}

interface SearchableDropdownProps {
  id: string;
  name?: string;
  value: string;
  options: SearchableDropdownOption[];
  onValueChange: (value: string) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  placeholder?: string;
  emptyMessage?: string;
  clearLabel?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

export function SearchableDropdown({
  id,
  name,
  value,
  options,
  onValueChange,
  onBlur,
  placeholder = "Escribe para buscar",
  emptyMessage = "No hay coincidencias.",
  clearLabel = "Limpiar selección",
  disabled = false,
  required = false,
  invalid = false,
  describedBy,
}: SearchableDropdownProps) {
  const selectedOption = options.find((option) => option.value === value) ?? null;

  return (
    <Combobox.Root
      items={options}
      value={selectedOption}
      onValueChange={(nextOption) => onValueChange(nextOption?.value ?? "")}
      onInputValueChange={(nextInputValue, details) => {
        if (
          details.reason === "input-change" &&
          selectedOption &&
          nextInputValue !== selectedOption.label
        ) {
          onValueChange("");
        }
      }}
      itemToStringLabel={(option) => option?.label ?? ""}
      itemToStringValue={(option) => option?.value ?? ""}
      isItemEqualToValue={(option, selected) => option?.value === selected?.value}
      autoHighlight
      openOnInputClick
      disabled={disabled}
      required={required}
    >
      <Combobox.InputGroup
        className={cn(
          "relative flex h-11 w-full items-center rounded-md border border-border-control bg-transparent transition-colors sm:h-9",
          "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring-control",
          invalid && "border-danger"
        )}
      >
        <Combobox.Input
          id={id}
          name={name}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onBlur={onBlur}
          className="min-w-0 flex-1 bg-transparent px-2.5 py-1 text-sm text-text-primary outline-none placeholder:text-text-secondary"
        />
        <div className="flex h-full shrink-0 items-center pr-1 text-text-secondary">
          <Combobox.Clear
            aria-label={clearLabel}
            className="flex size-7 items-center justify-center rounded-sm hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring-control"
          >
            <span aria-hidden="true" className="text-base leading-none">
              ×
            </span>
          </Combobox.Clear>
          <Combobox.Trigger
            aria-label="Mostrar opciones"
            className="flex size-7 items-center justify-center rounded-sm hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring-control"
          >
            <ChevronDown className="size-4" aria-hidden="true" />
          </Combobox.Trigger>
        </div>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner className="z-50 outline-none" sideOffset={4}>
          <Combobox.Popup className="w-(--anchor-width) max-w-(--available-width) overflow-hidden rounded-md border border-border-control bg-surface text-text-primary shadow-lg outline-none">
            <Combobox.Empty className="px-3 py-3 text-sm text-text-secondary">
              {emptyMessage}
            </Combobox.Empty>
            <Combobox.List className="max-h-60 overflow-y-auto p-1 outline-none">
              {(option: SearchableDropdownOption) => (
                <Combobox.Item
                  key={option.value}
                  value={option}
                  className="grid min-h-8 cursor-default grid-cols-[1rem_1fr] items-center gap-2 rounded-sm px-2 text-sm outline-none select-none data-highlighted:bg-canvas-subtle"
                >
                  <Combobox.ItemIndicator className="col-start-1">
                    <Check className="size-4" aria-hidden="true" />
                  </Combobox.ItemIndicator>
                  <span className="col-start-2 truncate">{option.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
