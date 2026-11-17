"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, LayoutGrid } from "lucide-react";

import { useActiveArea } from "@/features/areas/hooks/use-areas";
import type { Area } from "@/features/areas/types/area.types";
import { ScrollCue } from "@/shared/components/ui/scroll-cue";
import { useIsDrawer, useRailCollapsed } from "@/shared/hooks/use-rail-collapsed";
import { useScrollHints } from "@/shared/hooks/use-scroll-hints";
import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";

/**
 * Area switcher.
 *
 * The active area comes from the URL, not from stored state: every area route
 * starts with its slug, so a deep link or a refresh lands with the right area
 * already selected. On the guide (`/workspace`) there is no area yet, and the
 * card becomes the "Selecciona tu área" prompt that opens the same list.
 *
 * With an area, the card and the chevron are two sibling buttons with two
 * different jobs: pressing the card collapses the rail, pressing the chevron
 * opens the area list. They are siblings rather than nested because a button
 * inside a button is invalid markup and browsers resolve it unpredictably.
 */
export default function SidebarAreaSwitcher() {
  const { area, areas, isPending } = useActiveArea();
  const isSidebarCollapsed = useRailCollapsed();

  if (!area && (isPending || areas.length === 0)) {
    // Same 48px footprint as the card, so the rail does not jump when the
    // areas arrive.
    return (
      <div className="shrink-0 p-3">
        <div
          className={cn(
            "flex h-12 items-center rounded-md border-[0.5px] border-sidebar-border bg-sidebar-subtle px-2",
            isPending && "animate-pulse"
          )}
          aria-busy={isPending}
        >
          {!isPending && !isSidebarCollapsed && (
            <span className="truncate px-2 text-sm text-sidebar-muted">Sin áreas asignadas</span>
          )}
        </div>
      </div>
    );
  }

  return <AreaSwitcherCard activeArea={area} areas={areas} />;
}

function AreaSwitcherCard({ activeArea, areas }: { activeArea?: Area; areas: Area[] }) {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const scroll = useScrollHints<HTMLUListElement>();

  const {
    setSidebarCollapsed,
    setMobileMenuOpen,
    isAreaPickerOpen: isOpen,
    setAreaPickerOpen: setIsOpen,
    openAreaPicker,
  } = useUiStore();
  const isSidebarCollapsed = useRailCollapsed();
  const isDrawer = useIsDrawer();

  useEffect(() => {
    if (!isOpen) return;

    // With more areas than fit, open scrolled to the current one.
    listRef.current?.querySelector("[aria-current]")?.scrollIntoView({ block: "nearest" });
    // Opened from the collapsed rail, whose button is gone now: focus follows
    // into the list. One frame later, because a drawer is `invisible` on the first one.
    const focusFrame = containerRef.current?.contains(document.activeElement)
      ? undefined
      : requestAnimationFrame(() =>
          requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>("a")?.focus())
        );

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      // Returning focus to the toggle keeps keyboard users where they were,
      // instead of dropping focus back to the top of the document.
      toggleRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      if (focusFrame !== undefined) cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  const ActiveIcon = activeArea?.icon ?? LayoutGrid;

  const areaBadge = (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-sidebar-active"
      aria-hidden="true"
    >
      <ActiveIcon className="size-4 text-sidebar-foreground" />
    </span>
  );

  if (isSidebarCollapsed) {
    const label = activeArea?.name ?? "Selecciona tu área";
    return (
      <div className="shrink-0 p-3">
        <button
          type="button"
          onClick={() => (activeArea ? setSidebarCollapsed(false) : openAreaPicker())}
          title={label}
          aria-label={`${label}. Expandir barra lateral`}
          className={cn(
            // Square, not the card's 48x40: the rail is sized so the frame
            // around the 32px badge is 8px on every side rather than 8px
            // vertically and 4px horizontally.
            "flex size-12 items-center justify-center rounded-md",
            "border-[0.5px] bg-sidebar-active transition-colors duration-150",
            activeArea ? "border-sidebar-border" : "border-dashed border-sidebar-muted",
            "hover:bg-sidebar-hover",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
          )}
        >
          {areaBadge}
        </button>
      </div>
    );
  }

  const closePanel = () => {
    // Closed here rather than by watching the pathname: the click is the
    // event, and an effect that reacts to the route would just be a slower
    // way to say the same thing.
    setIsOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <div className="shrink-0 p-3">
      <div ref={containerRef} className="relative">
        {activeArea ? (
          // No gap on the card itself: the name block and the chevron button
          // sit flush so they read as one continuous surface.
          <div
            className={cn(
              "flex h-12 items-center rounded-md border-[0.5px] border-sidebar-border px-2",
              "transition-colors duration-150",
              isOpen ? "bg-sidebar-active" : "bg-sidebar-subtle"
            )}
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                // The drawer has no narrow state: on a phone the card closes it.
                // Collapsing there only shrank the contents of a 260px drawer.
                if (isDrawer) setMobileMenuOpen(false);
                else setSidebarCollapsed(true);
              }}
              title={isDrawer ? "Cerrar navegación" : "Colapsar barra lateral"}
              // The visible area name is part of the accessible name so the
              // control still matches what a voice user would say out loud
              // (WCAG 2.5.3), with the action appended.
              aria-label={`${activeArea.name}. ${isDrawer ? "Cerrar navegación" : "Colapsar barra lateral"}`}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-sm",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
              )}
            >
              {areaBadge}
              <span
                className={cn(
                  "flex h-8 min-w-0 flex-1 items-center rounded-l-sm px-2",
                  "bg-sidebar-active text-sm font-semibold text-sidebar-foreground"
                )}
              >
                <span className="truncate">{activeArea.name}</span>
              </span>
            </button>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-controls={isOpen ? panelId : undefined}
              aria-label="Cambiar de área"
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-r-sm",
                // The card behind it is already bg-sidebar-active while open, so
                // the hover and open states need a lighter fill to be visible.
                "bg-sidebar-active text-sidebar-muted transition-colors duration-150",
                "hover:bg-sidebar-foreground/20 hover:text-sidebar-foreground",
                "aria-expanded:bg-sidebar-foreground/20 aria-expanded:text-sidebar-foreground",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sidebar-foreground"
              )}
            >
              <ChevronsUpDown className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          // No area yet: the whole card is the prompt. The dashed edge marks it
          // as a slot to fill, not an area someone is already in.
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls={isOpen ? panelId : undefined}
            className={cn(
              "flex h-12 w-full items-center gap-2 rounded-md border border-dashed border-sidebar-muted px-2 text-left",
              "transition-colors duration-150 hover:bg-sidebar-hover",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground",
              isOpen ? "bg-sidebar-active" : "bg-sidebar-subtle"
            )}
          >
            {areaBadge}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-sidebar-foreground">
              Selecciona tu área
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-sidebar-muted" aria-hidden="true" />
          </button>
        )}

        {isOpen && (
          <div
            id={panelId}
            className={cn(
              "absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md",
              "border-[0.5px] border-sidebar-border bg-sidebar shadow-lg"
            )}
          >
            <ul
              ref={(element) => {
                listRef.current = element;
                scroll.attach(element);
              }}
              style={scroll.style}
              aria-label="Áreas"
              // 21rem is seven 48px rows: the list shows at most seven areas
              // and snaps row by row, so the edge never cuts one in half.
              className="max-h-[21rem] snap-y snap-mandatory overflow-y-auto overscroll-contain no-scrollbar"
            >
              {areas.map((area) => (
                <li key={area.id} className="snap-start">
                  <AreaOption area={area} isActive={area.id === activeArea?.id} onSelect={closePanel} />
                </li>
              ))}
            </ul>
            {/* Seven rows show at a time; past that, the faded edge and the chevron say there is more. */}
            <ScrollCue hints={scroll.hints} onScroll={scroll.scrollPage} tone="sidebar" />
          </div>
        )}
      </div>
    </div>
  );
}

function AreaOption({
  area,
  isActive,
  onSelect,
}: {
  area: Area;
  isActive: boolean;
  onSelect: () => void;
}) {
  const Icon = area.icon;

  return (
    <Link
      href={area.path}
      onClick={onSelect}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        // Same 48px height as the card, so the open panel reads as a
        // continuation of it rather than a different kind of list.
        "flex h-12 items-center gap-2 px-2 text-sm transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sidebar-foreground",
        isActive
          ? "bg-sidebar-active text-sidebar-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-hover"
      )}
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-sidebar-active"
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{area.name}</span>
      {isActive && (
        <>
          <Check className="size-4 shrink-0" aria-hidden="true" />
          <span className="sr-only">(área actual)</span>
        </>
      )}
    </Link>
  );
}
