import * as React from "react"

import { Stagger, StaggerItem } from "@/intranet/components/motion/stagger"
import {
  Breadcrumbs,
  type BreadcrumbEntry,
} from "@/intranet/components/navigation/breadcrumbs"
import { cn } from "@/intranet/lib/utils"

export interface SectionHeaderProps {
  title: string
  description?: string
  eyebrow?: string
  breadcrumbs?: BreadcrumbEntry[]
  /** Actions rendered to the right (default/compact) or below (hero/centered). */
  actions?: React.ReactNode
  size?: "default" | "compact" | "hero"
  align?: "start" | "center"
  className?: string
}

/**
 * Section title block (DESIGN.md — like the Noticias header): optional
 * breadcrumbs + eyebrow + title + description, with an actions slot. `PageHeader`
 * is a thin wrapper over this (size="compact").
 *
 * Rows animate in sequence on mount via the motion primitives — client wrappers
 * around server children, so this stays RSC-safe (and a plain passthrough under
 * reduced motion).
 */
export function SectionHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
  size = "default",
  align = "start",
  className,
}: SectionHeaderProps) {
  const centered = align === "center" || size === "hero"

  return (
    <Stagger
      staggerDelay={0.05}
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        centered && "sm:flex-col sm:items-center",
        className
      )}
    >
      <div className={cn("space-y-2", centered && "text-center")}>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <StaggerItem y={8}>
            <Breadcrumbs items={breadcrumbs} />
          </StaggerItem>
        ) : null}
        {eyebrow ? (
          <StaggerItem y={8}>
            <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
              {eyebrow}
            </p>
          </StaggerItem>
        ) : null}
        <StaggerItem y={8}>
          <h1
            className={cn(
              "font-bold tracking-tight text-balance",
              size === "compact" && "text-2xl",
              size === "default" && "text-2xl sm:text-3xl",
              size === "hero" && "text-3xl sm:text-4xl"
            )}
          >
            {title}
          </h1>
        </StaggerItem>
        {description ? (
          <StaggerItem y={8}>
            <p
              className={cn(
                "text-sm text-muted-foreground",
                centered ? "mx-auto max-w-2xl" : "max-w-2xl"
              )}
            >
              {description}
            </p>
          </StaggerItem>
        ) : null}
      </div>
      {actions ? (
        <StaggerItem y={8} className="flex shrink-0 gap-2">
          {actions}
        </StaggerItem>
      ) : null}
    </Stagger>
  )
}
