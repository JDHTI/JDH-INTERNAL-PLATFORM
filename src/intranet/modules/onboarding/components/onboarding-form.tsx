"use client"

import * as React from "react"
import type { Route } from "next"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import { Field } from "@/intranet/components/forms/field"
import { JdhInput } from "@/intranet/components/forms/jdh-input"
import { JdhSelect } from "@/intranet/components/forms/jdh-select"

import { completarOnboarding, omitirOnboarding } from "../server/actions"
import type { OnboardingInput, OnboardingPrefill } from "../types"

type FieldErrors = Partial<Record<keyof OnboardingInput, string[]>>

/**
 * Pide solo lo que le falta a la persona (`prefill.pendientes`): contacto
 * (celular y fijo), sede, o ambos. Cargo y fecha de nacimiento los carga el
 * DWH de Gestión Humana, la extensión la asigna un admin, y `fechaIngreso`
 * sale de Entra ID (ver `.claude/ARCHITECTURE.md`). "Omitir por ahora" deja
 * pasar solo durante la sesión actual. El saludo vive en `page.tsx`.
 */
export function OnboardingForm({
  prefill,
  next,
}: {
  prefill: OnboardingPrefill
  next: string
}) {
  const router = useRouter()
  const pideContacto = prefill.pendientes.includes("contacto")
  const pideSede = prefill.pendientes.includes("sede")
  const [values, setValues] = React.useState<OnboardingInput>({
    mobilePhone: prefill.mobilePhone,
    landlinePhone: prefill.landlinePhone,
    siteId: prefill.siteId ?? "",
  })
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [saving, setSaving] = React.useState(false)
  const [skipping, setSkipping] = React.useState(false)

  const setField = <K extends keyof OnboardingInput>(
    key: K,
    value: OnboardingInput[K]
  ) => setValues((current) => ({ ...current, [key]: value }))

  function goNext() {
    // `next` ya viene saneado (`safeNextPath`: solo rutas internas), pero es
    // dinámico: `typedRoutes` no puede verificarlo en compilación.
    router.replace(next as Route)
    router.refresh()
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const result = await completarOnboarding(values)
      if (result.success) {
        toast.success("Perfil completado.")
        goNext()
        return
      }
      if (result.fieldErrors) {
        setErrors(result.fieldErrors)
        toast.error("Revisa los campos marcados.")
      } else {
        toast.error("No se pudo guardar. Intenta de nuevo.")
      }
    } catch {
      toast.error("No se pudo guardar. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  async function handleSkip() {
    setSkipping(true)
    try {
      await omitirOnboarding()
      goNext()
    } catch {
      toast.error("No se pudo continuar. Intenta de nuevo.")
      setSkipping(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {pideSede && (
          <Field
            label="Sede"
            required
            error={errors.siteId?.[0]}
            className="sm:col-span-2"
          >
            <JdhSelect
              options={prefill.sedes.map((sede) => ({
                value: sede.id,
                label: sede.nombre,
              }))}
              value={values.siteId}
              onValueChange={(value) => setField("siteId", value)}
              placeholder="Selecciona la sede donde trabajas"
            />
          </Field>
        )}

        {pideContacto && (
          <>
            <Field label="Celular" required error={errors.mobilePhone?.[0]}>
              <JdhInput
                type="tel"
                placeholder="300 000 0000"
                value={values.mobilePhone}
                onChange={(e) => setField("mobilePhone", e.target.value)}
              />
            </Field>

            <Field
              label="Teléfono fijo"
              hint="Opcional."
              error={errors.landlinePhone?.[0]}
            >
              <JdhInput
                type="tel"
                placeholder="(604) 000 0000"
                value={values.landlinePhone}
                onChange={(e) => setField("landlinePhone", e.target.value)}
              />
            </Field>
          </>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
        <JdhButton
          type="button"
          variant="ghost"
          loading={skipping}
          disabled={saving}
          onClick={handleSkip}
        >
          Omitir por ahora
        </JdhButton>
        <JdhButton type="submit" loading={saving} disabled={skipping}>
          Guardar y continuar
        </JdhButton>
      </div>
    </form>
  )
}
