"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";

import { useUiStore } from "@/shared/store/use-ui-store";
import { cn } from "@/shared/lib/utils";

interface SidebarSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function SidebarSearch({
  searchQuery,
  setSearchQuery,
}: SidebarSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isSidebarCollapsed, setSidebarCollapsed } = useUiStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSidebarCollapsed(false);
        // The input only exists once the rail has expanded, so focus waits for
        // the state to flush rather than firing at a node that is not there.
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSidebarCollapsed]);

  const expandAndFocus = () => {
    setSidebarCollapsed(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  if (isSidebarCollapsed) {
    return (
      <div className="shrink-0 px-3 py-2">
        <button
          type="button"
          onClick={expandAndFocus}
          className={cn(
            "flex h-9 w-full items-center justify-center rounded-md",
            "border border-sidebar-border text-sidebar-muted",
            "transition-colors duration-150 hover:bg-sidebar-hover hover:text-sidebar-foreground",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground"
          )}
          aria-label="Buscar módulo"
        >
          <Search className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 px-3 py-2">
      <div className="relative flex items-center">
        <Search
          className="pointer-events-none absolute left-2.5 size-4 text-sidebar-muted"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Buscar módulo"
          aria-label="Buscar módulo"
          className={cn(
            "h-9 w-full rounded-md border border-sidebar-border bg-transparent",
            "pr-12 pl-8 text-sm text-sidebar-foreground placeholder:text-sidebar-muted",
            "transition-colors duration-150 outline-none",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-foreground",
            "[&::-webkit-search-cancel-button]:appearance-none"
          )}
        />
        <kbd
          className="pointer-events-none absolute right-2 hidden select-none rounded border border-sidebar-border px-1 py-0.5 text-[10px] font-medium text-sidebar-muted sm:block"
          aria-hidden="true"
        >
          Ctrl K
        </kbd>
      </div>
    </div>
  );
}
