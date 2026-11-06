"use client";

import { useSyncExternalStore } from "react";

/*
 * One shared clock for every relative time on screen. A row's data does not
 * change between two polls, so without it «hace 5 min» would stay at 5 until
 * something else re-rendered the row. It only ticks while somebody listens.
 */
const MINUTE = 60_000;
const listeners = new Set<() => void>();
let now = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, MINUTE);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Milliseconds since the epoch, refreshed once a minute. */
export function useMinuteClock(): number {
  return useSyncExternalStore(subscribe, () => now, () => now);
}
