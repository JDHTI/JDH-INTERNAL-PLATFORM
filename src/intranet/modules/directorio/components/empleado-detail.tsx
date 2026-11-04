import type { Route } from "next"
import Link from "next/link"
import { Cake, Mail, MapPin, Phone, Smartphone } from "lucide-react"

import { InitialsAvatar } from "@/intranet/components/common/initials-avatar"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { StatusBadge } from "@/intranet/components/common/status-badge"
import { Breadcrumbs } from "@/intranet/components/navigation/breadcrumbs"
import { esCumpleanosHoy } from "@/intranet/lib/date"
import { cn } from "@/intranet/lib/utils"
import type { HorarioContacto } from "@/intranet/modules/perfil"

import {
  empleadoHref,
  formatAntiguedad,
  formatFechaIngreso,
} from "../directorio.config"
import type { CompaneroEquipo, EmpleadoDetalle } from "../types"
import { ProfilePhotoButton } from "./profile-photo-button"

function ProfileCard({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--jdh-radius-md)] border border-border p-6",
        className
      )}
    >
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-base font-medium">{value}</p>
    </div>
  )
}

/**
 * Vista de perfil ampliado de un empleado (pantalla 07 del mockup, ancla
 * `#emp-1a`). "Enviar correo" y "Ver en organigrama" son meramente visuales
 * — misma convención que las acciones aún no implementadas en
 * `noticia-detail.tsx` (`disabled` + `title="Disponible próximamente"`); el
 * correo del panel "Contacto directo" sí es un `mailto:` real porque es dato,
 * no una acción del sistema.
 */
export function EmpleadoDetail({
  empleado,
  equipo,
  horario,
}: {
  empleado: EmpleadoDetalle
  equipo: CompaneroEquipo[]
  horario: HorarioContacto[]
}) {
  const cumpleanosHoy = esCumpleanosHoy(empleado.fechaNacimiento)

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Intranet", href: "/" },
          { label: "Directorio", href: "/directorio" },
          { label: empleado.nombre },
        ]}
      />

      {/* HERO */}
      <div className="flex flex-wrap items-center gap-6 border-b border-border pb-8">
        <ProfilePhotoButton
          nombre={empleado.nombre}
          photoUrl={empleado.photoUrl}
          photoUrlGrande={empleado.photoUrlGrande}
          cumpleanos={cumpleanosHoy}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight">
              {empleado.nombre}
            </h1>
            <StatusBadge variant="dot">Activo</StatusBadge>
            {cumpleanosHoy ? (
              <StatusBadge>
                <Cake aria-hidden className="size-3.5" />
                Hoy cumple años
              </StatusBadge>
            ) : null}
          </div>
          <p className="mt-2 text-lg text-muted-foreground">
            {empleado.cargo} · {empleado.sede}
          </p>
        </div>

        <div className="flex shrink-0 gap-3">
          <JdhButton variant="primary" disabled title="Disponible próximamente">
            <Mail />
            Enviar correo
          </JdhButton>
          <JdhButton
            variant="secondary"
            disabled
            title="Disponible próximamente"
          >
            Ver en organigrama
          </JdhButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* COLUMNA PRINCIPAL */}
        <div className="flex min-w-0 flex-col gap-8">
          <ProfileCard title="Información laboral">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InfoField
                label="Fecha de ingreso"
                value={formatFechaIngreso(empleado.fechaIngreso)}
              />
              <InfoField
                label="Antigüedad"
                value={formatAntiguedad(empleado.fechaIngreso)}
              />
              <InfoField label="Jornada" value={empleado.jornada} />
              <InfoField label="Área" value={empleado.area} />
              <InfoField
                label="Jefe inmediato"
                value={
                  empleado.jefe
                    ? `${empleado.jefe.nombre} · ${empleado.jefe.cargo}`
                    : "—"
                }
              />
            </div>
          </ProfileCard>

          <ProfileCard title="Horario de contacto">
            <div className="flex flex-col gap-4">
              {horario.map((fila, index) => (
                <div
                  key={fila.dias}
                  className={cn(
                    "flex items-center justify-between",
                    index < horario.length - 1 && "border-b border-border pb-4"
                  )}
                >
                  <span className="text-sm font-medium">{fila.dias}</span>
                  <span
                    className={cn(
                      "font-mono text-sm",
                      fila.muted
                        ? "text-muted-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {fila.valor}
                  </span>
                </div>
              ))}
            </div>
          </ProfileCard>
        </div>

        {/* RAIL */}
        <div className="flex flex-col gap-8">
          <ProfileCard title="Contacto directo">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Mail
                  className="size-[18px] shrink-0 text-muted-foreground"
                  strokeWidth={1.75}
                />
                {empleado.email ? (
                  <a
                    href={`mailto:${empleado.email}`}
                    className="font-mono text-sm hover:underline"
                  >
                    {empleado.email}
                  </a>
                ) : (
                  <span className="font-mono text-sm text-muted-foreground">
                    Sin correo registrado
                  </span>
                )}
              </div>
              {empleado.telefonoFijo || empleado.extension ? (
                <div className="flex items-center gap-3">
                  <Phone
                    className="size-[18px] shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                  <span className="text-sm text-muted-foreground">
                    {empleado.telefonoFijo ? (
                      <a
                        href={`tel:${empleado.telefonoFijo.replace(/[^\d+]/g, "")}`}
                        className="font-mono hover:underline"
                      >
                        {empleado.telefonoFijo}
                      </a>
                    ) : null}
                    {empleado.telefonoFijo && empleado.extension ? " · " : null}
                    {empleado.extension ? `Ext. ${empleado.extension}` : null}
                  </span>
                </div>
              ) : null}
              {empleado.celularPublico ? (
                <div className="flex items-center gap-3">
                  <Smartphone
                    className="size-[18px] shrink-0 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                  <a
                    href={`tel:${empleado.celularPublico.replace(/[^\d+]/g, "")}`}
                    className="font-mono text-sm hover:underline"
                  >
                    {empleado.celularPublico}
                  </a>
                </div>
              ) : null}
              <div className="flex items-start gap-3">
                <MapPin
                  className="mt-0.5 size-[18px] shrink-0 text-muted-foreground"
                  strokeWidth={1.75}
                />
                <div className="text-sm text-muted-foreground">
                  <p>{empleado.sede}</p>
                  {empleado.direccion ? <p>{empleado.direccion}</p> : null}
                </div>
              </div>
            </div>
          </ProfileCard>

          {equipo.length > 0 ? (
            <ProfileCard title="Equipo">
              <div className="flex flex-col gap-3">
                {equipo.map((companero) => (
                  <Link
                    key={companero.id}
                    href={empleadoHref(companero.id) as Route}
                    className="flex items-center gap-3"
                  >
                    <InitialsAvatar name={companero.nombre} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {companero.nombre}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {companero.sede === empleado.sede
                          ? companero.cargo
                          : `${companero.cargo} · ${companero.sede}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </ProfileCard>
          ) : null}
        </div>
      </div>
    </div>
  )
}
