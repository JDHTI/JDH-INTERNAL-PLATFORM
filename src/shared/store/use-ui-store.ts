import { create } from "zustand";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "jdh-theme";

interface UiState {
  theme: ThemeMode;
  isSidebarCollapsed: boolean;
  isMobileMenuOpen: boolean;

  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
}

/**
 * Applies the `.dark` class and `color-scheme` to <html>. Safe during SSR.
 * `color-scheme` is what makes native controls (scrollbars, date pickers)
 * follow the theme instead of staying light on a dark page.
 */
function applyThemeToDom(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

function persistTheme(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Private mode or blocked storage: the theme still applies for this session.
  }
}

/**
 * Reads the theme the inline script in the root layout already resolved and
 * wrote to <html>, so the store starts in sync instead of flashing to light.
 */
function readInitialTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export const useUiStore = create<UiState>()((set, get) => ({
  theme: readInitialTheme(),
  isSidebarCollapsed: false,
  isMobileMenuOpen: false,

  setTheme: (mode) => {
    applyThemeToDom(mode);
    persistTheme(mode);
    set({ theme: mode });
  },

  toggleTheme: () => {
    const next: ThemeMode = get().theme === "light" ? "dark" : "light";
    applyThemeToDom(next);
    persistTheme(next);
    set({ theme: next });
  },

  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
}));
