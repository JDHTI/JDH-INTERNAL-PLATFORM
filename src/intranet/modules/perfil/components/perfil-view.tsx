import type { Route } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { PageHeader } from "@/intranet/components/common/page-header"
import { empleadoHref, formatAntiguedad } from "@/intranet/modules/directorio"

import { formatFechaNacimiento } from "../perfil.config"
import type { MiPerfil } from "../types"
import { ProfilePhotoEditor } from "./profile-photo-editor"

/**
 * Vista de la sección "Perfil" (`/perfil`, primer ítem del rail). Foto
 * editable + identidad de solo lectura + enlace al perfil PÚBLICO en
 * directorio (distinto de esta zona privada — ver comentario en `UserMenu`).
 */
export function PerfilView({ perfil }: { perfil: MiPerfil }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Perfil"
        description="Tu foto e identidad, visibles para el resto de la organización."
      />

      <div className="flex flex-wrap items-center gap-6 rounded-[var(--jdh-radius-md)] border border-border p-6">
        <ProfilePhotoEditor nombre={perfil.name} photoUrl={perfil.photoUrl} />

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-tight">{perfil.name}</h2>
          {perfil.jobTitle ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {perfil.jobTitle}
            </p>
          ) : null}
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {perfil.email}
          </p>
          {formatFechaNacimiento(perfil.birthDate) ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {formatFechaNacimiento(perfil.birthDate)}
            </p>
          ) : null}
          {perfil.sede ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {perfil.sede}
              {perfil.direccion ? ` · ${perfil.direccion}` : ""}
              {" · "}
              <Link
                href="/perfil/contacto"
                className="text-foreground underline decoration-1 underline-offset-2 hover:decoration-2"
              >
                Cambiar
              </Link>
            </p>
          ) : null}
          {perfil.hireDate ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {formatAntiguedad(perfil.hireDate)}
            </p>
          ) : null}
        </div>

        {perfil.employeeId ? (
          <Link
            href={empleadoHref(perfil.employeeId) as Route}
            className="inline-flex items-center gap-1.5 text-sm font-medium underline decoration-1 underline-offset-2 hover:decoration-2"
          >
            Ver mi perfil público
            <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
    </div>
  )
}
