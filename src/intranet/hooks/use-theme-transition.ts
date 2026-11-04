"use client"

import * as React from "react"
import { flushSync } from "react-dom"
import { useReducedMotion } from "motion/react"

import { useUiStore, type ThemePreference } from "@/shared/store/use-ui-store"

/** Mirrors --ease-standard / --duration tokens in globals.css. */
const EASE = "cubic-bezier(0.2, 0, 0, 1)"
const DURATION = 500

/**
 * `setTheme` wrapped in a circular View Transition that expands from `origin`
 * (the element that triggered the change) until it covers the viewport.
 *
 * Uses the native same-document View Transitions API, not Next's experimental
 * `viewTransition` flag — that one drives React route transitions, while this
 * is a plain DOM change (the UI store toggling the `.dark` class). `flushSync`
 * forces that class swap to happen *inside* the transition callback so the API
 * can snapshot before/after.
 *
 * Falls back to a plain `setTheme` when: the API is missing (older browsers —
 * same-document transitions are Baseline since Firefox 144), reduced motion is
 * on, there is no origin element, or the *resolved* theme wouldn't visually
 * change (e.g. "light" → "system" while the OS is already light).
 */
export function useThemeTransition() {
  const theme = useUiStore((state) => state.themePreference)
  const resolvedTheme = useUiStore((state) => state.theme)
  const setPreference = useUiStore((state) => state.setThemePreference)
  const reduce = useReducedMotion()

  const setThemeWithTransition = React.useCallback(
    (value: string, origin?: Element | null) => {
      const next: ThemePreference = value === "dark" || value === "light" ? value : "system"
      const setTheme = (preference: ThemePreference) => setPreference(preference)
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      const nextResolved = next === "system" ? systemTheme : next

      if (
        reduce ||
        !origin ||
        !nextResolved ||
        nextResolved === resolvedTheme ||
        typeof document.startViewTransition !== "function"
      ) {
        setTheme(next)
        return
      }

      const rect = origin.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )

      const transition = document.startViewTransition(() => {
        flushSync(() => setTheme(next))
      })

      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: DURATION,
              easing: EASE,
              pseudoElement: "::view-transition-new(root)",
            }
          )
        })
        .catch(() => {
          // `ready` rejects if the transition is skipped (rapid re-toggles):
          // the theme is applied either way, only the animation is dropped.
        })
    },
    [reduce, resolvedTheme, setPreference]
  )

  return { theme, setThemeWithTransition }
}
