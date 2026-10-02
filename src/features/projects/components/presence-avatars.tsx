import { getInitials } from "@/features/session/types/session.types";
import { cn } from "@/shared/lib/utils";

import type { PresentPerson } from "../hooks/use-projects-live";

/**
 * Who else is looking at this folder or project, as initials. Monochrome on
 * purpose: a color per person would be a second palette competing with the
 * project colors, and the name is in the tooltip and the accessible label.
 */
export default function PresenceAvatars({
  people,
  max = 3,
  label,
  size = "sm",
  className,
}: {
  people: PresentPerson[];
  max?: number;
  /** What the list is about, for screen readers ("viendo esta carpeta"). */
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  const hidden = people.length - shown.length;
  const names = people.map((person) => person.name).join(", ");

  const bubble = cn(
    "flex shrink-0 items-center justify-center rounded-full bg-canvas-subtle font-medium text-text-primary ring-2 ring-surface",
    size === "sm" ? "size-6 text-[11px]" : "size-7 text-xs"
  );

  return (
    <span
      role="img"
      aria-label={`${names}: ${label}`}
      title={`${names}: ${label}`}
      className={cn("flex shrink-0 items-center -space-x-1.5", className)}
    >
      {shown.map((person) => (
        <span key={person.userId} aria-hidden="true" className={bubble}>
          {getInitials(person.name)}
        </span>
      ))}
      {hidden > 0 && (
        <span aria-hidden="true" className={cn(bubble, "tabular")}>
          +{hidden}
        </span>
      )}
    </span>
  );
}
