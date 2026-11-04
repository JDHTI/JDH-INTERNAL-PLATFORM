"use client"

import * as React from "react"
import { toast } from "sonner"

import { PageHeader } from "@/intranet/components/common/page-header"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { Field } from "@/intranet/components/forms/field"
import { JdhInput } from "@/intranet/components/forms/jdh-input"
import { JdhSelect } from "@/intranet/components/forms/jdh-select"
import { JdhSwitch } from "@/intranet/components/forms/jdh-switch"

import { actualizarContactoDirecto } from "../server/actions"
import type { ContactoDirecto, SedeOpcion } from "../types"

/**
 * Vista de la sección "Contacto y sede" (`/perfil/contacto`). Client
 * Component: estado local del formulario, inicializado con los valores del
 * servidor. Guardar llama a la Server Action, que persiste hacia
 * `POST /me/onboarding` en INTRANET-JDH-API (mismo endpoint de
 * `/completar-perfil` — ver `server/actions.ts`). La sede la elige cada
 * persona: el DWH no la tiene.
 */
export function ContactoDirectoView({
  contacto,
  sedes,
}: {
  contacto: ContactoDirecto
  sedes: SedeOpcion[]
}) {
  const [values, setValues] = React.useState(contacto)
  const [saving, setSaving] = React.useState(false)

  const setField = <K extends keyof ContactoDirecto>(
    key: K,
    value: ContactoDirecto[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      await actualizarContactoDirecto(values)
      toast.success("Datos actualizados.")
    } catch {
      toast.error("No se pudo guardar. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacto y sede"
        description="Estos datos se muestran en tu perfil del directorio, para que tus compañeros puedan ubicarte."
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-[var(--jdh-radius-md)] border border-border p-6"
      >
        <Field
          label="Sede"
          hint="La sede donde trabajas. Su dirección aparece en tu perfil del directorio."
        >
          <JdhSelect
            options={sedes.map((sede) => ({
              value: sede.id,
              label: sede.nombre,
            }))}
            value={values.sedeId}
            onValueChange={(value) => setField("sedeId", value)}
            placeholder="Selecciona tu sede"
          />
        </Field>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="Teléfono fijo">
            <JdhInput
              type="tel"
              placeholder="(604) 000 0000"
              value={values.telefono}
              onChange={(e) => setField("telefono", e.target.value)}
            />
          </Field>
          <Field label="Celular">
            <JdhInput
              type="tel"
              placeholder="300 000 0000"
              value={values.celular}
              onChange={(e) => setField("celular", e.target.value)}
            />
          </Field>
        </div>

        <JdhSwitch
          label="Mostrar mi celular en el directorio"
          description="Si lo desactivas, tus compañeros solo verán tu teléfono fijo y correo."
          checked={values.celularVisible}
          onCheckedChange={(checked) => setField("celularVisible", checked)}
        />

        <div className="flex justify-end border-t border-border pt-6">
          <JdhButton type="submit" loading={saving}>
            Guardar cambios
          </JdhButton>
        </div>
      </form>
    </div>
  )
}
