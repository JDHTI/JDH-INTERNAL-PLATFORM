import { Field } from "@/intranet/components/forms/field"
import { JdhCheckbox } from "@/intranet/components/forms/jdh-checkbox"
import { JdhInput } from "@/intranet/components/forms/jdh-input"
import { JdhRadioGroup } from "@/intranet/components/forms/jdh-radio-group"
import { JdhSelect } from "@/intranet/components/forms/jdh-select"
import { JdhSwitch } from "@/intranet/components/forms/jdh-switch"
import { JdhTextarea } from "@/intranet/components/forms/jdh-textarea"
import { SearchInput } from "@/intranet/components/forms/search-input"

import { Section, Subsection } from "./section"

export function FormsSection() {
  return (
    <Section
      title="Formularios"
      description="Field (label + hint + error) con input, textarea, select, checkbox, radio y switch. El error es texto + icono + borde 2px, nunca solo color."
    >
      <Subsection label="Campos de texto">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Nombre completo" hint="Como aparece en tu documento.">
            <JdhInput placeholder="Ana Restrepo" />
          </Field>
          <Field
            label="Correo corporativo"
            required
            error="Ingresa un correo @jdh.com.co válido."
          >
            <JdhInput type="email" defaultValue="ana@gmail.com" />
          </Field>
          <Field label="Sede">
            <JdhSelect
              placeholder="Selecciona tu sede"
              options={[
                { value: "med", label: "Medellín" },
                { value: "bog", label: "Bogotá" },
                { value: "cart", label: "Cartagena" },
              ]}
            />
          </Field>
          <Field label="Comentarios" hint="Opcional.">
            <JdhTextarea placeholder="Escribe un mensaje…" />
          </Field>
        </div>
      </Subsection>

      <Subsection label="Selección">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Preferencias</p>
            <JdhCheckbox
              label="Recibir boletín"
              description="Novedades semanales."
              defaultChecked
            />
            <JdhCheckbox label="Notificaciones push" />
            <JdhCheckbox label="No disponible" disabled />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Modalidad</p>
            <JdhRadioGroup
              defaultValue="presencial"
              options={[
                { value: "presencial", label: "Presencial" },
                {
                  value: "remoto",
                  label: "Remoto",
                  description: "Desde casa.",
                },
                { value: "hibrido", label: "Híbrido" },
              ]}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Ajustes</p>
            <JdhSwitch
              label="Modo compacto"
              description="Reduce el espaciado."
            />
            <JdhSwitch label="Autoguardado" defaultChecked />
          </div>
        </div>
      </Subsection>

      <Subsection label="Búsqueda (claro / oscuro)">
        <div className="grid gap-4 sm:grid-cols-2">
          <SearchInput placeholder="Buscar personas…" />
          <div className="rounded-[var(--jdh-radius-md)] bg-[var(--color-ink)] p-4">
            <SearchInput variant="dark" placeholder="Buscar…" kbdHint="⌘K" />
          </div>
        </div>
      </Subsection>
    </Section>
  )
}
