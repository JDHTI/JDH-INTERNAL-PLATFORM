"use client";

import { usePathname } from "next/navigation";
import { ArrowUp, LayoutGrid } from "lucide-react";

import { useActiveArea } from "@/features/areas/hooks/use-areas";
import { useSession } from "@/features/session/hooks/use-session";
import { isPlatformAdmin } from "@/features/session/types/session.types";
import {
  MODULE_CATEGORIES,
  activeModuleId,
  moduleHref,
  visibleModules,
} from "@/shared/config/areas.config";
import { ScrollCue } from "@/shared/components/ui/scroll-cue";
import { useRailCollapsed } from "@/shared/hooks/use-rail-collapsed";
import { useScrollHints } from "@/shared/hooks/use-scroll-hints";
import { cn } from "@/shared/lib/utils";
import { useUiStore } from "@/shared/store/use-ui-store";
import SidebarModuleGroup from "./sidebar-module-group";
import SidebarRow from "./sidebar-row";

export default function SidebarMenu() {
  const pathname = usePathname();
  const setMobileMenuOpen = useUiStore((state) => state.setMobileMenuOpen);
  const openModuleFromRail = useUiStore((state) => state.openModuleFromRail);
  const isSidebarCollapsed = useRailCollapsed();
  const { area: activeArea, areas, isPending } = useActiveArea();
  const { data: user } = useSession();
  const isAdmin = isPlatformAdmin(user?.role);
  const { attach, hints, style, scrollPage } = useScrollHints<HTMLElement>();

  // No area in the URL (the guide): say where the modules will appear.
  if (!activeArea) {
    return (
      <div className="flex-1 space-y-2 px-3 py-2" aria-busy={isPending}>
        {isPending
          ? [0, 1, 2].map((row) => (
              <div key={row} className="h-9 animate-pulse rounded-md bg-sidebar-subtle" />
            ))
          : areas.length > 0 &&
            !isSidebarCollapsed && (
              <p className="flex gap-2 rounded-md border border-dashed border-sidebar-border px-2 py-3 text-[13px] leading-snug text-sidebar-muted">
                <ArrowUp className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                Elige un área arriba y aquí aparecen sus módulos, agrupados por tipo de trabajo.
              </p>
            )}
      </div>
    );
  }

  // Only what the person's role grants: a row they cannot open is not a row.
  const areaModules = visibleModules(activeArea, isAdmin);
  // Any page under a module keeps its row selected, not only the module's own screen.
  const currentModuleId = activeModuleId(areaModules, pathname);

  const grouped = MODULE_CATEGORIES.map((category) => ({
    category,
    modules: areaModules.filter((module) => module.category === category),
  })).filter((group) => group.modules.length > 0);

  const closeDrawer = () => setMobileMenuOpen(false);

  return (
    // The list hides its scrollbar; the faded edge and the chevron say there is more.
    <div className="relative flex min-h-0 flex-1 flex-col">
    <nav
      ref={attach}
      style={style}
      aria-label={`Módulos de ${activeArea.name}`}
      className="min-h-0 flex-1 space-y-4 overflow-y-auto no-scrollbar px-3 py-2"
    >
      {/* The area overview is always the first stop, above the module groups. */}
      <ul className="space-y-0.5">
        <li>
          <SidebarRow
            href={activeArea.path}
            label="Resumen del área"
            icon={LayoutGrid}
            isActive={pathname === activeArea.path}
            isCollapsed={isSidebarCollapsed}
            onNavigate={closeDrawer}
          />
        </li>
      </ul>

      {grouped.map(({ category, modules }) => (
          <div key={category} className="space-y-1">
            {!isSidebarCollapsed && (
              <h2 className="px-2 text-[11px] font-semibold tracking-wider text-sidebar-muted uppercase select-none">
                {category}
              </h2>
            )}

            <ul className="space-y-0.5">
              {modules.map((module) => (
                <li key={module.id}>
                  {module.subItems && module.available && !isSidebarCollapsed ? (
                    <SidebarModuleGroup module={module} onNavigate={closeDrawer} />
                  ) : module.subItems && module.available && module.hasPage === false ? (
                    // Collapsed, a module with no screen of its own does not navigate: the rail
                    // expands and its pages open, as a click on its row would do expanded.
                    <button
                      type="button"
                      onClick={() => openModuleFromRail(module.id)}
                      title={module.name}
                      aria-label={`${module.name}: abrir sus páginas`}
                      className={cn(
                        "flex h-9 w-full items-center justify-center rounded-md text-sm font-medium transition-colors duration-150",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground",
                        module.id === currentModuleId
                          ? "bg-sidebar-active text-sidebar-foreground"
                          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
                      )}
                    >
                      <module.icon className="size-4 shrink-0" aria-hidden="true" />
                    </button>
                  ) : (
                    <SidebarRow
                      href={moduleHref(module)}
                      label={module.name}
                      icon={module.icon}
                      isActive={module.id === currentModuleId}
                      isCollapsed={isSidebarCollapsed}
                      available={module.available}
                      onNavigate={closeDrawer}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </nav>
    <ScrollCue hints={hints} onScroll={scrollPage} tone="sidebar" />
    </div>
  );
}
