"use client";

import { Check } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import { PALETTE_LABEL } from "../lib/format";
import { PALETTE_KEYS } from "../lib/map-tokens";
import type { PaletteKey } from "../types/commercial-map.types";

/**
 * The nine colors a zone can take (DESIGN.md §3.8), as a radio group. The
 * chosen one carries a check and its name is written beside the group, so the
 * choice does not depend on telling the tones apart.
 */
export default function ColorSwatches({
  value,
  onChange,
  labelledBy,
}: {
  value: PaletteKey;
  onChange: (color: PaletteKey) => void;
  labelledBy: string;
}) {
  const move = (step: 1 | -1) => {
    const index = PALETTE_KEYS.indexOf(value);
    onChange(PALETTE_KEYS[(index + step + PALETTE_KEYS.length) % PALETTE_KEYS.length]);
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        className="flex flex-wrap gap-1.5"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            move(1);
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            move(-1);
          }
        }}
      >
        {PALETTE_KEYS.map((color) => {
          const checked = color === value;
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={PALETTE_LABEL[color]}
              title={PALETTE_LABEL[color]}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(color)}
              className={cn(
                "flex size-8 items-center justify-center rounded-md border border-[var(--map-label)] max-md:size-11",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                checked && "outline-2 outline-offset-2 outline-primary"
              )}
              style={{ backgroundColor: `var(--project-${color})` }}
            >
              {checked && (
                <span className="flex size-4 items-center justify-center rounded-full bg-surface text-text-primary">
                  <Check className="size-3" aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <span className="text-[13px] text-text-secondary" aria-hidden="true">
        {PALETTE_LABEL[value]}
      </span>
    </div>
  );
}
