"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";

import { useActiveArea } from "@/features/areas/hooks/use-areas";
import type { Area } from "@/features/areas/types/area.types";
import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";

const AREA_PAGE_SIZE = 9;

/**
 * Area switcher.
 *
 * The active area comes from the URL, not from stored state: every route
 * belongs to an area, so a deep link or a refresh lands with the right area
 * already selected and there is nothing to keep in sync.
 *
 * The card and the chevron are two sibling buttons with two different jobs:
 * pressing the card collapses the rail, pressing the chevron opens the area
 * list. They are siblings rather than nested because a button inside a button
 * is invalid markup and browsers resolve it unpredictably.
 */
export default function SidebarAreaSwitcher() {
  const { area, areas, isPending } = useActiveArea();

  if (!area) {
    // Same 48px footprint as the card, so the rail does not jump when the
    // areas arrive. With no areas at all the root page explains why.
    return (
      <div className="shrink-0 p-3">
        <div
          className={cn(
            "flex h-12 items-center rounded-md border border-sidebar-border bg-sidebar-subtle px-2",
            isPending && "animate-pulse"
          )}
          aria-busy={isPending}
        >
          {!isPending && (
            <span className="truncate px-2 text-sm text-sidebar-muted">
              Sin áreas asignadas
            </span>
          )}
        </div>
      </div>
    );
  }

  return <AreaSwitcherCard activeArea={area} areas={areas} />;
}

function AreaSwitcherCard({
  activeArea,
  areas,
}: {
  activeArea: Area;
  areas: Area[];
}) {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [areaPage, setAreaPage] = useState(0);

  const { isSidebarCollapsed, setSidebarCollapsed, setMobileMenuOpen } =
    useUiStore();

  const pageCount = Math.max(1, Math.ceil(areas.length / AREA_PAGE_SIZE));
  const activeAreaIndex = areas.findIndex((area) => area.id === activeArea.id);
  const activeAreaPage =
    activeAreaIndex >= 0 ? Math.floor(activeAreaIndex / AREA_PAGE_SIZE) : 0;
  const visiblePage = Math.min(areaPage, pageCount - 1);
  const visibleAreas = areas.slice(
    visiblePage * AREA_PAGE_SIZE,
    (visiblePage + 1) * AREA_PAGE_SIZE
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      // Returning focus to the chevron keeps keyboard users where they were,
      // instead of dropping focus back to the top of the document.
      chevronRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const ActiveIcon = activeArea.icon;

  const areaBadge = (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-sidebar-active"
      aria-hidden="true"
    >
      <ActiveIcon className="size-4 text-sidebar-foreground" />
    </span>
  );

  if (isSidebarCollapsed) {
    return (
      <div className="shrink-0 p-3">
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          title={activeArea.name}
          aria-label={`${activeArea.name}. Expandir barra lateral`}
          className={cn(
            // Square, not the card's 48x40: the rail is sized so the frame
            // around the 32px badge is 8px on every side rather than 8px
            // vertically and 4px horizontally.
            "flex size-12 items-center justify-center rounded-md",
            "border border-sidebar-border bg-sidebar-subtle transition-colors duration-150",
            "hover:bg-sidebar-hover",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
          )}
        >
          {areaBadge}
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 p-3">
      <div ref={containerRef} className="relative">
        {/* No gap on the card itself: the name block and the chevron button
            sit flush so they read as one continuous surface, with the gap
            applied inside the collapse button instead. */}
        <div
          className={cn(
            "flex h-12 items-center rounded-md border border-sidebar-border px-2",
            "transition-colors duration-150",
            isOpen ? "bg-sidebar-hover" : "bg-sidebar-subtle"
          )}
        >
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setSidebarCollapsed(true);
            }}
            title="Colapsar barra lateral"
            // The visible area name is part of the accessible name so the
            // control still matches what a voice user would say out loud
            // (WCAG 2.5.3), with the action appended.
            aria-label={`${activeArea.name}. Colapsar barra lateral`}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-sm",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
            )}
          >
            {areaBadge}
            <span
              className={cn(
                "flex h-8 min-w-0 flex-1 items-center rounded-l-sm px-2",
                "bg-sidebar-hover text-sm font-semibold text-sidebar-foreground"
              )}
            >
              <span className="truncate">{activeArea.name}</span>
            </span>
          </button>

          <button
            ref={chevronRef}
            type="button"
            onClick={() => {
              setAreaPage(activeAreaPage);
              setIsOpen((open) => !open);
            }}
            aria-expanded={isOpen}
            aria-controls={isOpen ? panelId : undefined}
            aria-label="Cambiar de área"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-r-sm",
              "bg-sidebar-hover text-sidebar-foreground transition-colors duration-150",
              "hover:bg-sidebar-active",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sidebar-foreground"
            )}
          >
            <ChevronsUpDown className="size-4" aria-hidden="true" />
          </button>
        </div>

        {isOpen && (
          <div
            id={panelId}
            className={cn(
              "absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-md",
              "border border-sidebar-border bg-sidebar shadow-lg"
            )}
          >
            <ul
              aria-label={`Áreas, página ${visiblePage + 1} de ${pageCount}`}
              className="max-h-[27rem] overflow-y-auto overscroll-contain no-scrollbar"
            >
              {visibleAreas.map((area) => (
                <li key={area.id}>
                  <AreaOption
                    area={area}
                    isActive={area.id === activeArea.id}
                    onSelect={() => {
                      // Closed here rather than by watching the pathname: the
                      // click is the event, and an effect that reacts to the
                      // route would just be a slower way to say the same thing.
                      setIsOpen(false);
                      setMobileMenuOpen(false);
                    }}
                  />
                </li>
              ))}
            </ul>
            {pageCount > 1 && (
              <nav
                className="flex items-center justify-between border-t border-sidebar-border px-2 py-1.5"
                aria-label="Paginación de áreas"
              >
                <button
                  type="button"
                  onClick={() => setAreaPage((page) => Math.max(0, page - 1))}
                  disabled={visiblePage === 0}
                  aria-label="Áreas anteriores"
                  className={paginationButtonClass}
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </button>
                <span className="text-xs text-sidebar-muted" aria-live="polite">
                  {visiblePage + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setAreaPage((page) => Math.min(pageCount - 1, page + 1))
                  }
                  disabled={visiblePage === pageCount - 1}
                  aria-label="Más áreas"
                  className={paginationButtonClass}
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const paginationButtonClass = cn(
  "flex size-7 items-center justify-center rounded-md text-sidebar-muted transition-colors",
  "hover:bg-sidebar-hover hover:text-sidebar-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground",
  "disabled:pointer-events-none disabled:opacity-40"
);

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
          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
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
