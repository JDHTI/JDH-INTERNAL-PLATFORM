import { create } from "zustand";

export type ThemeMode = "light" | "dark";
/** "system" means no stored choice: the inline script follows the OS. */
export type ThemePreference = ThemeMode | "system";

const THEME_STORAGE_KEY = "jdh-theme";

function systemMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

interface UiState {
  theme: ThemeMode;
  themePreference: ThemePreference;
  /** "system" forgets the stored choice and follows the OS again. */
  setThemePreference: (preference: ThemePreference) => void;
  isSidebarCollapsed: boolean;
  isMobileMenuOpen: boolean;
  /** The sidebar's area list; the workspace guide opens it too. */
  isAreaPickerOpen: boolean;

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
  setAreaPickerOpen: (open: boolean) => void;
  /** Shows the area list from anywhere: expands the rail and, on a phone, opens the drawer. */
  openAreaPicker: () => void;
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
  themePreference: "system",
  isSidebarCollapsed: false,
  isMobileMenuOpen: false,
  isAreaPickerOpen: false,

  setTheme: (mode) => {
    applyThemeToDom(mode);
    persistTheme(mode);
    set({ theme: mode, themePreference: mode });
  },

  setThemePreference: (preference) => {
    if (preference !== "system") {
      get().setTheme(preference);
      return;
    }
    try {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // Blocked storage: the OS mode still applies for this session.
    }
    const mode = systemMode();
    applyThemeToDom(mode);
    set({ theme: mode, themePreference: "system" });
  },

  toggleTheme: () => {
    const next: ThemeMode = get().theme === "light" ? "dark" : "light";
    get().setTheme(next);
  },

  hydrateTheme: () => {
    if (typeof document === "undefined") return;
    const mode: ThemeMode = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    set({ theme: mode, themePreference: readPreference() });
  },

  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),

  setAreaPickerOpen: (open) => set({ isAreaPickerOpen: open }),

  openAreaPicker: () =>
    set({ isAreaPickerOpen: true, isSidebarCollapsed: false, isMobileMenuOpen: true }),
}));
