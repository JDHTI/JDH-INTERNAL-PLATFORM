"use client";

import { createPortal } from "react-dom";

/**
 * Where a view puts what it opens about a point of the map: a prospect's card,
 * a form. With room, it docks at the top left of the map and never taller than
 * it, so nothing is cut and nothing jumps when the map moves. Without room (a
 * phone, a narrow map) it stays in the panel, in the flow of the page.
 */
export default function MapDock({
  overlay,
  docked,
  children,
}: {
  overlay: HTMLElement | null;
  docked: boolean;
  children: React.ReactNode;
}) {
  if (!children) return null;
  if (docked && overlay) {
    return createPortal(<div className="pointer-events-auto flex max-h-full min-h-0 w-80">{children}</div>, overlay);
  }
  return <div>{children}</div>;
}
