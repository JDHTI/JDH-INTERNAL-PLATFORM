"use client";

import { LayoutGrid } from "lucide-react";

import { useActiveArea } from "@/features/areas/hooks/use-areas";
import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";
import Breadcrumbs from "./breadcrumbs";
import HelpLink from "./header/help-link";
import NotificationsMenu from "./header/notifications-menu";
import QuickNotesMenu from "./header/quick-notes-menu";
import TasksMenu from "./header/tasks-menu";

/**
 * Application header: 72px, carrying the sidebar surface so the rail and the
 * bar above the content read as one frame around the canvas. No blur — see
 * docs/DESIGN.md §6.2.
 *
 * The area card starts 12px from the rail's top and is 48px high, placing its
 * center at y=36. A 72px header shares that centerline, so the breadcrumb and
 * the card contents align vertically. See docs/DESIGN.md §5.3.
 *
 * The wordmark that used to sit here is gone: the sidebar already carries the
 * brand mark, and repeating it in the header added nothing. In its place are
 * the actions every screen can use regardless of which area is active: what
 * needs the user's attention (tasks, notifications), then personal utilities
 * (notes, help). Each opens a real panel or links to a real page — see the
 * individual components for what "honest" means for each.
 *
 * Collapsing the rail is the area card's job, so the header carries no
 * sidebar control beyond the mobile drawer trigger, which has no counterpart
 * on small screens.
 */
export default function AppHeader() {
  const setMobileMenuOpen = useUiStore((state) => state.setMobileMenuOpen);
  const { area } = useActiveArea();
  const AreaIcon = area?.icon ?? LayoutGrid;

  return (
    <header className="flex h-18 w-full shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-3 text-sidebar-foreground">
      {/* The drawer trigger wears the collapsed rail's face (the area badge), so on a
          phone the sidebar opens from what it looks like when it is closed. */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        title={area ? `${area.name}: abrir navegación` : "Abrir navegación"}
        aria-label={area ? `${area.name}. Abrir navegación` : "Abrir navegación"}
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-md border-[0.5px] border-sidebar-border bg-sidebar-active md:hidden",
          "transition-colors duration-150 hover:bg-sidebar-hover",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
        )}
      >
        <span className="flex size-8 items-center justify-center rounded-sm bg-sidebar-active" aria-hidden="true">
          <AreaIcon className="size-4 text-sidebar-foreground" />
        </span>
      </button>

      <Breadcrumbs />

      <div
        aria-hidden="true"
        className="hidden h-5 w-px shrink-0 bg-sidebar-border sm:block"
      />

      <div className="flex shrink-0 items-center gap-1">
        <TasksMenu />
        <NotificationsMenu />
        <QuickNotesMenu />
        <HelpLink />
      </div>
    </header>
  );
}
