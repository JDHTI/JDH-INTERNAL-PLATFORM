"use client"

import type { Route } from "next"
import Link from "next/link"
import { Bell } from "lucide-react"

import { EmptyState } from "@/intranet/components/common/empty-state"
import { formatRelativo } from "@/intranet/lib/date"
import { cn } from "@/intranet/lib/utils"

import { useMarcarLeida, useMarcarTodasLeidas, useNotificaciones } from "../hooks/use-notificaciones"

/** Página "ver todas" — la campana del header sigue siendo la superficie principal. */
export function NotificacionesView() {
  const { data, isPending } = useNotificaciones(1)
  const marcarLeida = useMarcarLeida()
  const marcarTodasLeidas = useMarcarTodasLeidas()

  const items = data?.items ?? []

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notificaciones</h1>
        {data && data.noLeidas > 0 ? (
          <button
            type="button"
            onClick={() => marcarTodasLeidas.mutate()}
            className="text-sm text-muted-foreground underline-offset-2 outline-none hover:underline focus-visible:underline"
          >
            Marcar todo como leído
          </button>
        ) : null}
      </div>

      {isPending ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="No tienes notificaciones" description="Cuando alguien publique algo dirigido a ti, aparecerá aquí." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border">
          {items.map((notificacion) => (
            <li key={notificacion.id}>
              <Link
                href={notificacion.href as Route}
                onClick={() => {
                  if (!notificacion.leida) marcarLeida.mutate(notificacion.id)
                }}
                className={cn(
                  "flex gap-3 px-4 py-3 transition-colors outline-none hover:bg-accent focus-visible:bg-accent",
                  !notificacion.leida && "bg-[var(--color-surface-subtle)]"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    notificacion.leida ? "bg-[var(--color-border-strong)]" : "bg-foreground"
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-sm">{notificacion.titulo}</span>
                  {notificacion.resumen ? (
                    <span className="block text-sm text-muted-foreground">{notificacion.resumen}</span>
                  ) : null}
                  <span className="block text-xs text-muted-foreground">{formatRelativo(notificacion.creadaEn)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
