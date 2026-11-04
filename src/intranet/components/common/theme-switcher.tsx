"use client"

import * as React from "react"
import { Monitor, Moon, Sun } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/intranet/components/ui/dropdown-menu"
import { useThemeTransition } from "@/intranet/hooks/use-theme-transition"
import { cn } from "@/intranet/lib/utils"

import { jdhButtonVariants } from "./jdh-button"

/**
 * Theme switcher (Claro / Oscuro / Sistema) as a shadcn dropdown. The trigger
 * icon swaps via the `dark:` variant (no hydration mismatch); the active radio
 * item is only evaluated when the menu opens (post-hydration), so `theme` being
 * undefined on first render is fine. Use `variant="on-ink"` on the black header.
 *
 * Selecting a theme runs a circular View Transition expanding from the trigger
 * (`useThemeTransition`), which is why the trigger is a plain `<button>` with
 * `jdhButtonVariants` — we need a ref for its position and JdhButton doesn't
 * forward one (same precedent as the mega menu). The transition snapshot may
 * catch the dropdown mid-close; that's accepted.
 */
export function ThemeSwitcher({
  variant = "default",
  className,
}: {
  variant?: "default" | "on-ink"
  className?: string
}) {
  const { theme, setThemeWithTransition } = useThemeTransition()
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label="Cambiar tema"
          className={cn(
            jdhButtonVariants({ variant: "ghost", size: "icon" }),
            variant === "on-ink" &&
              "text-[var(--color-on-ink)] hover:bg-[var(--overlay-on-dark-08)]",
            className
          )}
        >
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) =>
            setThemeWithTransition(value, triggerRef.current)
          }
        >
          <DropdownMenuRadioItem value="light">
            <Sun />
            Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon />
            Oscuro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor />
            Sistema
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
