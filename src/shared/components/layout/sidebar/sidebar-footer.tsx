"use client";

import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";

import { UTILITY_LINKS } from "@/shared/config/areas.config";
import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";
import SidebarRow from "./sidebar-row";
import SidebarUserCard from "./sidebar-user-card";

export default function SidebarFooter() {
  const pathname = usePathname();
  const { theme, setTheme, isSidebarCollapsed, setMobileMenuOpen } =
    useUiStore();
  const isDark = theme === "dark";

  return (
    <div className="mt-auto shrink-0 space-y-2 border-t border-sidebar-border p-3">
      {/* Platform-wide destinations: they stay put as the user moves between
          areas, so they sit outside the area module list. */}
      <ul className="space-y-0.5">
        {UTILITY_LINKS.map((link) => (
          <li key={link.id}>
            <SidebarRow
              href={link.path}
              label={link.name}
              icon={link.icon}
              isActive={pathname === link.path}
              isCollapsed={isSidebarCollapsed}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </li>
        ))}
      </ul>

      {isSidebarCollapsed ? (
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className={cn(
            "flex h-9 w-full items-center justify-center rounded-md",
            "border border-sidebar-border text-sidebar-muted",
            "transition-colors duration-150 hover:bg-sidebar-hover hover:text-sidebar-foreground",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
          )}
          aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      ) : (
        <div
          role="radiogroup"
          aria-label="Tema de la interfaz"
          className="flex items-center gap-1 rounded-md border border-sidebar-border p-1"
        >
          <ThemeOption
            label="Claro"
            icon={<Sun className="size-3.5" aria-hidden="true" />}
            isSelected={!isDark}
            onSelect={() => setTheme("light")}
          />
          <ThemeOption
            label="Oscuro"
            icon={<Moon className="size-3.5" aria-hidden="true" />}
            isSelected={isDark}
            onSelect={() => setTheme("dark")}
          />
        </div>
      )}

      <SidebarUserCard />
    </div>
  );
}

function ThemeOption({
  label,
  icon,
  isSelected,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-sm py-1 text-xs font-medium",
        "transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground",
        isSelected
          ? "bg-sidebar-active text-sidebar-foreground"
          : "text-sidebar-muted hover:text-sidebar-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
