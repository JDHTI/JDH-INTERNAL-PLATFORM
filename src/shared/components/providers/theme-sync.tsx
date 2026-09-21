"use client";

import { useEffect } from "react";

import { useUiStore } from "@/shared/store/use-ui-store";

/**
 * Pulls the store in line with the theme the inline script applied to <html>.
 *
 * This has to happen in an effect rather than in the store initializer: the
 * initializer runs during render on both server and client, and reading the
 * DOM there makes the client render disagree with the server HTML, which is a
 * hydration mismatch. After mount the trees already match, so a state change
 * here is an ordinary re-render.
 */
export default function ThemeSync() {
  const hydrateTheme = useUiStore((state) => state.hydrateTheme);

  useEffect(() => {
    hydrateTheme();
  }, [hydrateTheme]);

  return null;
}
