import { JdhAlert } from "@/intranet/components/common/jdh-alert"

import { Section } from "./section"

export function AlertsSection() {
  return (
    <Section
      title="Alertas"
      description="Feedback con tinte semántico sutil — el tipo se distingue por icono + título + acento, no solo por color."
    >
      <div className="space-y-3">
        <JdhAlert variant="info" title="Información">
          El mantenimiento del portal está programado para el sábado.
        </JdhAlert>
        <JdhAlert variant="success" title="Cambios guardados">
          La publicación se actualizó correctamente.
        </JdhAlert>
        <JdhAlert
          variant="warning"
          title="Tu sesión expirará pronto"
          dismissible
        >
          Guarda tus cambios para no perder información.
        </JdhAlert>
        <JdhAlert
          variant="error"
          title="No se pudo enviar la solicitud"
          dismissible
        >
          Revisa los campos marcados e inténtalo de nuevo.
        </JdhAlert>
      </div>
    </Section>
  )
}
