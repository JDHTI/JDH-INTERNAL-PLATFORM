"use client";

import { X } from "lucide-react";

import { ColorPopover } from "@/shared/components/ui/color-popover";
import { cn } from "@/shared/lib/utils";

/*
 * A colored tag is a tint of its color over the surface plus a solid dot,
 * with the text left at --text-primary (DESIGN.md §7.7). The tint is capped
 * low enough that any color the area picks keeps the text above 4.5:1:
 * worst case 12.19:1 in light (black at 14%) and 6.9:1 in dark (white at 24%).
 */
const chipBase =
  "inline-flex max-w-full items-center gap-1.5 rounded-sm px-2 py-0.5 text-[13px] font-medium";

export function chipStyle(color: string | undefined) {
  return color ? ({ "--tag-color": color } as React.CSSProperties) : undefined;
}

export function chipTone(color: string | undefined) {
  return color
    ? "bg-[color-mix(in_srgb,var(--tag-color)_14%,var(--surface))] dark:bg-[color-mix(in_srgb,var(--tag-color)_24%,var(--surface))]"
    : "bg-canvas-subtle";
}

function ChipContent({ tag, color }: { tag: string; color: string | undefined }) {
  return (
    <>
      {color && (
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[var(--tag-color)]" />
      )}
      <span className="truncate">{tag}</span>
    </>
  );
}

export function TagChip({ tag, color }: { tag: string; color?: string }) {
  return (
    <span className={cn(chipBase, chipTone(color))} style={chipStyle(color)}>
      <ChipContent tag={tag} color={color} />
    </span>
  );
}

const pressable =
  "cursor-pointer transition-[filter] duration-150 hover:brightness-95 dark:hover:brightness-125 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * The chip is the trigger: clicking a tag opens its color. With `onRemove`
 * (the upload form's tag input) a × sits inside the chip; both halves keep
 * the 44px hit area on touch.
 */
export function TagColorButton({
  tag,
  color,
  onSave,
  scopeNote,
  onRemove,
}: {
  tag: string;
  color?: string;
  onSave: (color: string | null) => Promise<void> | void;
  scopeNote: string;
  onRemove?: () => void;
}) {
  const popover = (
    <ColorPopover
      color={color ?? null}
      onSave={onSave}
      title={`Color de «${tag}»`}
      note={scopeNote}
      triggerLabel={`Color de la etiqueta ${tag}`}
      triggerTitle="Cambiar color"
      trigger={<ChipContent tag={tag} color={color} />}
      triggerStyle={chipStyle(color)}
      triggerClassName={cn(
        chipBase,
        pressable,
        "max-md:min-h-11",
        onRemove ? "rounded-r-none pr-1" : chipTone(color)
      )}
    />
  );

  if (!onRemove) return popover;

  return (
    <span className={cn("inline-flex max-w-full rounded-sm", chipTone(color))} style={chipStyle(color)}>
      {popover}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar la etiqueta ${tag}`}
        title="Quitar"
        className={cn(
          "flex items-center rounded-r-sm px-1 text-text-secondary hover:text-text-primary",
          pressable,
          "max-md:min-h-11 max-md:px-2"
        )}
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}
