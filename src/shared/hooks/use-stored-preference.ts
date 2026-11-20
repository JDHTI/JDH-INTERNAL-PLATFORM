"use client";

import { useCallback, useSyncExternalStore } from "react";

/*
 * A per-person preference kept in this browser's storage (which filters a
 * toolbar shows, whether a panel starts folded). Every component reading the
 * same key sees a change at once, and another tab's change too. With storage
 * blocked (private window, cleared site data) the value lives in memory until
 * reload, so the screen still works with its default.
 */
const listeners = new Map<string, Set<() => void>>();
const cache = new Map<string, { raw: string | null; value: unknown }>();
const memory = new Map<string, string>();

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function notify(key: string) {
  for (const listener of listeners.get(key) ?? []) listener();
}

/**
 * `fallback` and `parse` must be stable (module constants): they are part of the snapshot.
 * `parse` gets the stored JSON and returns null when it is not a valid value.
 */
export function useStoredPreference<T>(key: string, fallback: T, parse: (stored: unknown) => T | null): [T, (next: T) => void] {
  const subscribe = useCallback(
    (listener: () => void) => {
      const set = listeners.get(key) ?? new Set();
      set.add(listener);
      listeners.set(key, set);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        set.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key]
  );

  const read = useCallback((): T => {
    const raw = readRaw(key);
    const hit = cache.get(key);
    if (hit && hit.raw === raw) return hit.value as T;
    let value = fallback;
    if (raw !== null) {
      try {
        value = parse(JSON.parse(raw)) ?? fallback;
      } catch {
        value = fallback;
      }
    }
    cache.set(key, { raw, value });
    return value;
  }, [key, fallback, parse]);

  const value = useSyncExternalStore(subscribe, read, () => fallback);

  const save = useCallback(
    (next: T) => {
      const raw = JSON.stringify(next);
      try {
        localStorage.setItem(key, raw);
        memory.delete(key);
      } catch {
        memory.set(key, raw);
      }
      notify(key);
    },
    [key]
  );

  return [value, save];
}

/** For a panel's folded state: anything but a boolean falls back to the default. */
export const parseBoolean = (stored: unknown): boolean | null => (typeof stored === "boolean" ? stored : null);
