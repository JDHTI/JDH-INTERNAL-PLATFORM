"use client";

import { Menu } from "lucide-react";

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
 *
 * Collapsing the rail is the area card's job, so the header carries no
 * sidebar control beyond the mobile drawer trigger, which has no counterpart
 * on small screens.
 */
export default function AppHeader() {
  const setMobileMenuOpen = useUiStore((state) => state.setMobileMenuOpen);

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

      <Breadcrumbs />
    </header>
  );
}
