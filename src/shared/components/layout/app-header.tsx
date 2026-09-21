"use client";

import { Menu } from "lucide-react";

import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";
import Breadcrumbs from "./breadcrumbs";
import { headerIconButtonClass } from "./header/header-icon-button";
import NotificationsMenu from "./header/notifications-menu";
import QuickNotesMenu from "./header/quick-notes-menu";

/**
 * Application header: 60px, carrying the sidebar surface so the rail and the
 * bar above the content read as one frame around the canvas. No blur — see
 * docs/DESIGN.md §6.2.
 *
 * The height is 60px rather than a round 56px so its bottom edge lands
 * exactly where the area card ends: 12px of rail padding plus the card's
 * 48px. Change one and the other stops lining up.
 *
 * The wordmark that used to sit here is gone: the sidebar already carries the
 * brand mark, and repeating it in the header added nothing. In its place are
 * the two actions every screen can use regardless of which area is active:
 * notifications and a personal scratch pad. Both open a real panel with
 * honest content — see the components for what "honest" means for each.
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
        className={cn(headerIconButtonClass, "md:hidden")}
        aria-label="Abrir navegación"
      >
        <Menu className="size-4" />
      </button>

      <Breadcrumbs />

      <div
        aria-hidden="true"
        className="hidden h-5 w-px shrink-0 bg-sidebar-border sm:block"
      />

      <div className="flex shrink-0 items-center gap-1">
        <NotificationsMenu />
        <QuickNotesMenu />
      </div>
    </header>
  );
}
