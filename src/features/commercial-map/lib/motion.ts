export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * How long a camera move takes. The move shows where the map went; whoever
 * asked for no motion gets the jump (DESIGN.md §6.3).
 */
export function moveDuration(): number {
  return prefersReducedMotion() ? 0 : 450;
}
