"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, Lock } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/intranet/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/intranet/components/ui/tooltip"
import { mainNavExtras } from "@/intranet/config/main-nav.config"
import { modules } from "@/intranet/config/modules"
import { useCurrentUser } from "@/intranet/hooks/use-current-user"
import { resolveMainNav, type MainNavItem } from "@/intranet/lib/navigation"
import { cn } from "@/intranet/lib/utils"

const itemBase =
  "inline-flex h-14 shrink-0 items-center gap-2 border-b-2 border-transparent px-2 text-sm font-medium transition-colors outline-none focus-visible:text-[var(--color-on-paper)] [&_svg]:size-[18px]"

const itemActive = "border-[var(--color-on-paper)] text-[var(--color-on-paper)]"
// neutral-700 en vez de `--color-on-paper-muted` (neutral-500): el gris medio
// se leía demasiado claro en la barra. Se fija aquí, no en el token, porque
// `on-paper-muted` también sirve a textos secundarios que deben seguir suaves.
const itemIdle = "text-[var(--neutral-700)] hover:text-[var(--color-on-paper)]"

/**
 * Horizontal main navigation under the header. Items come from the module
 * registry merged with the non-module extras (`mainNavExtras`) via
 * `resolveMainNav`. Active item = 2px bottom border + aria-current; modules
 * with `children` render a dropdown; disabled/locked items show a tooltip.
 *
 * The bar itself uses the fixed "paper" chrome tokens (white in both themes,
 * identical to the previous semantic rendering in light). The dropdown panels
 * it opens keep the theme-reactive popover tokens, like every other overlay.
 *
 * This bar is a curated set of quick-access items — `mainNavExtras` and each
 * module's `nav.order` are chosen so the row fits without wrapping or
 * scrolling, not a listing of every module/surface. Items are `shrink-0` so
 * none of them get squished. Below `md` this bar is hidden entirely in favor
 * of `MobileBottomNav`.
 *
 * Client component: it reads the registry (icons) directly, never via props.
 */
export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const { permissions } = useCurrentUser()
  const items = resolveMainNav(modules, mainNavExtras, permissions)

  const isActive = (item: MainNavItem) =>
    item.href
      ? pathname === item.href || pathname.startsWith(`${item.href}/`)
      : false

  return (
    <div
      className={cn(
        "border-b border-[var(--color-paper-border)] bg-[var(--color-paper)] shadow-sm",
        className
      )}
    >
      <nav aria-label="Menú principal" className="flex items-center gap-1 px-6">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item)
          const alignEnd = item.align === "end"

          const inner = (
            <>
              <Icon />
              {item.label}
              {item.locked ? <Lock className="size-3.5" /> : null}
              {item.children ? <ChevronDown className="size-4" /> : null}
            </>
          )

          // Disabled (e.g. "Sistemas corporativos" in maintenance).
          if (item.disabled) {
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <span
                    aria-disabled
                    className={cn(
                      itemBase,
                      "cursor-not-allowed text-[var(--color-on-paper-disabled)]",
                      alignEnd && "ml-auto"
                    )}
                  >
                    {inner}
                  </span>
                </TooltipTrigger>
                {item.disabledReason ? (
                  <TooltipContent>{item.disabledReason}</TooltipContent>
                ) : null}
              </Tooltip>
            )
          }

          // Dropdown parent (module with children, e.g. Documentos).
          if (item.children && item.children.length > 0) {
            return (
              <DropdownMenu key={item.id}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      itemBase,
                      active ? itemActive : itemIdle,
                      alignEnd && "ml-auto"
                    )}
                  >
                    {inner}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px]">
                  {item.children.map((child) => (
                    <DropdownMenuItem key={child.href} asChild>
                      <Link href={child.href as Route}>{child.label}</Link>
                    </DropdownMenuItem>
                  ))}
                  {item.childrenFooter ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          href={item.childrenFooter.href as Route}
                          className="font-medium"
                        >
                          {item.childrenFooter.label}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }

          // Plain link (with an optional lock tooltip, e.g. Administración).
          const link = (
            <Link
              key={item.id}
              href={(item.href ?? "/") as Route}
              aria-current={active ? "page" : undefined}
              className={cn(
                itemBase,
                active ? itemActive : itemIdle,
                alignEnd && "ml-auto"
              )}
            >
              {inner}
            </Link>
          )

          if (item.locked) {
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent>
                  Requiere permisos de administrador
                </TooltipContent>
              </Tooltip>
            )
          }

          return link
        })}
      </nav>
    </div>
  )
}
