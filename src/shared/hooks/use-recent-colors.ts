import { useCallback, useSyncExternalStore } from "react";

import { normalizeHex } from "@/shared/lib/color";

const STORAGE_KEY = "jdh-recent-colors";
const MAX_RECENT = 8;
const EMPTY: string[] = [];

/*
 * One store for every picker on the page: saving a color in the table's
 * popover shows it at once in the upload dialog's picker. It is a per-person
 * convenience, so browser storage is enough; when storage is blocked the
 * list simply lives until reload.
 */
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    cache = Array.isArray(parsed)
      ? parsed
          .map((item) => (typeof item === "string" ? normalizeHex(item) : null))
          .filter((item): item is string => item !== null)
          .slice(0, MAX_RECENT)
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab saved a color: drop the cache so the next read sees it.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useRecentColors() {
  const colors = useSyncExternalStore(subscribe, read, () => EMPTY);

  /** Most recent first, no duplicates. Call it when a color is saved, not while picking. */
  const remember = useCallback((color: string) => {
    const hex = normalizeHex(color);
    if (!hex) return;
    cache = [hex, ...read().filter((item) => item !== hex)].slice(0, MAX_RECENT);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
      // Private window or blocked storage: the in-memory list still works.
    }
    notify();
  }, []);

  return { colors, remember };
}
