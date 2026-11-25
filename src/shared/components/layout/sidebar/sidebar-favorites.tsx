"use client";

import { moduleHref } from "@/shared/config/areas.config";
import type { FavoriteModule } from "@/shared/hooks/use-favorites";

import SidebarRow from "./sidebar-row";

/**
 * The pinned modules, at the top of the menu, in the order they were pinned. A module of another
 * area says which one. With nothing pinned the section does not exist: no title, no gap. The rows
 * are shortcuts, so the current page stays marked in its own group, not here as well.
 */
export default function SidebarFavorites({
  favorites,
  activeAreaSlug,
  isCollapsed,
  onNavigate,
}: {
  favorites: FavoriteModule[];
  activeAreaSlug: string | undefined;
  isCollapsed: boolean;
  onNavigate: () => void;
}) {
  if (favorites.length === 0) return null;
  return (
    <div className="space-y-1">
      {!isCollapsed && (
        <h2 className="px-2 text-[11px] font-semibold tracking-wider text-sidebar-muted uppercase select-none">Favoritos</h2>
      )}
      <ul className="space-y-0.5" aria-label={isCollapsed ? "Favoritos" : undefined}>
        {favorites.map(({ ref, area, module }) => (
          <li key={`${ref.area}/${ref.segment}`}>
            <SidebarRow
              href={moduleHref(module)}
              label={area.slug === activeAreaSlug ? module.name : `${module.name} · ${area.name}`}
              icon={module.icon}
              isActive={false}
              isCollapsed={isCollapsed}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
