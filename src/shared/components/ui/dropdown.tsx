"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";

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
};

function firstEnabledIndex(options: DropdownOption[]) {
  return options.findIndex((option) => !option.disabled);
}

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
  disabled,
  id,
  ...buttonProps
}: DropdownProps) {
  const generatedId = React.useId();
  const listboxId = `${id ?? `dropdown-${generatedId}`}-listbox`;
  const { containerRef, triggerRef, isOpen, setIsOpen } =
    useDismissablePanel<HTMLDivElement>();
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const openDropdown = () => {
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
      for (let step = 0; step < options.length; step += 1) {
        next = (next + direction + options.length) % options.length;
        if (!options[next]?.disabled) return next;
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
      const index = event.key === "Home" ? firstEnabledIndex(options) : [...options].findLastIndex((option) => !option.disabled);
      setHighlightedIndex(index);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
      } else if (options[highlightedIndex]) {
        selectOption(options[highlightedIndex]);
      }
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
        <div
          id={listboxId}
          role="listbox"
          aria-label={buttonProps["aria-label"]}
          className={cn(
            "absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md",
            "border border-border-control bg-surface p-1 shadow-lg",
            panelClassName
          )}
        >
          {options.map((option, index) => (
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
      )}
    </div>
  );
}
