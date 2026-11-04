"use client"

import { PageHeader } from "@/intranet/components/common/page-header"
import { JdhSwitch } from "@/intranet/components/forms/jdh-switch"

import { useWebPush } from "../hooks/use-web-push"

/** Sección "Notificaciones push" de `/perfil/notificaciones`. */
export function PushSettingsView() {
  const { soportado, activo, cargando, activar, desactivar } = useWebPush()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificaciones"
        description="Recibe un aviso del sistema cuando se publique algo importante, incluso con la pestaña cerrada."
      />

      <div className="rounded-[var(--jdh-radius-md)] border border-border p-6">
        {!soportado ? (
          <p className="text-sm text-muted-foreground">
            Tu navegador no admite notificaciones push.
          </p>
        ) : (
          <JdhSwitch
            label="Notificaciones push del navegador"
            description="Solo se activan cuando aceptas el permiso del navegador."
            checked={activo}
            disabled={cargando}
            onCheckedChange={(checked) => {
              if (checked) void activar()
              else void desactivar()
            }}
          />
        )}
      </div>
    </div>
  )
}
