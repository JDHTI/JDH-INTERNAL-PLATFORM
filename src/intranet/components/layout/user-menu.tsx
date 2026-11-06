"use client"

import type { Route } from "next"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { ChevronDown, LayoutGrid, LogOut, User } from "lucide-react"

import { WORKSPACE_PATH } from "@/shared/config/general.config"
import { logoutSession } from "@/shared/lib/api-client"

import { InitialsAvatar } from "@/intranet/components/common/initials-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/intranet/components/ui/dropdown-menu"
import { useCurrentUser } from "@/intranet/hooks/use-current-user"
import { useMiCumpleanos } from "@/intranet/hooks/use-mi-cumpleanos"
import { empleadoHref } from "@/intranet/modules/directorio"

/**
 * Header profile menu: avatar (enlace directo al perfil PÚBLICO de
 * directorio) + name/jobTitle/chevron (trigger del dropdown), on ink. Son dos
 * elementos interactivos separados a propósito: un `<a>` no puede anidarse
 * dentro del `<button>` del `DropdownMenuTrigger`, y "clic en la foto navega,
 * clic en el resto abre el menú" es el patrón que ya usan Slack/GitHub para
 * el mismo caso.
 *
 * El ítem "Mi perfil" del dropdown, en cambio, va a `/perfil` — la zona
 * PRIVADA de configuración (`src/modules/perfil`), distinta del perfil
 * público al que enlaza el avatar. El tema vive solo en el `ThemeSwitcher`
 * del header (`AppHeader`), no aquí. Sin props: lee la sesión directamente
 * (`useCurrentUser`), preservando el diseño "sin props cruzan la frontera
 * RSC" de `AppHeader`.
 *
 * Avatar en 32px (`sm`), no 36: más discreto en la barra de 68px y con aire
 * para el marco de globos el día del cumpleaños (`useMiCumpleanos`).
 *
 * "Mi espacio de trabajo" abre la guía `/workspace`; las áreas se eligen en el
 * selector de la barra lateral.
 */
export function UserMenu() {
  const { user, isPending } = useCurrentUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const cumpleanosHoy = useMiCumpleanos(Boolean(user))

  if (isPending || !user) {
    return (
      <div
        aria-hidden
        className="size-8 animate-pulse rounded-full bg-[var(--overlay-on-dark-08)]"
      />
    )
  }

  const profileHref = user.employeeId
    ? (empleadoHref(user.employeeId) as Route)
    : null

  const avatar = (
    <InitialsAvatar
      name={user.name}
      src={user.photoUrl ?? undefined}
      size="sm"
      tone="ink"
      birthday={cumpleanosHoy}
      surface="ink"
    />
  )

  return (
    <div className="flex items-center gap-1">
      {profileHref ? (
        <Link
          href={profileHref}
          aria-label="Ver mi perfil"
          title="Ver mi perfil"
          className="rounded-full transition-opacity outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--color-focus-on-ink)]"
        >
          {avatar}
        </Link>
      ) : (
        avatar
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded-lg px-1.5 text-left transition-colors outline-none hover:bg-[var(--overlay-on-dark-08)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-on-ink)]"
          >
            <span className="hidden min-w-0 flex-col leading-tight sm:flex">
              <span className="truncate text-sm font-medium text-[var(--color-on-ink)]">
                {user.name}
              </span>
              {user.jobTitle ? (
                <span className="truncate text-xs text-[var(--color-on-ink-muted)]">
                  {user.jobTitle}
                </span>
              ) : null}
            </span>
            <ChevronDown className="size-4 text-[var(--color-on-ink-muted)]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[250px]">
          <DropdownMenuLabel>
            <span className="block text-sm font-medium text-foreground">
              {user.name}
            </span>
            <span className="block text-xs font-normal text-muted-foreground">
              {user.email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/perfil">
              <User />
              Mi perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={WORKSPACE_PATH}>
              <LayoutGrid />
              Mi espacio de trabajo
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              void logoutSession()
                .catch(() => undefined)
                .finally(() => {
                  queryClient.clear()
                  router.replace("/login")
                })
            }}
          >
            <LogOut />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
