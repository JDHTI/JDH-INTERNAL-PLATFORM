"use client";

import { useId } from "react";
import { ListTodo } from "lucide-react";

import { useDismissablePanel } from "@/shared/hooks/use-dismissable-panel";
import { cn } from "@/shared/lib/utils";
import { headerIconButtonClass } from "./header-icon-button";

/**
 * Cross-area pending-tasks center.
 *
 * No module reports its pending work anywhere central yet — there is no
 * "this PQRSF case needs you" or "this payment needs approval" signal to
 * collect — so the panel says exactly that instead of a fabricated list
 * (R-38) or an invented badge count (R-17). It becomes real once a couple of
 * modules exist to report into it.
 */
export default function TasksMenu() {
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
        aria-label="Tareas pendientes"
        className={cn(
          headerIconButtonClass,
          isOpen && "bg-sidebar-hover text-sidebar-foreground"
        )}
      >
        <ListTodo className="size-4" />
      </button>

      {isOpen && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Tareas pendientes"
          className={cn(
            "absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden rounded-md",
            "border border-sidebar-border bg-sidebar shadow-lg"
          )}
        >
          <div className="border-b border-sidebar-border px-3 py-2">
            <h2 className="text-sm font-semibold text-sidebar-foreground">
              Tareas pendientes
            </h2>
          </div>

          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <ListTodo
              className="size-6 text-sidebar-muted"
              aria-hidden="true"
            />
            <p className="text-sm text-sidebar-muted">
              No tienes tareas pendientes. Cuando un módulo te asigne algo
              (un caso, una aprobación) aparecerá aquí, sin importar el área
              en la que estés.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
