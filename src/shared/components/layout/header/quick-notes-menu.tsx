"use client";

import { useId, useRef, useState } from "react";
import { StickyNote } from "lucide-react";

import { useDismissablePanel } from "@/shared/hooks/use-dismissable-panel";
import { cn } from "@/shared/lib/utils";
import { headerIconButtonClass } from "./header-icon-button";

const STORAGE_KEY = "jdh-quick-notes";
const SAVE_DELAY_MS = 400;

function readStoredNotes(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Personal scratch pad, saved to this browser only.
 *
 * There is no notes service to send this to, so rather than a "coming soon"
 * stub or a fake sync indicator, it is a genuinely working feature scoped to
 * what a frontend alone can honestly provide: it persists across reloads on
 * this device and says so, instead of implying it follows the user anywhere.
 */
export default function QuickNotesMenu() {
  const panelId = useId();
  const { containerRef, triggerRef, isOpen, setIsOpen } =
    useDismissablePanel<HTMLDivElement>();

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-label="Notas rápidas"
        className={cn(
          headerIconButtonClass,
          isOpen && "bg-sidebar-hover text-sidebar-foreground"
        )}
      >
        <StickyNote className="size-4" />
      </button>

      {/* The panel — and the note editor inside it — only ever mounts after
          this button has been clicked, which can only happen once hydration
          is done. So reading localStorage in its useState initializer below
          is safe: that render never happens on the server, and there is
          nothing for it to disagree with. */}
      {isOpen && <QuickNotesPanel panelId={panelId} />}
    </div>
  );
}

function QuickNotesPanel({ panelId }: { panelId: string }) {
  const [notes, setNotes] = useState(readStoredNotes);
  const [justSaved, setJustSaved] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (value: string) => {
    setNotes(value);
    setJustSaved(false);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, value);
        setJustSaved(true);
      } catch {
        // Nothing useful to surface for a personal scratch pad if storage
        // is unavailable — the text stays on screen either way.
      }
    }, SAVE_DELAY_MS);
  };

  return (
    <div
      id={panelId}
      role="dialog"
      aria-label="Notas rápidas"
      className={cn(
        "absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden rounded-md",
        "border border-sidebar-border bg-sidebar shadow-lg"
      )}
    >
      <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2">
        <h2 className="text-sm font-semibold text-sidebar-foreground">
          Notas rápidas
        </h2>
        <span aria-live="polite" className="text-[11px] text-sidebar-muted">
          {justSaved ? "Guardado" : ""}
        </span>
      </div>

      <div className="p-3">
        <textarea
          value={notes}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="Escribe algo para recordar..."
          rows={6}
          autoFocus
          className={cn(
            "w-full resize-none rounded-md border border-sidebar-border bg-transparent p-2",
            "text-sm text-sidebar-foreground placeholder:text-sidebar-muted",
            "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
          )}
        />
        <p className="mt-2 text-[11px] text-sidebar-muted">
          Solo se guarda en este navegador. No se comparte con tu equipo ni se
          sincroniza entre dispositivos todavía.
        </p>
      </div>
    </div>
  );
}
