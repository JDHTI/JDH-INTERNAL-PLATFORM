"use client"

import * as React from "react"
import { toast } from "sonner"

import { ContentBadge } from "@/intranet/components/common/content-badge"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { ConfirmDeleteModal } from "@/intranet/components/modals/confirm-delete-modal"
import { DetailModal } from "@/intranet/components/modals/detail-modal"
import { FormModal } from "@/intranet/components/modals/form-modal"

import { Section } from "./section"

export function ModalsSection() {
  const [formOpen, setFormOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [detailOpen, setDetailOpen] = React.useState(false)

  return (
    <Section
      title="Modales"
      description="Creación dinámica (campos configurables), confirmación de eliminación y detalle / vista previa."
    >
      <div className="flex flex-wrap gap-3">
        <JdhButton variant="secondary" onClick={() => setFormOpen(true)}>
          Modal de creación
        </JdhButton>
        <JdhButton variant="secondary" onClick={() => setDeleteOpen(true)}>
          Confirmar eliminación
        </JdhButton>
        <JdhButton variant="secondary" onClick={() => setDetailOpen(true)}>
          Detalle / vista previa
        </JdhButton>
      </div>

      <FormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Nueva publicación"
        description="Crea un comunicado para la organización."
        fields={[
          {
            type: "text",
            name: "titulo",
            label: "Título",
            required: true,
            placeholder: "Título del comunicado",
          },
          {
            type: "textarea",
            name: "resumen",
            label: "Resumen",
            hint: "Máximo 280 caracteres.",
          },
          {
            type: "select",
            name: "area",
            label: "Área",
            required: true,
            options: [
              { value: "ti", label: "TI" },
              { value: "gh", label: "Gestión Humana" },
              { value: "mercadeo", label: "Mercadeo" },
            ],
          },
          {
            type: "radio",
            name: "prioridad",
            label: "Prioridad",
            defaultValue: "normal",
            options: [
              { value: "normal", label: "Normal" },
              { value: "alta", label: "Alta" },
            ],
          },
          { type: "checkbox", name: "fijar", label: "Fijar en el inicio" },
          {
            type: "switch",
            name: "notificar",
            label: "Notificar a todos",
            defaultChecked: true,
          },
        ]}
        onSubmit={() => {
          toast.success("Formulario enviado")
        }}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        entityName="la noticia «Política de seguridad»"
        confirmationText="ELIMINAR"
        onConfirm={() => {
          toast.success("Elemento eliminado")
        }}
      />

      <DetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        eyebrow="Comunicado"
        title="Política de seguridad de la información"
        badges={<ContentBadge badge="obligatorio" />}
        meta="Publicado el 12 jul · TI"
      >
        <div className="space-y-3">
          <p>
            Este es un ejemplo de contenido de detalle en modo solo lectura. El
            cuerpo es desplazable de forma independiente al encabezado y al pie.
          </p>
          <p className="text-muted-foreground">
            Úsalo para previsualizar noticias, documentos o perfiles sin salir
            del listado.
          </p>
        </div>
      </DetailModal>
    </Section>
  )
}
