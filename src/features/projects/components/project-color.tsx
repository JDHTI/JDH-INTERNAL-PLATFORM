"use client";

import { Check } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import { PROJECT_COLORS } from "../types/project.types";

/*
 * A project or folder color is a palette key. It resolves to a
 * `--project-<key>` token (globals.css), never a hex in the component, and it
 * paints with the tag recipe (DESIGN.md §7.7): solid dot, low tint, text left
 * at --text-primary. "default" (or a key this build does not know) is no color.
 */
export function hasColor(color: string | null | undefined): color is string {
  return !!color && color !== "default" && (PROJECT_COLORS as readonly string[]).includes(color);
}

export function colorStyle(color: string | null | undefined) {
  return hasColor(color)
    ? ({ "--item-color": `var(--project-${color})` } as React.CSSProperties)
    : undefined;
}

export function ColorDot({
  color,
  className,
}: {
  color: string | null | undefined;
  className?: string;
}) {
  if (!hasColor(color)) return null;
  return (
    <span
      aria-hidden="true"
      style={colorStyle(color)}
      className={cn("size-2 shrink-0 rounded-full bg-[var(--item-color)]", className)}
    />
  );
}

/** Tint for a row or chip background; the caller sets `colorStyle` on it. */
export const colorTint =
  "bg-[color-mix(in_srgb,var(--item-color)_14%,var(--surface))] dark:bg-[color-mix(in_srgb,var(--item-color)_24%,var(--surface))]";

/**
 * One radio per palette key. The name is the label: a swatch alone means
 * nothing to whoever cannot tell the hues apart.
 */
export function ColorSwatches({
  value,
  onChange,
  options,
  legend,
}: {
  value: string;
  onChange: (color: string) => void;
  options: { value: string; label: string }[];
  legend: string;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-[13px] font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <label
              key={option.value}
              title={option.label}
              style={colorStyle(option.value)}
              className={cn(
                "relative flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border px-2 text-[13px] max-md:h-11",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                hasColor(option.value) ? colorTint : "bg-canvas-subtle",
                isSelected ? "border-primary font-medium" : "border-transparent"
              )}
            >
              <input
                type="radio"
                name={legend}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {isSelected ? (
                <Check className="size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <ColorDot color={option.value} />
              )}
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
