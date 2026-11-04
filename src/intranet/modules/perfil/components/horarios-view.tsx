"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/intranet/components/common/page-header"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { Field } from "@/intranet/components/forms/field"
import { JdhInput } from "@/intranet/components/forms/jdh-input"
import { JdhSelect } from "@/intranet/components/forms/jdh-select"
import { cn } from "@/intranet/lib/utils"

import {
  agruparFranjas,
  DIAS_SEMANA,
  HORARIO_POR_DEFECTO,
} from "../perfil.config"
import { actualizarHorarioContacto } from "../server/actions"
import type { DiaSemana, FranjaHorario } from "../types"

/** Una franja nueva arranca el día siguiente al de la última fila. */
function nuevaFranja(rows: FranjaHorario[]): FranjaHorario {
  const ultima = rows.at(-1)
  const idx = ultima
    ? DIAS_SEMANA.findIndex((dia) => dia.value === ultima.dia)
    : -1
  return {
    dia: DIAS_SEMANA[(idx + 1) % DIAS_SEMANA.length].value,
    inicio: ultima?.inicio ?? "07:00",
    fin: ultima?.fin ?? "17:00",
  }
}

/**
 * Vista de la sección "Horarios de contacto" (`/perfil/horarios`): editor de
 * franjas (día + hora de inicio/fin) con vista previa de cómo se verá en el
 * perfil público del directorio (misma tarjeta que `EmpleadoDetail`, días
 * consecutivos iguales agrupados). Guardar reemplaza el horario completo vía
 * `PUT /me/horario-contacto`; sin franjas, el directorio vuelve a mostrar el
 * horario corporativo.
 */
export function HorariosView({
  franjas,
  configurado,
}: {
  franjas: FranjaHorario[]
  /** `false` = la persona aún no ha guardado su horario; `franjas` es una sugerencia. */
  configurado: boolean
}) {
  const [rows, setRows] = React.useState(franjas)
  const [saving, setSaving] = React.useState(false)
  const [guardado, setGuardado] = React.useState(configurado)

  const updateRow = <K extends keyof FranjaHorario>(
    index: number,
    key: K,
    value: FranjaHorario[K]
  ) =>
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    )

  const removeRow = (index: number) =>
    setRows((current) => current.filter((_, i) => i !== index))

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = await actualizarHorarioContacto(rows)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      setRows(result.data)
      setGuardado(result.data.length > 0)
      toast.success("Horarios de contacto actualizados.")
    } catch {
      toast.error("No se pudo guardar. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  const preview = rows.length > 0 ? agruparFranjas(rows) : HORARIO_POR_DEFECTO

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horarios de contacto"
        description="Define en qué franjas horarias estás disponible. Se muestra en tu perfil del directorio."
      />

      {!guardado ? (
        <p className="rounded-[var(--jdh-radius-md)] border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Aún no has guardado tu horario: tu perfil muestra el horario
          corporativo. Ajusta la sugerencia y guárdala para publicar el tuyo.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <form
          onSubmit={handleSubmit}
          className="flex min-w-0 flex-col gap-6 rounded-[var(--jdh-radius-md)] border border-border p-6"
        >
          {rows.length > 0 ? (
            <div className="flex flex-col gap-4">
              {rows.map((row, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0 sm:flex-row sm:items-end"
                >
                  <Field label="Día" className="sm:flex-[1.4]">
                    <JdhSelect
                      options={DIAS_SEMANA}
                      value={row.dia}
                      onValueChange={(value) =>
                        updateRow(index, "dia", value as DiaSemana)
                      }
                    />
                  </Field>
                  <Field label="Desde" className="flex-1">
                    <JdhInput
                      type="time"
                      required
                      value={row.inicio}
                      onChange={(e) =>
                        updateRow(index, "inicio", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Hasta" className="flex-1">
                    <JdhInput
                      type="time"
                      required
                      value={row.fin}
                      onChange={(e) => updateRow(index, "fin", e.target.value)}
                    />
                  </Field>
                  <JdhButton
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Quitar franja"
                    onClick={() => removeRow(index)}
                  >
                    <Trash2 />
                  </JdhButton>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin franjas. Si guardas así, tu perfil mostrará el horario
              corporativo.
            </p>
          )}

          <JdhButton
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() =>
              setRows((current) => [...current, nuevaFranja(current)])
            }
          >
            <Plus />
            Añadir franja
          </JdhButton>

          <div className="flex justify-end border-t border-border pt-6">
            <JdhButton type="submit" loading={saving}>
              Guardar cambios
            </JdhButton>
          </div>
        </form>

        <div className="rounded-[var(--jdh-radius-md)] border border-border p-6">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Vista previa
          </h2>
          <div className="flex flex-col gap-4">
            {preview.map((fila, index) => (
              <div
                key={fila.dias}
                className={cn(
                  "flex items-center justify-between gap-4",
                  index < preview.length - 1 && "border-b border-border pb-4"
                )}
              >
                <span className="text-sm font-medium">{fila.dias}</span>
                <span
                  className={cn(
                    "text-right font-mono text-sm",
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
        </div>
      </div>
    </div>
  )
}
