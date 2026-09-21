"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  MODULES,
  MODULE_CATEGORIES,
  type ModuleItem,
} from "@/shared/config/modules.config";
import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";

interface SidebarMenuProps {
  searchQuery: string;
}

export default function SidebarMenu({ searchQuery }: SidebarMenuProps) {
  const pathname = usePathname();
  const { isSidebarCollapsed, setMobileMenuOpen } = useUiStore();

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matches = MODULES.filter((module) =>
    module.name.toLowerCase().includes(normalizedQuery)
  );

  const grouped = MODULE_CATEGORIES.map((category) => ({
    category,
    modules: matches.filter((module) => module.category === category),
  })).filter((group) => group.modules.length > 0);

  // Empty state names the cause and the way out, rather than just "no results".
  if (grouped.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-4">
        <p className="text-xs text-sidebar-muted">
          Ningún módulo coincide con{" "}
          <span className="font-medium text-sidebar-foreground">
            “{searchQuery.trim()}”
          </span>
          . Borra la búsqueda para ver los {MODULES.length} módulos.
        </p>
      </div>
    );
  }

  return (
    <nav
      aria-label="Módulos"
      className="flex-1 space-y-4 overflow-y-auto no-scrollbar px-3 py-2"
    >
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
      ))}
    </nav>
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

  const base = cn(
    "flex items-center rounded-md text-sm font-medium transition-colors duration-150",
    isCollapsed ? "h-9 w-full justify-center" : "h-9 gap-2.5 px-2"
  );

  // A module with no route is rendered as a labelled, non-focusable row.
  // Shipping it as a link would send the user to a 404.
  if (!module.available) {
    return (
      <div
        className={cn(base, "cursor-not-allowed text-sidebar-muted opacity-60")}
        title={isCollapsed ? `${module.name} · Próximamente` : undefined}
      >
        <Icon className="size-4 shrink-0" aria-hidden="true" />
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
    <Link
      href={module.path}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      title={isCollapsed ? module.name : undefined}
      className={cn(
        base,
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground",
        isActive
          ? "bg-sidebar-active text-sidebar-foreground"
          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {!isCollapsed && <span className="truncate">{module.name}</span>}
    </Link>
  );
}
