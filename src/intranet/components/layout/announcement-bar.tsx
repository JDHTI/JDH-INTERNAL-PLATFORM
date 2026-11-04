"use client"

import * as React from "react"
import type { Route } from "next"
import Link from "next/link"
import { Info, TriangleAlert, X } from "lucide-react"

import { announcementConfig } from "@/intranet/config/announcement.config"
import { cn } from "@/intranet/lib/utils"

const STORAGE_KEY = "jdh-announcement-dismissed"

// Persisted dismissal keyed to the announcement id, read via an external store
// so there's no set-state-in-effect and no hydration mismatch.
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}
function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === announcementConfig.id
}
function getServerSnapshot() {
  return false // SSR renders the bar visible (critical content shows without JS)
}

const variantStyles = {
  info: "border-b border-border bg-[var(--color-bg-subtle)] text-foreground",
  warning:
    "border-b-2 border-b-foreground bg-[var(--color-bg-subtle)] text-foreground",
  critical:
    "border-b border-[var(--color-ink-border)] bg-[var(--color-ink)] text-[var(--color-on-ink)]",
} as const

const variantIcon = {
  info: Info,
  warning: TriangleAlert,
  critical: TriangleAlert,
} as const

/**
 * Site-wide announcement bar. Sits as the first child of the sticky chrome,
 * above the header. Dismissal persists in localStorage per `announcementConfig.id`.
 */
export function AnnouncementBar() {
  const persistedDismissed = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )
  // Same-tab dismissal (the `storage` event only fires in other tabs).
  const [dismissedNow, setDismissedNow] = React.useState(false)

  if (!announcementConfig.enabled) return null
  if (persistedDismissed || dismissedNow) return null

  const { message, href, linkLabel, variant, dismissible } = announcementConfig
  const Icon = variantIcon[variant]
  const isCritical = variant === "critical"

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, announcementConfig.id)
    setDismissedNow(true)
  }

  return (
    <div
      className={cn(
        "flex h-10 items-center gap-3 px-4 text-sm sm:px-6",
        variantStyles[variant]
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 truncate">
        {message}
        {href && linkLabel ? (
          <Link
            href={href as Route}
            className="ml-2 font-medium whitespace-nowrap underline underline-offset-2"
          >
            {linkLabel}
          </Link>
        ) : null}
      </p>
      {dismissible ? (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar aviso"
          className={cn(
            "-mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors outline-none",
            isCritical
              ? "hover:bg-[var(--overlay-on-dark-08)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-on-ink)]"
              : "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  )
}
