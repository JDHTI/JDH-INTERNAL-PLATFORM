"use client"

import type { Route } from "next"
import Link from "next/link"
import { Bell } from "lucide-react"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/intranet/components/ui/popover"
import { ScrollArea } from "@/intranet/components/ui/scroll-area"
import { formatRelativo } from "@/intranet/lib/date"
import { cn } from "@/intranet/lib/utils"
import {
  useMarcarLeida,
  useMarcarTodasLeidas,
  useNotificaciones,
} from "@/intranet/modules/notificaciones/hooks/use-notificaciones"

/**
 * Header bell with an unread counter and a popover list of notifications.
 * Backed by `useNotificaciones` (feed + conteo real en una sola llamada,
 * sondeado cada `POLL_INTERVAL_MS`) — reemplaza el mock que vivía en
 * `src/lib/mock/notifications.ts` (ya borrado).
 */
export function NotificationsPopover() {
  const { data } = useNotificaciones(1)
  const marcarLeida = useMarcarLeida()
  const marcarTodasLeidas = useMarcarTodasLeidas()

  const notifications = data?.items ?? []
  const unread = data?.noLeidas ?? 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <JdhButton
          variant="ghost"
          size="icon"
          aria-label={
            unread > 0 ? `Notificaciones, ${unread} sin leer` : "Notificaciones"
          }
          className="relative text-[var(--color-on-ink)] hover:bg-[var(--overlay-on-dark-08)]"
        >
          <Bell />
          {unread > 0 ? (
            <span className="absolute top-1.5 right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-on-ink)] px-1 text-[0.625rem] font-medium text-[var(--color-ink)]">
              {unread}
            </span>
          ) : null}
        </JdhButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-medium">Notificaciones</p>
          {unread > 0 ? (
            <button
              type="button"
              onClick={() => marcarTodasLeidas.mutate()}
              className="text-xs text-muted-foreground underline-offset-2 outline-none hover:underline focus-visible:underline"
            >
              Marcar todo como leído
            </button>
          ) : null}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No tienes notificaciones
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={notification.href as Route}
                    onClick={() => {
                      if (!notification.leida) marcarLeida.mutate(notification.id)
                    }}
                    className={cn(
                      "flex gap-3 px-4 py-3 transition-colors outline-none hover:bg-accent focus-visible:bg-accent",
                      !notification.leida && "bg-[var(--color-surface-subtle)]"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        notification.leida
                          ? "bg-[var(--color-border-strong)]"
                          : "bg-foreground"
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm">{notification.titulo}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatRelativo(notification.creadaEn)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
