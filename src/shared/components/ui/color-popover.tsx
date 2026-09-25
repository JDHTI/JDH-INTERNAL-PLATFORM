"use client";

import { useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Loader2 } from "lucide-react";

import { useRecentColors } from "@/shared/hooks/use-recent-colors";
import { errorMessage } from "@/shared/lib/api-client";

import { Button } from "./button";
import { ColorPicker } from "./color-picker";

/**
 * A trigger that opens the color picker with Guardar / Cancelar and, when a
 * color is set, Quitar color. `onSave` gets "#rrggbb" or null; when it
 * rejects, the popover stays open with the reason so the choice is not lost.
 * The saved color goes to the person's recents.
 */
export function ColorPopover({
  color,
  onSave,
  title,
  note,
  trigger,
  triggerClassName,
  triggerStyle,
  triggerLabel,
  triggerTitle,
  canClear = color !== null,
}: {
  color: string | null;
  /** Show "Quitar color". Defaults to whether there is a color to remove. */
  canClear?: boolean;
  onSave: (color: string | null) => Promise<void> | void;
  title: string;
  /** One line under the title saying where the color applies. */
  note: string;
  trigger: React.ReactNode;
  triggerClassName?: string;
  triggerStyle?: React.CSSProperties;
  triggerLabel: string;
  triggerTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(color);
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { remember } = useRecentColors();
  const popupRef = useRef<HTMLDivElement>(null);

  const openChange = (next: boolean) => {
    if (isSaving) return;
    if (next) {
      setDraft(color);
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
        aria-label={triggerLabel}
        title={triggerTitle}
        className={triggerClassName}
        style={triggerStyle}
      >
        {trigger}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={6} className="z-50">
          <Popover.Popup
            ref={popupRef}
            // Typing a code is the common case; the swatch first would open
            // the system palette on the next Enter.
            initialFocus={() =>
              popupRef.current?.querySelector<HTMLElement>("[data-color-picker-hex]") ?? true
            }
            className="w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface-raised p-4 text-text-primary shadow-modal outline-none"
          >
            <Popover.Title className="text-sm font-semibold">{title}</Popover.Title>
            <Popover.Description className="mt-0.5 text-[13px] text-text-secondary">
              {note}
            </Popover.Description>

            <ColorPicker value={draft} onChange={setDraft} className="mt-4" />

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-md bg-danger-surface px-3 py-2 text-[13px] text-danger"
              >
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {canClear && (
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
