import { create } from "zustand";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "jdh-theme";

interface UiState {
  theme: ThemeMode;
  isSidebarCollapsed: boolean;
  isMobileMenuOpen: boolean;

  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  /**
   * Adopts the theme the inline script already applied to <html>, without
   * writing it back to storage. Runs once after mount, so a first-time
   * visitor keeps following their OS preference instead of having it frozen
   * into localStorage by the act of loading the page.
   */
  hydrateTheme: () => void;
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

export const useUiStore = create<UiState>()((set, get) => ({
  // Must be a constant, not a read of <html>. The store initializer runs on
  // both sides: the server has no document and resolves "light", while the
  // client reads the class the inline script already wrote and can resolve
  // "dark". React then hydrates a tree that disagrees with the server HTML.
  // ThemeSync reconciles this after mount instead.
  theme: "light",
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

  hydrateTheme: () => {
    if (typeof document === "undefined") return;
    const mode: ThemeMode = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    if (mode !== get().theme) set({ theme: mode });
  },

  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
}));
