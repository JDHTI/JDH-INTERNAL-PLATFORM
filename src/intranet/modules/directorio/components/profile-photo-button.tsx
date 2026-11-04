"use client"

import { InitialsAvatar } from "@/intranet/components/common/initials-avatar"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/intranet/components/ui/dialog"

/**
 * Envuelve el avatar de 96px del hero en un botón que abre un modal con la
 * foto ampliada (432x432, `photoUrlGrande`) si existe.
 */
export function ProfilePhotoButton({
  nombre,
  photoUrl,
  photoUrlGrande,
  cumpleanos = false,
}: {
  nombre: string
  photoUrl: string | null
  photoUrlGrande: string | null
  /** Hoy cumple años: marco con globos alrededor del avatar del hero. */
  cumpleanos?: boolean
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Ver foto de perfil de ${nombre}`}
          className="rounded-full transition-opacity outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <InitialsAvatar
            name={nombre}
            src={photoUrl ?? undefined}
            size="xl"
            tone="ink"
            birthday={cumpleanos}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="flex flex-col items-center gap-4 sm:max-w-sm">
        <DialogTitle className="sr-only">
          Foto de perfil de {nombre}
        </DialogTitle>
        {photoUrlGrande ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrlGrande}
            alt={nombre}
            className="size-48 rounded-full object-cover"
          />
        ) : (
          <InitialsAvatar
            name={nombre}
            size="xl"
            tone="ink"
            className="size-48 text-5xl"
          />
        )}
        <p className="text-center text-sm font-medium">{nombre}</p>
      </DialogContent>
    </Dialog>
  )
}
