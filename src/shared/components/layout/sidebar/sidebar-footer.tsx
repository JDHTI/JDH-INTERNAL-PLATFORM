"use client";

import { Moon, Sun } from "lucide-react";

import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";
import SidebarUserCard from "./sidebar-user-card";

/**
 * Theme switch. Both modes are fully styled, so this is a real control, not a
 * decoration: the choice persists to localStorage and the root layout replays
 * it before first paint.
 */
export default function SidebarFooter() {
  const { theme, setTheme, isSidebarCollapsed } = useUiStore();
  const isDark = theme === "dark";

  if (isSidebarCollapsed) {
    return (
      <div className="mt-auto shrink-0 space-y-2 border-t border-sidebar-border p-3">
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

        <SidebarUserCard />
      </div>
    );
  }

  return (
    <div className="mt-auto shrink-0 space-y-2 border-t border-sidebar-border p-3">
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
