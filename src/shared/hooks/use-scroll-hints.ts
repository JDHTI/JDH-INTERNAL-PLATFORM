"use client";

import { useCallback, useEffect, useState } from "react";

export interface ScrollHints {
  /** Content hidden above the visible part. */
  above: boolean;
  /** Content hidden below the visible part. */
  below: boolean;
}

const FADE = "1.5rem";

/**
 * Tells whether a list that hides its scrollbar has more to show above or
 * below, and returns a mask that fades only those edges: the cue that there
 * is more, without a scrollbar. Re-measured on scroll, on resize and when the
 * rows change. Pass `attach` as the scrolling element's ref.
 */
export function useScrollHints<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [hints, setHints] = useState<ScrollHints>({ above: false, below: false });

  useEffect(() => {
    if (!node) return;
    const update = () => {
      const above = node.scrollTop > 1;
      const below = node.scrollTop + node.clientHeight < node.scrollHeight - 1;
      setHints((current) => (current.above === above && current.below === below ? current : { above, below }));
    };
    update();
    node.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(node);
    const rows = new MutationObserver(update);
    rows.observe(node, { childList: true, subtree: true });
    return () => {
      node.removeEventListener("scroll", update);
      resize.disconnect();
      rows.disconnect();
    };
  }, [node]);

  // A mask is alpha only: "black" means fully shown and never paints, so it is not a design color.
  const top = hints.above ? `transparent 0, black ${FADE}` : "black 0";
  const bottom = hints.below ? `black calc(100% - ${FADE}), transparent 100%` : "black 100%";
  const mask = hints.above || hints.below ? `linear-gradient(to bottom, ${top}, ${bottom})` : undefined;
  const style = mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined;

  /** Moves most of a view in that direction, keeping a row of context. */
  const scrollPage = useCallback(
    (direction: 1 | -1) => node?.scrollBy({ top: direction * node.clientHeight * 0.8, behavior: "smooth" }),
    [node]
  );

  // `attach`, not `ref`: an object with a `ref` reads as a ref to the React compiler's lint.
  return { attach: setNode, hints, style, scrollPage };
}
