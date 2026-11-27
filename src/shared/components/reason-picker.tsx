"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

/** A catalog reason as the picker needs it; `detail` is its second line (who answers for it, what it asks for). */
export interface PickerReason {
  id: string;
  name: string;
  is_active: boolean;
  detail?: string | null;
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * The one reason of a line. A button that reads as the reason itself, and a
 * filterable list that saves on pick: a line takes a single reason, so there is
 * nothing to confirm. Picking the current one again, or «Sin motivo», clears it.
 * A switched-off reason the line already has still shows, but cannot be picked.
 */
export default function ReasonPicker({
  reasons,
  value,
  valueName,
  onChange,
  saving = false,
  disabled = false,
  label,
  className,
}: {
  reasons: PickerReason[] | undefined;
  /** The current reason id, or null. */
  value: string | null;
  /** Its name, for when the catalog has not loaded or no longer lists it. */
  valueName?: string | null;
  onChange: (reasonId: string | null) => void;
  saving?: boolean;
  disabled?: boolean;
  /** Accessible name: «Motivo de EA-60379, referencia 1001». */
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  const current = reasons?.find((reason) => reason.id === value) ?? null;
  const currentName = current?.name ?? valueName ?? null;
  const options = useMemo(() => {
    const query = normalize(text.trim());
    return (reasons ?? []).filter(
      (reason) => (reason.is_active || reason.id === value) && (query === "" || normalize(reason.name).includes(query))
    );
  }, [reasons, text, value]);

  const pick = (next: string | null) => {
    setOpen(false);
    if (next !== value) onChange(next);
  };

  const focusItem = (index: number) => {
    const items = listRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
    if (!items || items.length === 0) return;
    items[(index + items.length) % items.length].focus();
  };
  const onListKey = (event: React.KeyboardEvent<HTMLUListElement>) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(index - 1);
    }
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setText("");
      }}
    >
      <Popover.Trigger
        disabled={disabled || saving}
        aria-label={`${label}: ${currentName ?? "sin motivo"}`}
        className={cn(
          "flex h-7 w-full min-w-0 items-center gap-1 rounded-md border border-border-control bg-transparent px-1.5 text-left text-xs",
          "transition-colors duration-150 outline-none hover:bg-canvas-subtle data-[popup-open]:bg-canvas-subtle",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring-control",
          "disabled:cursor-not-allowed disabled:opacity-60 max-md:h-11",
          className
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !currentName && "text-text-secondary")} title={currentName ?? undefined}>
          {currentName ?? "Sin motivo"}
        </span>
        {saving ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-text-secondary" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="start" sideOffset={4} className="z-50">
          <Popover.Popup className="w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface-raised text-text-primary shadow-modal outline-none">
            <Popover.Title className="sr-only">{label}</Popover.Title>
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
                <Input
                  type="search"
                  autoFocus
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      focusItem(0);
                    } else if (event.key === "Enter" && options.length === 1) {
                      event.preventDefault();
                      pick(options[0].id);
                    }
                  }}
                  placeholder="Buscar motivo"
                  aria-label="Buscar motivo"
                  aria-controls={listId}
                  className="h-8 pl-9 max-md:h-11"
                />
              </div>
            </div>
            <ul id={listId} ref={listRef} onKeyDown={onListKey} aria-label="Motivos" className="max-h-72 overflow-y-auto p-1">
              {reasons === undefined ? (
                <li className="px-2 py-3 text-sm text-text-secondary">Cargando motivos…</li>
              ) : options.length === 0 ? (
                <li className="px-2 py-3 text-sm text-text-secondary">Ningún motivo con ese texto.</li>
              ) : (
                options.map((reason) => {
                  const selected = reason.id === value;
                  return (
                    <li key={reason.id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        disabled={!reason.is_active && !selected}
                        onClick={() => pick(selected ? null : reason.id)}
                        className={cn(
                          "grid min-h-8 w-full grid-cols-[1rem_1fr] items-center gap-2 rounded-sm px-2 py-1 text-left text-sm outline-none",
                          "hover:bg-canvas-subtle focus-visible:bg-canvas-subtle focus-visible:outline-2 focus-visible:outline-ring max-md:min-h-11",
                          "disabled:cursor-not-allowed disabled:opacity-60"
                        )}
                      >
                        {selected ? <Check className="size-4" aria-hidden="true" /> : <span />}
                        <span className="min-w-0">
                          <span className="block">{reason.name}</span>
                          {(reason.detail || !reason.is_active) && (
                            <span className="block text-xs text-text-secondary">{!reason.is_active ? "Desactivado" : reason.detail}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
            {value !== null && (
              <div className="border-t border-border p-1">
                <button
                  type="button"
                  onClick={() => pick(null)}
                  className="flex min-h-8 w-full items-center rounded-sm px-2 text-left text-sm text-text-secondary outline-none hover:bg-canvas-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-ring max-md:min-h-11"
                >
                  Quitar el motivo
                </button>
              </div>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
