import * as React from "react"
import type { Route } from "next"
import Link from "next/link"

import { cn } from "@/intranet/lib/utils"

const sizes = {
  sm: "h-[220px]",
  md: "h-[280px]",
  lg: "h-[360px]",
  xl: "h-[440px]",
} as const

export interface OverlayCardProps {
  src: string
  alt: string
  title: string
  eyebrow?: string
  description?: string
  /** ContentBadge(s) shown at the top-left corner. */
  badges?: React.ReactNode
  href?: `/${string}`
  size?: keyof typeof sizes
  className?: string
}

/**
 * Full-bleed image card: the image is the background and the text sits over an
 * ink gradient. The description reveals on hover/focus (and always on touch
 * devices). Pure CSS — RSC-safe; reduced-motion handled globally.
 */
export function OverlayCard({
  src,
  alt,
  title,
  eyebrow,
  description,
  badges,
  href,
  size = "md",
  className,
}: OverlayCardProps) {
  const rootClass = cn(
    "group relative block overflow-hidden rounded-[var(--jdh-radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    sizes[size],
    className
  )

  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/85 via-[var(--color-ink)]/35 to-transparent" />

      {badges ? (
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {badges}
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 text-[var(--color-on-ink)]">
        {eyebrow ? (
          <p className="font-mono text-xs tracking-[0.08em] text-[var(--color-on-ink-muted)] uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="text-lg font-medium">{title}</h3>
        {description ? (
          <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100 group-hover:grid-rows-[1fr] group-hover:opacity-100 [@media(hover:none)]:grid-rows-[1fr] [@media(hover:none)]:opacity-100">
            <p className="overflow-hidden text-sm text-[var(--color-on-ink-muted)]">
              {description}
            </p>
          </div>
        ) : null}
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href as Route} className={rootClass}>
        {inner}
      </Link>
    )
  }

  return <div className={rootClass}>{inner}</div>
}
