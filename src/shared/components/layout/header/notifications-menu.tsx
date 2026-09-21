"use client";

import { useId } from "react";
import { Bell } from "lucide-react";

import { useDismissablePanel } from "@/shared/hooks/use-dismissable-panel";
import { cn } from "@/shared/lib/utils";
import { headerIconButtonClass } from "./header-icon-button";

/**
 * Notification bell.
 *
 * No notification service exists yet, so the panel it opens is a real, honest
 * empty state rather than a fabricated feed (R-38) or a badge with an invented
 * count (R-17). Opening and closing the panel is itself real behaviour, which
 * is what keeps this from being the dead control a bell with nothing behind
 * it would be.
 */
export default function NotificationsMenu() {
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
        aria-label="Notificaciones"
        className={cn(
          headerIconButtonClass,
          isOpen && "bg-sidebar-hover text-sidebar-foreground"
        )}
      >
        <Bell className="size-4" />
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notificaciones"
          className={cn(
            "absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden rounded-md",
            "border border-sidebar-border bg-sidebar shadow-lg"
          )}
        >
          <div className="border-b border-sidebar-border px-3 py-2">
            <h2 className="text-sm font-semibold text-sidebar-foreground">
              Notificaciones
            </h2>
          </div>

          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <Bell className="size-6 text-sidebar-muted" aria-hidden="true" />
            <p className="text-sm text-sidebar-muted">
              No tienes notificaciones. Aquí aparecerán las alertas de tus
              módulos cuando el servicio esté conectado.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
