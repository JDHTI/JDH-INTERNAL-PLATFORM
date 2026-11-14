import { cn } from "@/shared/lib/utils";

import type { PaletteKey } from "../types/commercial-map.types";

const projectColor = (color: PaletteKey) => `var(--project-${color})`;

/**
 * A prospect as the map draws it: the dot in its category's color, a second
 * ring for a former customer, a hollow centre for an approximate location.
 * Used in the legend and the lists so the map needs no separate key.
 */
export function ProspectMark({
  color,
  former = false,
  approximate = false,
  className,
}: {
  color: PaletteKey;
  former?: boolean;
  approximate?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex size-5 shrink-0 items-center justify-center", className)} aria-hidden="true">
      {former && <span className="absolute inset-0 rounded-full border-[1.5px] border-text-primary" />}
      <span
        className="size-3 rounded-full border border-[var(--map-label)]"
        style={{ backgroundColor: projectColor(color) }}
      />
      {approximate && <span className="absolute size-1.5 rounded-full bg-[var(--map-chip)]" />}
    </span>
  );
}

/** The 8px dot of the label recipe (DESIGN.md §7.7). */
export function ColorDot({ color, className }: { color: PaletteKey; className?: string }) {
  return (
    <span
      className={cn("size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: projectColor(color) }}
      aria-hidden="true"
    />
  );
}

/** A commercial zone by name, tinted with its color: the text stays `--text-primary`. */
export function ZoneTag({ name, color }: { name: string; color: PaletteKey | null }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-sm bg-canvas-subtle px-2 py-0.5 text-[13px] leading-5 font-medium"
      style={
        color
          ? {
              backgroundColor: `color-mix(in srgb, ${projectColor(color)} calc(var(--map-zone-tint) * 100%), var(--surface))`,
            }
          : undefined
      }
    >
      {color && <ColorDot color={color} />}
      <span className="truncate">{name}</span>
    </span>
  );
}
