"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";

import { useAreas } from "@/features/areas/hooks/use-areas";
import type { Area } from "@/features/areas/types/area.types";
import { useSession } from "@/features/session/hooks/use-session";
import { isPlatformAdmin } from "@/features/session/types/session.types";
import { type ModuleItem, visibleModules } from "@/shared/config/areas.config";

/** A pinned module: its area and its route segment, `/[area]/[segment]`. */
export interface FavoriteRef {
  area: string;
  segment: string;
}

/** A favorite the person may still open, with its area and its row as the menu shows it. */
export interface FavoriteModule {
  ref: FavoriteRef;
  area: Area;
  module: ModuleItem;
}

export const MAX_FAVORITES = 8;

/** Same-tab writes; other tabs hear the `storage` event. */
const CHANGE_EVENT = "jdh-favorites-change";
const storageKey = (userId: string) => `jdh-favorites:${userId}`;

/*
 * Stored in localStorage per user, so two people on one computer keep their own. Every access is
 * guarded: without storage (private window, blocked site data) the menu works, just without favorites.
 */
function readRaw(userId: string | undefined): string {
  if (!userId) return "[]";
  try {
    return window.localStorage.getItem(storageKey(userId)) ?? "[]";
  } catch {
    return "[]";
  }
}

function parse(raw: string): FavoriteRef[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is FavoriteRef => typeof item?.area === "string" && typeof item?.segment === "string")
      .slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

function write(userId: string, favorites: FavoriteRef[]) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(favorites));
  } catch {
    // No storage: nothing to keep.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

const sameRef = (a: FavoriteRef, b: FavoriteRef) => a.area === b.area && a.segment === b.segment;

/** The module's segment in its path: `/bi/cotizador` → `cotizador`. */
export const favoriteRefOf = (module: ModuleItem): FavoriteRef => ({ area: module.areaSlug, segment: module.path.split("/")[2] ?? "" });

/**
 * The person's pinned modules, in the order they were pinned, each resolved against what they may
 * open now. Once the areas are read, a favorite whose module was switched off, unlinked from its
 * area or no longer granted is dropped from storage too, not only hidden.
 */
export function useFavorites() {
  const { data: user } = useSession();
  const userId = user?.id;
  const isAdmin = isPlatformAdmin(user?.role);
  const areasQuery = useAreas();
  const raw = useSyncExternalStore(subscribe, () => readRaw(userId), () => "[]");
  const refs = useMemo(() => parse(raw), [raw]);

  const resolved = useMemo<FavoriteModule[] | null>(() => {
    // Only a successful read of the areas decides what is gone: a failed one keeps everything.
    if (!areasQuery.isSuccess) return null;
    return refs.flatMap((ref) => {
      const area = areasQuery.data.find((candidate) => candidate.slug === ref.area);
      const row = area && visibleModules(area, isAdmin).find((item) => item.available && favoriteRefOf(item).segment === ref.segment);
      return area && row ? [{ ref, area, module: row }] : [];
    });
  }, [areasQuery.isSuccess, areasQuery.data, refs, isAdmin]);

  useEffect(() => {
    if (userId && resolved && resolved.length !== refs.length) write(userId, resolved.map((item) => item.ref));
  }, [userId, resolved, refs.length]);

  const isPinned = (ref: FavoriteRef) => refs.some((item) => sameRef(item, ref));
  const toggle = (ref: FavoriteRef) => {
    if (!userId) return;
    write(userId, isPinned(ref) ? refs.filter((item) => !sameRef(item, ref)) : [...refs, ref].slice(0, MAX_FAVORITES));
  };

  return {
    favorites: resolved ?? [],
    isPinned,
    toggle,
    isFull: refs.length >= MAX_FAVORITES,
    /** No signed-in user yet: nothing can be pinned. */
    ready: Boolean(userId),
  };
}
