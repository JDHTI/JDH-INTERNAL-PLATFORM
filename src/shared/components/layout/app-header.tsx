"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";
import Breadcrumbs from "./breadcrumbs";

const iconButton = cn(
  "flex size-8 shrink-0 items-center justify-center rounded-md",
  "text-text-secondary transition-colors duration-150",
  "hover:bg-canvas-subtle hover:text-text-primary",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
);

/**
 * Application header: 56px, sticky, sitting on the canvas with a hairline
 * below it. No blur — see docs/DESIGN.md §6.2.
 *
 * The right slot is deliberately empty. The reference layout puts a user menu
 * and a notification bell there; both would need a session and a notification
 * feed that do not exist yet, and a bell that never rings is a dead control.
 * Identity lives in the sidebar card instead.
 */
export default function AppHeader() {
  const { isSidebarCollapsed, toggleSidebar, setMobileMenuOpen } = useUiStore();

  return (
    <header className="flex h-14 w-full shrink-0 items-center gap-3 border-b border-border bg-canvas px-4">
      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className={cn(iconButton, "md:hidden")}
        aria-label="Abrir navegación"
      >
        <Menu className="size-4" />
      </button>

      {/* Rail collapse lives here rather than inside the sidebar: the area
          switcher now owns the top of the rail, and at 64px there is no room
          for two controls side by side. */}
      <button
        type="button"
        onClick={toggleSidebar}
        className={cn(iconButton, "hidden md:flex")}
        aria-label={
          isSidebarCollapsed
            ? "Expandir barra lateral"
            : "Colapsar barra lateral"
        }
      >
        {isSidebarCollapsed ? (
          <PanelLeftOpen className="size-4" />
        ) : (
          <PanelLeftClose className="size-4" />
        )}
      </button>

      <Breadcrumbs />
    </header>
  );
}
