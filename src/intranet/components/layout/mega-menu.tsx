"use client"

import * as React from "react"
import type { Route } from "next"
import Link from "next/link"
import { LayoutGrid } from "lucide-react"

import { jdhButtonVariants } from "@/intranet/components/common/jdh-button"
import { megaMenuConfig } from "@/intranet/config/mega-menu.config"
import { modules } from "@/intranet/config/modules"
import { useCurrentUser } from "@/intranet/hooks/use-current-user"
import { cn } from "@/intranet/lib/utils"

/**
 * "Explorar todo" mega menu. A controlled disclosure panel (not a Popover):
 * the panel is `absolute top-full inset-x-0` inside the (relative) header, so it
 * spans the FULL header width and overlays the horizontal nav below — which a
 * floating Popover can't do cleanly. Closes on Escape (returns focus), on
 * outside pointer-down, and on navigation (each link closes it).
 *
 * Positioning is robust to the announcement bar because `top-full` is measured
 * from the header's own bottom, not a hardcoded offset.
 *
 * Below `md` this is the *only* way to browse modules (there's no drawer —
 * see `AppHeader`), so its groups cover every registered module 1:1 with
 * `src/config/modules.ts`. `max-h-[80vh] overflow-y-auto` keeps the panel
 * from running off the bottom of short mobile viewports; harmless at wider
 * sizes since the grid content is well under that height there.
 */
export function MegaMenu() {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const { permissions } = useCurrentUser()
  const visibleIds = new Set(
    modules.visibleTo(permissions).map((mod) => mod.id)
  )

  React.useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("pointerdown", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("pointerdown", onPointerDown)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Explorar todo"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls="mega-menu-panel"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          jdhButtonVariants({ variant: "ghost", size: "icon" }),
          "text-[var(--color-on-ink)] hover:bg-[var(--overlay-on-dark-08)]",
          open && "bg-[var(--overlay-on-dark-08)]"
        )}
      >
        <LayoutGrid />
      </button>

      {open ? (
        <div
          id="mega-menu-panel"
          ref={panelRef}
          role="region"
          aria-label="Explorar todo"
          className="absolute inset-x-0 top-full z-30 max-h-[80vh] overflow-y-auto overscroll-contain border-b border-border bg-popover text-popover-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2"
        >
          <div
            className={cn(
              "mx-auto grid max-w-[var(--container-wide)] gap-6 px-6 py-6 sm:grid-cols-3",
              megaMenuConfig.featured && "lg:grid-cols-[1fr_1fr_1fr_0.9fr]"
            )}
          >
            {megaMenuConfig.groups.map((group) => (
              <div key={group.id} className="space-y-3">
                <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
                  {group.title}
                </p>
                <ul className="space-y-1">
                  {(group.moduleIds ?? []).map((id) => {
                    const mod = modules.byId(id)
                    if (!mod || !visibleIds.has(id)) return null
                    const Icon = mod.icon

                    return (
                      <li key={id}>
                        <Link
                          href={mod.href as Route}
                          onClick={close}
                          className="flex items-start gap-3 rounded-md p-2 transition-colors outline-none hover:bg-accent focus-visible:bg-accent"
                        >
                          <Icon className="mt-0.5 size-5 shrink-0" />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">
                              {mod.nav?.label ?? mod.title}
                            </span>
                            {mod.description ? (
                              <span className="line-clamp-2 block text-xs text-muted-foreground">
                                {mod.description}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                  {(group.links ?? []).map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href as Route}
                        onClick={close}
                        className="block rounded-md p-2 text-sm transition-colors outline-none hover:bg-accent focus-visible:bg-accent"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {megaMenuConfig.featured ? (
              <div className="flex flex-col rounded-[var(--jdh-radius-md)] border border-transparent bg-primary p-5 text-primary-foreground dark:border-[var(--color-ink-border)]">
                <p className="text-sm font-medium">
                  {megaMenuConfig.featured.title}
                </p>
                <p className="mt-1 text-xs text-[var(--color-on-ink-muted)]">
                  {megaMenuConfig.featured.description}
                </p>
                <Link
                  href={megaMenuConfig.featured.href as Route}
                  onClick={close}
                  className={cn(
                    jdhButtonVariants({
                      variant: "primary-on-ink",
                      size: "sm",
                    }),
                    "mt-4 self-start"
                  )}
                >
                  {megaMenuConfig.featured.cta}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
