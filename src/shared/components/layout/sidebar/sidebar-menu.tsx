"use client";

import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";

import {
  DEFAULT_AREA,
  MODULE_CATEGORIES,
  findAreaByPathname,
  getModulesByArea,
} from "@/shared/config/areas.config";
import { useUiStore } from "@/shared/store/use-ui-store";
import SidebarRow from "./sidebar-row";

export default function SidebarMenu() {
  const pathname = usePathname();
  const { isSidebarCollapsed, setMobileMenuOpen } = useUiStore();

  const activeArea = findAreaByPathname(pathname) ?? DEFAULT_AREA;
  const areaModules = getModulesByArea(activeArea.id);

  const grouped = MODULE_CATEGORIES.map((category) => ({
    category,
    modules: areaModules.filter((module) => module.category === category),
  })).filter((group) => group.modules.length > 0);

  const closeDrawer = () => setMobileMenuOpen(false);

  return (
    <nav
      aria-label={`Módulos de ${activeArea.name}`}
      className="flex-1 space-y-4 overflow-y-auto no-scrollbar px-3 py-2"
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

      {grouped.length === 0 ? (
        <p className="px-2 text-xs text-sidebar-muted">
          {activeArea.name} todavía no tiene módulos declarados.
        </p>
      ) : (
        grouped.map(({ category, modules }) => (
          <div key={category} className="space-y-1">
            {!isSidebarCollapsed && (
              <h2 className="px-2 text-[11px] font-semibold tracking-wider text-sidebar-muted uppercase select-none">
                {category}
              </h2>
            )}

            <ul className="space-y-0.5">
              {modules.map((module) => (
                <li key={module.id}>
                  <SidebarRow
                    href={module.path}
                    label={module.name}
                    icon={module.icon}
                    isActive={pathname === module.path}
                    isCollapsed={isSidebarCollapsed}
                    available={module.available}
                    onNavigate={closeDrawer}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </nav>
  );
}
