"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";

const toggleClasses = cn(
  "flex size-8 shrink-0 items-center justify-center rounded-md",
  "text-sidebar-muted transition-colors duration-150",
  "hover:bg-sidebar-hover hover:text-sidebar-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
);

/**
 * Brand block.
 *
 * No JDH logo asset has been provided, so the mark is the company initials set
 * in the UI typeface. It is a deliberate placeholder, not a generated logo:
 * swap it for the real asset once Mercadeo supplies one.
 *
 * Collapsed, the 64px rail only has room for one control, so the toggle takes
 * the slot and the wordmark steps aside.
 */
export default function SidebarHeader() {
  const { isSidebarCollapsed, toggleSidebar } = useUiStore();

  if (isSidebarCollapsed) {
    return (
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-sidebar-border px-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className={toggleClasses}
          aria-label="Expandir barra lateral"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-active text-[11px] font-semibold text-sidebar-foreground select-none"
        aria-hidden="true"
      >
        JDH
      </div>

      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-sidebar-foreground">
        Plataforma Interna
      </span>

      <button
        type="button"
        onClick={toggleSidebar}
        className={cn(toggleClasses, "hidden md:flex")}
        aria-label="Colapsar barra lateral"
      >
        <PanelLeftClose className="size-4" />
      </button>
    </div>
  );
}
