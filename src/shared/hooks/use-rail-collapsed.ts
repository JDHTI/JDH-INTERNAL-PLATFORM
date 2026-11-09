"use client";

import { useSyncExternalStore } from "react";

import { useUiStore } from "@/shared/store/use-ui-store";

/** Below `md` the sidebar is a drawer (sidebar.tsx), not the rail. */
const DRAWER_QUERY = "(max-width: 767.98px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DRAWER_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Whether the sidebar is the mobile drawer right now; false on the server. */
export function useIsDrawer(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DRAWER_QUERY).matches,
    () => false
  );
}

/**
 * Whether the sidebar's contents render collapsed (icons only). Collapsing is
 * the desktop rail's preference: the mobile drawer is always 260px wide, so
 * inside it the contents always render expanded. Otherwise a rail collapsed on
 * a desktop opened on a phone showed icon-only rows in a full-width drawer.
 */
export function useRailCollapsed(): boolean {
  const collapsed = useUiStore((state) => state.isSidebarCollapsed);
  const drawer = useIsDrawer();
  return collapsed && !drawer;
}
