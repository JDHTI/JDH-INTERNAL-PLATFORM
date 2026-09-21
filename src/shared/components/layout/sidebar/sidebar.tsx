"use client";

import { useEffect } from "react";

import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";
import SidebarAreaSwitcher from "./sidebar-area-switcher";
import SidebarFooter from "./sidebar-footer";
import SidebarMenu from "./sidebar-menu";

export default function Sidebar() {
  const { isSidebarCollapsed, isMobileMenuOpen, setMobileMenuOpen } =
    useUiStore();

  // Escape closes the mobile drawer. Without this the drawer is a trap for
  // anyone not using a pointer.
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen, setMobileMenuOpen]);

  return (
    <>
      <div
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-neutral-900/40 transition-opacity duration-200 md:hidden",
          isMobileMenuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
      />

      <aside
        aria-label="Navegación principal"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-[260px] flex-col",
          "border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
          "transition-[transform,visibility] duration-200 ease-out",
          // `invisible` (not just translate) is what keeps a closed drawer out
          // of the tab order. `md:visible` restores it on desktop, where the
          // rail is static and the drawer state is irrelevant — doing this in
          // CSS avoids tracking the viewport in JS to decide focusability.
          isMobileMenuOpen
            ? "visible translate-x-0"
            : "invisible -translate-x-full",
          "md:visible md:static md:translate-x-0 md:shrink-0 md:transition-[width]",
          // 72px, not 64px: 12px of rail padding plus a 48px square button
          // gives the 32px badge an even 8px frame on all four sides.
          isSidebarCollapsed ? "md:w-[72px]" : "md:w-[260px]"
        )}
      >
        <SidebarAreaSwitcher />
        <SidebarMenu />
        <SidebarFooter />
      </aside>
    </>
  );
}
