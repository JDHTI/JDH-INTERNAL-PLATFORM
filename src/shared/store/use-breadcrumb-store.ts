"use client";

import { useEffect } from "react";
import { create } from "zustand";

/*
 * Labels for URL segments the static catalog cannot name: a record's id
 * (/calidad/pqrsf/<uuid> reads as its consecutive) or a sub-page. The page
 * that knows the name registers it; the header trail reads it.
 */

interface BreadcrumbState {
  labels: Record<string, string>;
  setLabel: (href: string, label: string) => void;
  clearLabel: (href: string) => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>()((set) => ({
  labels: {},
  setLabel: (href, label) =>
    set((state) =>
      state.labels[href] === label ? state : { labels: { ...state.labels, [href]: label } }
    ),
  clearLabel: (href) =>
    set((state) => {
      if (!(href in state.labels)) return state;
      const labels = { ...state.labels };
      delete labels[href];
      return { labels };
    }),
}));

/** Names `href` in the header trail while the calling component is mounted. */
export function useBreadcrumbLabel(href: string, label: string | undefined) {
  const setLabel = useBreadcrumbStore((state) => state.setLabel);
  const clearLabel = useBreadcrumbStore((state) => state.clearLabel);
  useEffect(() => {
    if (!label) return;
    setLabel(href, label);
    return () => clearLabel(href);
  }, [href, label, setLabel, clearLabel]);
}
