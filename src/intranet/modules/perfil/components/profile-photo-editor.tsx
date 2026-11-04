"use client"

import { InitialsAvatar } from "@/intranet/components/common/initials-avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/intranet/components/ui/dialog"

/**
 * Foto de perfil de `/perfil` — de solo lectura. Viene de Microsoft Graph
 * (Outlook/Microsoft 365) y se refleja aquí en el próximo sync manual del
 * directorio (ver `SincronizarDirectorioButton`, `/admin/directorio`); no hay
 * un upload propio en esta app, sería una segunda fuente de verdad
 * compitiendo con Entra. Para cambiar la foto, el empleado la actualiza en
 * su perfil de Outlook.
 */
export function ProfilePhotoEditor({
  nombre,
  photoUrl,
}: {
  nombre: string
  photoUrl: string | null
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Ver foto de perfil"
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <InitialsAvatar
            name={nombre}
            src={photoUrl ?? undefined}
            size="xl"
            tone="ink"
          />
        </button>
      </DialogTrigger>
      <DialogContent className="flex flex-col items-center gap-4 text-center sm:max-w-sm">
        <DialogHeader className="items-center text-center">
          <DialogTitle>Foto de perfil</DialogTitle>
          <DialogDescription>
            Se toma de tu perfil de Microsoft 365 (Outlook) y se actualiza aquí
            en el próximo sync del directorio. Para cambiarla, actualiza tu foto
            en Outlook.
          </DialogDescription>
        </DialogHeader>
        <InitialsAvatar
          name={nombre}
          src={photoUrl ?? undefined}
          size="xl"
          tone="ink"
          className="size-32 text-3xl"
        />
      </DialogContent>
    </Dialog>
  )
}
