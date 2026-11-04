"use client"

import * as React from "react"
import type { Route } from "next"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import { cn } from "@/intranet/lib/utils"

interface BasePaginationProps {
  page: number
  totalPages: number
  /** Page numbers shown on each side of the current page. */
  siblings?: number
  className?: string
}

type PaginationProps = BasePaginationProps &
  (
    | { onPageChange: (page: number) => void; hrefFor?: never }
    | { hrefFor: (page: number) => `/${string}`; onPageChange?: never }
  )

type PageItem = number | "ellipsis-start" | "ellipsis-end"

function getPageItems(
  page: number,
  total: number,
  siblings: number
): PageItem[] {
  // Show all when there's no room for ellipsis (first + last + window + 2 gaps).
  const totalToShow = siblings * 2 + 5
  if (total <= totalToShow) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const left = Math.max(page - siblings, 1)
  const right = Math.min(page + siblings, total)
  const showLeftEllipsis = left > 2
  const showRightEllipsis = right < total - 1

  const items: PageItem[] = [1]
  if (showLeftEllipsis) items.push("ellipsis-start")
  for (
    let p = showLeftEllipsis ? left : 2;
    p <= (showRightEllipsis ? right : total - 1);
    p++
  ) {
    items.push(p)
  }
  if (showRightEllipsis) items.push("ellipsis-end")
  items.push(total)
  return items
}

/**
 * Page navigation (DESIGN.md §4.7): Previous / numbered pages / Next, with the
 * active page filled ink. Controlled either by `onPageChange` (client state) or
 * `hrefFor` (link-based, SSR-friendly) — provide exactly one.
 *
 * Previous/Next drop their label below `sm` (icon-only, `px-2`): at `size="sm"`
 * with both words present they run well past a mobile viewport's width, and
 * since the row is centered (`justify-center`), the overflow pushed evenly out
 * both sides — flush against, and slightly past, the screen edges. Icon-only
 * matches the numbered buttons' footprint (`icon-sm`, 36px) closely enough to
 * fit the same page-count range without the row needing to wrap.
 */
export function Pagination({
  page,
  totalPages,
  siblings = 1,
  className,
  ...handlers
}: PaginationProps) {
  if (totalPages <= 1) return null

  const items = getPageItems(page, totalPages, siblings)
  const hrefFor = "hrefFor" in handlers ? handlers.hrefFor : undefined
  const onPageChange =
    "onPageChange" in handlers ? handlers.onPageChange : undefined

  const goTo = (target: number) => {
    if (target < 1 || target > totalPages || target === page) return
    onPageChange?.(target)
  }

  return (
    <nav
      aria-label="Paginación"
      className={cn("flex items-center justify-center gap-2", className)}
    >
      <PageButton
        disabled={page <= 1}
        href={hrefFor && page > 1 ? hrefFor(page - 1) : undefined}
        onClick={onPageChange ? () => goTo(page - 1) : undefined}
        variant="secondary"
        className="px-2 sm:px-4"
        ariaLabel="Página anterior"
      >
        <ChevronLeft />
        <span className="hidden sm:inline">Anterior</span>
      </PageButton>

      {items.map((item) =>
        typeof item === "number" ? (
          <PageButton
            key={item}
            href={hrefFor ? hrefFor(item) : undefined}
            onClick={onPageChange ? () => goTo(item) : undefined}
            variant={item === page ? "primary" : "ghost"}
            size="icon-sm"
            ariaLabel={`Página ${item}`}
            ariaCurrent={item === page ? "page" : undefined}
          >
            {item}
          </PageButton>
        ) : (
          <span
            key={item}
            aria-hidden
            className="inline-flex size-9 items-center justify-center text-sm text-muted-foreground"
          >
            …
          </span>
        )
      )}

      <PageButton
        disabled={page >= totalPages}
        href={hrefFor && page < totalPages ? hrefFor(page + 1) : undefined}
        onClick={onPageChange ? () => goTo(page + 1) : undefined}
        variant="secondary"
        className="px-2 sm:px-4"
        ariaLabel="Página siguiente"
      >
        <span className="hidden sm:inline">Siguiente</span>
        <ChevronRight />
      </PageButton>
    </nav>
  )
}

function PageButton({
  href,
  onClick,
  disabled,
  variant,
  size = "sm",
  className,
  ariaLabel,
  ariaCurrent,
  children,
}: {
  href?: `/${string}`
  onClick?: () => void
  disabled?: boolean
  variant: React.ComponentProps<typeof JdhButton>["variant"]
  size?: React.ComponentProps<typeof JdhButton>["size"]
  className?: string
  ariaLabel: string
  ariaCurrent?: "page"
  children: React.ReactNode
}) {
  // Link mode (only when enabled and an href is available).
  if (href && !disabled) {
    return (
      <JdhButton
        asChild
        variant={variant}
        size={size}
        className={className}
        aria-label={ariaLabel}
        aria-current={ariaCurrent}
      >
        <Link href={href as Route}>{children}</Link>
      </JdhButton>
    )
  }

  return (
    <JdhButton
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
    >
      {children}
    </JdhButton>
  )
}
