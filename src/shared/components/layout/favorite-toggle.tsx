"use client";

import { usePathname } from "next/navigation";
import { Star } from "lucide-react";

import { useActiveArea } from "@/features/areas/hooks/use-areas";
import { useSession } from "@/features/session/hooks/use-session";
import { isPlatformAdmin } from "@/features/session/types/session.types";
import { visibleModules } from "@/shared/config/areas.config";
import { MAX_FAVORITES, favoriteRefOf, useFavorites } from "@/shared/hooks/use-favorites";
import { cn } from "@/shared/lib/utils";

/**
 * Pins the module the person is in to «Favoritos» at the top of the menu, or takes it out. Shown
 * only inside a module they may open; any page under it pins the module itself.
 */
export default function FavoriteToggle() {
  const pathname = usePathname();
  const { area } = useActiveArea();
  const { data: user } = useSession();
  const { isPinned, toggle, isFull, ready } = useFavorites();
  const [, , segment] = pathname.split("/");
  if (!area || !segment || !ready) return null;

  const current = visibleModules(area, isPlatformAdmin(user?.role)).find(
    (item) => item.available && favoriteRefOf(item).segment === segment
  );
  if (!current) return null;

  const ref = favoriteRefOf(current);
  const pinned = isPinned(ref);
  const blocked = !pinned && isFull;
  const label = pinned
    ? `Quitar ${current.name} de favoritos`
    : blocked
      ? `Ya tienes ${MAX_FAVORITES} favoritos: quita uno para fijar ${current.name}`
      : `Fijar ${current.name} en favoritos`;

  return (
    <button
      type="button"
      onClick={() => toggle(ref)}
      disabled={blocked}
      aria-pressed={pinned}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors duration-150 max-md:size-11",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        pinned ? "text-sidebar-foreground" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
      )}
    >
      <Star className={cn("size-4", pinned && "fill-current")} aria-hidden="true" />
    </button>
  );
}
