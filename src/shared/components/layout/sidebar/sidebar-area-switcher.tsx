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
 */
export default function SidebarAreaSwitcher() {
  const pathname = usePathname();
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
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
      // Returning focus to the trigger keeps keyboard users where they were,
      // instead of dropping focus back to the top of the document.
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleTriggerClick = () => {
    // On the 64px rail there is no room for the panel, so the first press
    // expands the sidebar and the second opens the list.
    if (isSidebarCollapsed) {
      setSidebarCollapsed(false);
      return;
    }
    setIsOpen((open) => !open);
  };

  const ActiveIcon = activeArea.icon;

  return (
    <div
      ref={containerRef}
      className="relative shrink-0 border-b border-sidebar-border p-3"
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        aria-expanded={isSidebarCollapsed ? undefined : isOpen}
        aria-controls={isOpen ? panelId : undefined}
        aria-label={
          isSidebarCollapsed
            ? `Área actual: ${activeArea.name}. Expandir barra lateral para cambiar`
            : undefined
        }
        title={isSidebarCollapsed ? activeArea.name : undefined}
        className={cn(
          "flex w-full items-center rounded-md border border-sidebar-border",
          "transition-colors duration-150 hover:bg-sidebar-hover",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground",
          isSidebarCollapsed ? "justify-center p-1.5" : "gap-2.5 p-2",
          isOpen && "bg-sidebar-hover"
        )}
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-sidebar-active"
          aria-hidden="true"
        >
          <ActiveIcon className="size-4 text-sidebar-foreground" />
        </span>

        {!isSidebarCollapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[11px] leading-tight text-sidebar-muted">
                Área
              </span>
              <span className="block truncate text-sm font-semibold text-sidebar-foreground">
                {activeArea.name}
              </span>
            </span>
            <ChevronsUpDown
              className="size-4 shrink-0 text-sidebar-muted"
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {isOpen && !isSidebarCollapsed && (
        <div
          id={panelId}
          className={cn(
            "absolute inset-x-3 top-full z-50 mt-1 overflow-hidden rounded-md",
            "border border-sidebar-border bg-sidebar shadow-lg"
          )}
        >
          <p className="border-b border-sidebar-border px-3 py-2 text-[11px] font-medium text-sidebar-muted">
            Áreas asignadas
          </p>
          <ul className="max-h-72 overflow-y-auto py-1">
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
        "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sidebar-foreground",
        isActive
          ? "bg-sidebar-active text-sidebar-foreground"
          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
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
