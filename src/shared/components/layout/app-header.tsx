"use client";

import { Menu } from "lucide-react";

import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";
import Breadcrumbs from "./breadcrumbs";

const iconButton = cn(
  "flex size-8 shrink-0 items-center justify-center rounded-md",
  "text-sidebar-muted transition-colors duration-150",
  "hover:bg-sidebar-hover hover:text-sidebar-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
);

/**
 * Application header: 60px, carrying the sidebar surface so the rail and the
 * bar above the content read as one frame around the canvas. No blur — see
 * docs/DESIGN.md §6.2.
 *
 * The height is 60px rather than a round 56px so its bottom edge lands
 * exactly where the area card ends: 12px of rail padding plus the card's
 * 48px. Change one and the other stops lining up.
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
    <header className="flex h-15 w-full shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground">
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
