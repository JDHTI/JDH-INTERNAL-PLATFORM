"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

export interface AutocompleteOption {
  value: string;
  label: string;
  /** Second line in the list, e.g. an email or a response time. */
  hint?: string;
  /** The row the option came from, for a caller that needs more than the value (a branch count). */
  data?: Readonly<Record<string, unknown>>;
}

type AutocompleteProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "onSelect" | "role"
> & {
  value: string;
  onValueChange: (text: string) => void;
  options: AutocompleteOption[];
  onSelect: (option: AutocompleteOption) => void;
  isLoading?: boolean;
  /** Shown when the list is open but nothing matches; omitted means stay closed. */
  emptyText?: string;
};

/**
 * Text field with a suggestion list (WAI-ARIA combobox, list autocomplete).
 * Typing is never blocked: in free-text fields the list only offers what was
 * written before, the way Excel completes a column. Enter picks the
 * highlighted option only while the list is open; otherwise it falls through
 * to `onKeyDown`, so a table row can use it to add the next row.
 */
export function Autocomplete({
  id,
  value,
  onValueChange,
  options,
  onSelect,
  isLoading = false,
  emptyText,
  onKeyDown,
  onBlur,
  onFocus,
  className,
  ...inputProps
}: AutocompleteProps) {
  const generatedId = React.useId();
  const inputId = id ?? `autocomplete-${generatedId}`;
  const listId = `${inputId}-list`;
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(-1);

  const showEmpty = isOpen && options.length === 0 && !isLoading && Boolean(emptyText);
  const showList = isOpen && (options.length > 0 || showEmpty);
  const active = highlighted >= 0 && highlighted < options.length ? highlighted : -1;

  const pick = (option: AutocompleteOption) => {
    onSelect(option);
    setIsOpen(false);
    setHighlighted(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlighted(0);
        return;
      }
      if (options.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlighted((current) => (current + step + options.length) % options.length);
      return;
    }
    if (event.key === "Escape" && isOpen) {
      // Closes the list without also closing the dialog around it.
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      return;
    }
    if (event.key === "Enter" && isOpen && active >= 0) {
      event.preventDefault();
      pick(options[active]);
      return;
    }
    onKeyDown?.(event);
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        {...inputProps}
        id={inputId}
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          setIsOpen(true);
          setHighlighted(-1);
        }}
        onBlur={(event) => {
          setIsOpen(false);
          onBlur?.(event);
        }}
        onFocus={(event) => { setIsOpen(true); onFocus?.(event); }}
        onKeyDown={handleKeyDown}
        className={isLoading ? "pr-8" : undefined}
      />
      {isLoading && isOpen && (
        <Loader2
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-text-secondary"
          aria-hidden="true"
        />
      )}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-border-control bg-surface-raised p-1 shadow-lg"
        >
          {showEmpty ? (
            <li className="px-2 py-1.5 text-sm text-text-secondary">{emptyText}</li>
          ) : (
            options.map((option, index) => (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                // mousedown, not click: the input would blur first and close the list.
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(option);
                }}
                onMouseEnter={() => setHighlighted(index)}
                className={cn(
                  "cursor-pointer rounded-sm px-2 py-1.5 text-sm",
                  index === active ? "bg-canvas-subtle" : "hover:bg-canvas-subtle"
                )}
              >
                <span className="block truncate">{option.label}</span>
                {option.hint && (
                  <span className="block truncate text-[13px] text-text-secondary">
                    {option.hint}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
