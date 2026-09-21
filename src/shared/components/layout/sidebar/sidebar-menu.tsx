"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid } from "lucide-react";

import {
  DEFAULT_AREA,
  MODULE_CATEGORIES,
  findAreaByPathname,
  getModulesByArea,
  type ModuleItem,
} from "@/shared/config/areas.config";
import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";

interface SidebarMenuProps {
  searchQuery: string;
}

export default function SidebarMenu({ searchQuery }: SidebarMenuProps) {
  const pathname = usePathname();
  const { isSidebarCollapsed, setMobileMenuOpen } = useUiStore();

  const activeArea = findAreaByPathname(pathname) ?? DEFAULT_AREA;
  const areaModules = getModulesByArea(activeArea.id);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matches = areaModules.filter((module) =>
    module.name.toLowerCase().includes(normalizedQuery)
  );

  const grouped = MODULE_CATEGORIES.map((category) => ({
    category,
    modules: matches.filter((module) => module.category === category),
  })).filter((group) => group.modules.length > 0);

  return (
    <nav
      aria-label={`Módulos de ${activeArea.name}`}
      className="flex-1 space-y-4 overflow-y-auto no-scrollbar px-3 py-2"
    >
      {/* The area overview is always the first stop, above the module groups. */}
      <ul className="space-y-0.5">
        <li>
          <NavRow
            href={activeArea.path}
            label="Resumen del área"
            icon={<LayoutGrid className="size-4 shrink-0" aria-hidden="true" />}
            isActive={pathname === activeArea.path}
            isCollapsed={isSidebarCollapsed}
            onNavigate={() => setMobileMenuOpen(false)}
          />
        </li>
      </ul>

      {grouped.length === 0 ? (
        <p className="px-2 text-xs text-sidebar-muted">
          {normalizedQuery
            ? `Ningún módulo de ${activeArea.name} coincide con “${searchQuery.trim()}”. Borra la búsqueda para ver los ${areaModules.length}.`
            : `${activeArea.name} todavía no tiene módulos declarados.`}
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
                  <ModuleRow
                    module={module}
                    isActive={pathname === module.path}
                    isCollapsed={isSidebarCollapsed}
                    onNavigate={() => setMobileMenuOpen(false)}
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

const rowBase =
  "flex h-9 items-center rounded-md text-sm font-medium transition-colors duration-150";

function NavRow({
  href,
  label,
  icon,
  isActive,
  isCollapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  isCollapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      title={isCollapsed ? label : undefined}
      className={cn(
        rowBase,
        isCollapsed ? "w-full justify-center" : "gap-2.5 px-2",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground",
        isActive
          ? "bg-sidebar-active text-sidebar-foreground"
          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
      )}
    >
      {icon}
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function ModuleRow({
  module,
  isActive,
  isCollapsed,
  onNavigate,
}: {
  module: ModuleItem;
  isActive: boolean;
  isCollapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = module.icon;
  const icon = <Icon className="size-4 shrink-0" aria-hidden="true" />;

  // A module with no route is rendered as a labelled, non-focusable row.
  // Shipping it as a link would send the user to a 404.
  if (!module.available) {
    return (
      <div
        className={cn(
          rowBase,
          isCollapsed ? "w-full justify-center" : "gap-2.5 px-2",
          "cursor-not-allowed text-sidebar-muted opacity-60"
        )}
        title={isCollapsed ? `${module.name} · Próximamente` : undefined}
      >
        {icon}
        {!isCollapsed && (
          <>
            <span className="min-w-0 flex-1 truncate">{module.name}</span>
            <span className="shrink-0 rounded-sm border border-sidebar-border px-1.5 py-0.5 text-[10px] font-medium">
              Próximamente
            </span>
          </>
        )}
        <span className="sr-only">{module.name}: próximamente</span>
      </div>
    );
  }

  return (
    <NavRow
      href={module.path}
      label={module.name}
      icon={icon}
      isActive={isActive}
      isCollapsed={isCollapsed}
      onNavigate={onNavigate}
    />
  );
}
