"use client";

import { useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Loader2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { ColorPicker } from "@/shared/components/ui/color-picker";
import { useRecentColors } from "@/shared/hooks/use-recent-colors";
import { errorMessage } from "@/shared/lib/api-client";
import { cn } from "@/shared/lib/utils";

/*
 * A colored tag is a tint of its color over the surface plus a solid dot,
 * with the text left at --text-primary (DESIGN.md §7.7). The tint is capped
 * low enough that any color the area picks keeps the text above 4.5:1:
 * worst case 12.19:1 in light (black at 14%) and 6.9:1 in dark (white at 24%).
 */
const chipBase = "inline-flex max-w-full items-center gap-1.5 rounded-sm px-2 py-0.5 text-[13px] font-medium";

function chipStyle(color: string | undefined) {
  return color ? ({ "--tag-color": color } as React.CSSProperties) : undefined;
}

function chipTone(color: string | undefined) {
  return color
    ? "bg-[color-mix(in_srgb,var(--tag-color)_14%,var(--surface))] dark:bg-[color-mix(in_srgb,var(--tag-color)_24%,var(--surface))]"
    : "bg-canvas-subtle";
}

function ChipContent({ tag, color }: { tag: string; color: string | undefined }) {
  return (
    <>
      {color && (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-[var(--tag-color)]"
        />
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

/**
 * The chip is the trigger: clicking a tag opens its color. `onSave` gets the
 * new "#rrggbb", or null to remove it; when it rejects, the popover stays
 * open with the reason so the choice is not lost.
 */
export function TagColorButton({
  tag,
  color,
  onSave,
  scopeNote,
}: {
  tag: string;
  color?: string;
  onSave: (color: string | null) => Promise<void> | void;
  /** One line under the title saying where the color applies. */
  scopeNote: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(color ?? null);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { remember } = useRecentColors();
  const popupRef = useRef<HTMLDivElement>(null);

  const openChange = (next: boolean) => {
    if (isSaving) return;
    if (next) {
      setDraft(color ?? null);
      setError(null);
    }
    setOpen(next);
  };

  const save = async (next: string | null) => {
    setSaving(true);
    setError(null);
    try {
      await onSave(next);
      if (next) remember(next);
      setOpen(false);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={openChange}>
      <Popover.Trigger
        aria-label={`Color de la etiqueta ${tag}`}
        title="Cambiar color"
        className={cn(
          chipBase,
          chipTone(color),
          "cursor-pointer transition-[filter] duration-150 hover:brightness-95 dark:hover:brightness-125",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          // The chip stays compact in the table; the hit area grows on touch.
          "max-md:min-h-11"
        )}
        style={chipStyle(color)}
      >
        <ChipContent tag={tag} color={color} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Popover.Popup
            initialFocus={() =>
              popupRef.current?.querySelector<HTMLElement>("[data-color-picker-hex]") ?? true
            }
            ref={popupRef}
            className={cn(
              "w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface-raised p-4 text-text-primary shadow-modal",
              "outline-none"
            )}
          >
            <Popover.Title className="text-sm font-semibold">
              Color de «{tag}»
            </Popover.Title>
            <Popover.Description className="mt-0.5 text-[13px] text-text-secondary">
              {scopeNote}
            </Popover.Description>

            <ColorPicker value={draft} onChange={setDraft} className="mt-4" />

            {error && (
              <p role="alert" className="mt-3 rounded-md bg-danger-surface px-3 py-2 text-[13px] text-danger">
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {color && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => save(null)}
                  className="mr-auto max-md:h-11"
                >
                  Quitar color
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Popover.Close
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      className="max-md:h-11"
                    />
                  }
                >
                  Cancelar
                </Popover.Close>
                <Button
                  size="sm"
                  disabled={isSaving || !draft || draft === color}
                  onClick={() => draft && save(draft)}
                  className="max-md:h-11"
                >
                  {isSaving && <Loader2 className="animate-spin" aria-hidden="true" />}
                  Guardar
                </Button>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
