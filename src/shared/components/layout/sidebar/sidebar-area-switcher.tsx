"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  DEFAULT_AREA,
  findAreaByPathname,
  type Area,
} from "@/shared/config/areas.config";
import {
  PLACEHOLDER_USER,
  getAccessibleAreas,
} from "@/shared/config/session.mock";
import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";

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
  const pathname = usePathname();
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { isSidebarCollapsed, setSidebarCollapsed, setMobileMenuOpen } =
    useUiStore();

  const activeArea = findAreaByPathname(pathname) ?? DEFAULT_AREA;
  const areas = getAccessibleAreas(PLACEHOLDER_USER);

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
            "bg-sidebar-subtle transition-colors duration-150",
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
            "flex h-12 items-center rounded-md px-2 transition-colors duration-150",
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
            onClick={() => setIsOpen((open) => !open)}
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
              "absolute inset-x-0 top-full z-50 mt-0.5 overflow-hidden rounded-md",
              "border border-sidebar-border bg-sidebar shadow-lg"
            )}
          >
            <ul className="max-h-80 overflow-y-auto">
              {areas.map((area) => (
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
