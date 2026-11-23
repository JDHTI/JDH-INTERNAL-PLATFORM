"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { useDismissablePanel } from "@/shared/hooks/use-dismissable-panel";
import { cn } from "@/shared/lib/utils";

export interface DropdownOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

type DropdownProps = Omit<
  React.ComponentProps<"button">,
  "children" | "value" | "onChange" | "onClick"
> & {
  options: DropdownOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: React.ReactNode;
  size?: "default" | "sm";
  panelClassName?: string;
  clearable?: boolean;
  clearLabel?: string;
  /** A search box at the top of the panel that narrows long lists as one types. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** What the panel says when the search matches nothing. */
  emptyMessage?: string;
};

function firstEnabledIndex(options: DropdownOption[]) {
  return options.findIndex((option) => !option.disabled);
}

/** Case and accents aside: "categoria" finds "Categoría". */
const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** The text a label is searched by; a non-text label is never filtered out. */
const labelText = (label: React.ReactNode) => (typeof label === "string" || typeof label === "number" ? String(label) : null);

/**
 * Theme-safe select control. It replaces the browser-native select popup so
 * its panel, width, spacing and focus state stay consistent across browsers.
 */
export function Dropdown({
  className,
  options,
  value,
  onValueChange,
  placeholder = "Selecciona una opción",
  size = "default",
  panelClassName,
  clearable = false,
  clearLabel = "Limpiar selección",
  searchable = false,
  searchPlaceholder = "Buscar",
  emptyMessage = "Nada coincide con la búsqueda.",
  disabled,
  id,
  ...buttonProps
}: DropdownProps) {
  const generatedId = React.useId();
  const listboxId = `${id ?? `dropdown-${generatedId}`}-listbox`;
  const { containerRef, triggerRef, isOpen, setIsOpen } =
    useDismissablePanel<HTMLDivElement>();
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const [query, setQuery] = React.useState("");
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  // What the panel lists: every option, or the ones the search box matches.
  const needle = searchable ? fold(query.trim()) : "";
  const shown =
    needle === ""
      ? options
      : options.filter((option) => {
          const text = labelText(option.label);
          return text === null || fold(text).includes(needle);
        });

  const openDropdown = () => {
    setQuery("");
    const nextIndex =
      selectedIndex >= 0 && !options[selectedIndex]?.disabled
        ? selectedIndex
        : firstEnabledIndex(options);
    setHighlightedIndex(nextIndex);
    setIsOpen(true);
  };

  const moveHighlight = (direction: 1 | -1) => {
    setHighlightedIndex((current) => {
      let next = current;
      for (let step = 0; step < shown.length; step += 1) {
        next = (next + direction + shown.length) % shown.length;
        if (!shown[next]?.disabled) return next;
      }
      return current;
    });
  };

  const selectOption = (option: DropdownOption) => {
    if (option.disabled) return;
    onValueChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const clearSelection = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onValueChange("");
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Tab") {
      setIsOpen(false);
      return;
    }

    // Closes the list without also closing the dialog around it, as the Autocomplete does.
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
        return;
      }
      moveHighlight(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      if (!isOpen) return;
      event.preventDefault();
      const index = event.key === "Home" ? firstEnabledIndex(shown) : [...shown].findLastIndex((option) => !option.disabled);
      setHighlightedIndex(index);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
      } else if (shown[highlightedIndex]) {
        selectOption(shown[highlightedIndex]);
      }
    }
  };

  // The search box keeps the list's keys (arrows, Enter, Escape, Tab); Space and Home/End type.
  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Tab") {
      setIsOpen(false);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(event.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (shown[highlightedIndex]) selectOption(shown[highlightedIndex]);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        {...buttonProps}
        id={id}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        data-slot="dropdown-trigger"
        onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-border-control bg-transparent text-left text-text-primary",
          "transition-colors duration-150 outline-none hover:bg-canvas-subtle",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-control",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          size === "sm" ? "h-8 px-2 text-xs" : "h-9 px-2.5 text-sm",
          // Room for the clear button, which sits at the right edge, after the chevron.
          clearable && value && "pr-9"
        )}
      >
        <span className={cn("min-w-0 truncate", !selectedOption && "text-text-secondary")}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-text-secondary transition-transform", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {clearable && value && !disabled && (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={clearSelection}
          className="absolute right-1.5 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-text-secondary hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring-control"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}

      {isOpen && (
        // One panel: the search box (when there is one) on top, the list under it. The listbox
        // holds only the options.
        <div
          className={cn(
            "absolute top-full z-50 mt-1 rounded-md border border-border-control bg-surface shadow-lg",
            // A searchable list holds long names (suppliers): it may grow past the trigger.
            searchable ? "left-0 w-max min-w-full max-w-[min(24rem,calc(100vw-2rem))]" : "inset-x-0"
          )}
        >
          {searchable && (
            <div className="relative border-b border-border p-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                aria-label={`${searchPlaceholder}${buttonProps["aria-label"] ? `: ${buttonProps["aria-label"]}` : ""}`}
                aria-controls={listboxId}
                autoFocus
                className="h-8 w-full rounded-sm bg-transparent pl-8 pr-2 text-sm text-text-primary outline-none placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring-control max-md:h-11"
              />
            </div>
          )}
          <div id={listboxId} role="listbox" aria-label={buttonProps["aria-label"]} className={cn("max-h-60 overflow-y-auto p-1", panelClassName)}>
          {shown.length === 0 && <p className="px-2 py-2 text-sm text-text-secondary">{emptyMessage}</p>}
          {shown.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              disabled={option.disabled}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectOption(option)}
              className={cn(
                "flex min-h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring-control",
                option.disabled
                  ? "cursor-not-allowed text-text-disabled"
                  : "text-text-primary hover:bg-canvas-subtle",
                highlightedIndex === index && !option.disabled && "bg-canvas-subtle"
              )}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.value === value && <Check className="size-4 shrink-0" aria-hidden="true" />}
            </button>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
