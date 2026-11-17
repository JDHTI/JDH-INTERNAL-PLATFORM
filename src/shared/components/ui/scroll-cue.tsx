"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import type { ScrollHints } from "@/shared/hooks/use-scroll-hints";
import { cn } from "@/shared/lib/utils";

/**
 * The small chevrons on the edge of a list that hides its scrollbar, shown
 * only on the side that has more. A pointer can click one to move a page;
 * keyboard and screen-reader users already move through the rows themselves,
 * so the chevrons stay out of the tab order and the accessibility tree.
 * Place it inside a `relative` box that wraps the scrolling list.
 */
export function ScrollCue({
  hints,
  onScroll,
  tone = "surface",
}: {
  hints: ScrollHints;
  onScroll: (direction: 1 | -1) => void;
  /** The sidebar's dark surface or the page's. */
  tone?: "surface" | "sidebar";
}) {
  const look = cn(
    "pointer-events-auto absolute left-1/2 z-10 flex size-5 -translate-x-1/2 items-center justify-center rounded-full border",
    tone === "sidebar"
      ? "border-sidebar-border bg-sidebar text-sidebar-muted hover:text-sidebar-foreground"
      : "border-border bg-surface-raised text-text-secondary hover:text-text-primary"
  );
  return (
    <>
      {hints.above && (
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => onScroll(-1)} className={cn(look, "top-1")}>
          <ChevronUp className="size-3.5" />
        </button>
      )}
      {hints.below && (
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => onScroll(1)} className={cn(look, "bottom-1")}>
          <ChevronDown className="size-3.5" />
        </button>
      )}
    </>
  );
}
