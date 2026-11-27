import { ArrowRight, FileText, Users } from "lucide-react"

import { ContentBadge } from "@/intranet/components/common/content-badge"
import { CtaBanner } from "@/intranet/components/common/cta-banner"
import { JdhButton } from "@/intranet/components/common/jdh-button"
import { StatusBadge } from "@/intranet/components/common/status-badge"
import { DateChip } from "@/intranet/components/cards/date-chip"
import { EventItem } from "@/intranet/components/cards/event-item"
import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { OverlayCard } from "@/intranet/components/cards/overlay-card"

import { Section, Subsection } from "./section"

// Neutral gray placeholder (neutral-200) so the showcase stays self-contained.
const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='210'%3E%3Crect%20width='400'%20height='210'%20fill='%23D9D9D9'/%3E%3C/svg%3E"

export function CardsSection() {
  return (
    <Section
      title="Cards"
      description="JdhCard parametrizable (size, mediaPosition, variant, interactive) cubre todas las tarjetas del diseño por composición."
    >
      <Subsection label="Noticia — media arriba / media abajo (interactiva)">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <JdhCard interactive href="/noticias" mediaPosition="top">
            <JdhCard.Media src={PLACEHOLDER} alt="" height="sm">
              <StatusBadge variant="region" className="absolute top-3 left-3">
                Antioquia
              </StatusBadge>
            </JdhCard.Media>
            <JdhCard.Body>
              <JdhCard.Eyebrow>Comunicado</JdhCard.Eyebrow>
              <JdhCard.Title>Nueva política de seguridad</JdhCard.Title>
              <JdhCard.Description>
                Lineamientos actualizados para el manejo de la información.
              </JdhCard.Description>
              <JdhCard.Meta>12 jul · 3 min de lectura</JdhCard.Meta>
            </JdhCard.Body>
          </JdhCard>

          <JdhCard interactive mediaPosition="bottom">
            <JdhCard.Media src={PLACEHOLDER} alt="" height="sm" />
            <JdhCard.Body>
              <JdhCard.Eyebrow>Evento</JdhCard.Eyebrow>
              <JdhCard.Title>Jornada de bienestar</JdhCard.Title>
              <JdhCard.Description>
                El texto va arriba y la imagen abajo, con mediaPosition en
                bottom.
              </JdhCard.Description>
              <JdhCard.Meta>18 jul</JdhCard.Meta>
            </JdhCard.Body>
          </JdhCard>

          <JdhCard size="sm" interactive mediaPosition="top">
            <JdhCard.Media src={PLACEHOLDER} alt="" height="sm" />
            <JdhCard.Body>
              <JdhCard.Eyebrow>Tamaño sm</JdhCard.Eyebrow>
              <JdhCard.Title>Card compacta</JdhCard.Title>
              <JdhCard.Meta>Densidad reducida</JdhCard.Meta>
            </JdhCard.Body>
          </JdhCard>
        </div>
      </Subsection>

      <Subsection label="Hero (inverse) — media al lado, a alto completo">
        <JdhCard variant="inverse" mediaPosition="start" size="lg">
          <JdhCard.Media src={PLACEHOLDER} alt="" className="hidden sm:block" />
          <JdhCard.Body>
            <JdhCard.Eyebrow withDot>Obligatorio · Seguridad</JdhCard.Eyebrow>
            <JdhCard.Title as="h3" className="text-xl">
              Confirma la lectura del comunicado
            </JdhCard.Title>
            <JdhCard.Description>
              Todos los colaboradores deben leer y confirmar antes del 30 de
              julio.
            </JdhCard.Description>
            <JdhCard.Footer>
              <JdhButton variant="primary-on-ink" size="sm">
                Leer y confirmar
              </JdhButton>
              <JdhButton variant="outline-on-ink" size="sm">
                Más tarde
              </JdhButton>
            </JdhCard.Footer>
          </JdhCard.Body>
        </JdhCard>
      </Subsection>

      <Subsection label="Acceso rápido / solicitud / próximamente">
        <div className="grid gap-6 sm:grid-cols-3">
          <JdhCard variant="quick-link" interactive href="/directorio">
            <JdhCard.Body className="flex-row items-center gap-3">
              <JdhCard.IconBox>
                <Users />
              </JdhCard.IconBox>
              <JdhCard.Title as="p" className="text-sm">
                Directorio
              </JdhCard.Title>
            </JdhCard.Body>
          </JdhCard>

          <JdhCard>
            <JdhCard.Body>
              <div className="flex items-start justify-between gap-3">
                <JdhCard.IconBox>
                  <FileText />
                </JdhCard.IconBox>
                <JdhCard.Eyebrow>Certificados</JdhCard.Eyebrow>
              </div>
              <JdhCard.Title>Certificado laboral</JdhCard.Title>
              <JdhCard.Description>
                Solicita tu certificado con o sin salario.
              </JdhCard.Description>
              <JdhCard.Footer separated>
                <span className="text-xs text-muted-foreground">
                  Entrega: 2 días hábiles
                </span>
                <JdhButton size="sm" className="ml-auto">
                  Solicitar
                </JdhButton>
              </JdhCard.Footer>
            </JdhCard.Body>
          </JdhCard>

          <JdhCard variant="dashed">
            <JdhCard.Body>
              <JdhCard.Eyebrow>Próximamente</JdhCard.Eyebrow>
              <JdhCard.Title>Sistemas corporativos</JdhCard.Title>
              <JdhCard.Description>
                Este módulo estará disponible en una próxima fase.
              </JdhCard.Description>
            </JdhCard.Body>
          </JdhCard>
        </div>
      </Subsection>

      <Subsection label="Panel de rail · date chip · event item">
        <div className="grid gap-6 sm:grid-cols-2">
          <JdhCard size="sm">
            <JdhCard.Body>
              <JdhCard.Title as="h2" className="text-base font-bold">
                Próximos eventos
              </JdhCard.Title>
              <div className="mt-2 space-y-3">
                <EventItem
                  title="Comité de seguridad"
                  date={new Date(2026, 6, 18)}
                  meta="9:00 a. m. · Sala 3"
                />
                <EventItem
                  title="Capacitación logística"
                  date={new Date(2026, 6, 22)}
                  meta="2:00 p. m. · Auditorio"
                />
              </div>
            </JdhCard.Body>
          </JdhCard>

          <div className="flex items-center gap-4">
            <DateChip date={new Date(2026, 6, 18)} />
            <DateChip date={new Date(2026, 6, 22)} selected />
          </div>
        </div>
      </Subsection>

      <Subsection label="Overlay — imagen al 100%, texto al hover">
        <div className="grid gap-6 sm:grid-cols-3">
          <OverlayCard
            src={PLACEHOLDER}
            alt=""
            size="sm"
            eyebrow="Evento"
            title="Feria de bienestar"
            description="Actividades, salud y recreación para toda la familia JDH."
            badges={<ContentBadge badge="nuevo" overlay />}
            href="/noticias"
          />
          <OverlayCard
            src={PLACEHOLDER}
            alt=""
            size="md"
            eyebrow="Comunicado"
            title="Nueva política de seguridad"
            description="Lectura obligatoria antes del 30 de julio."
            badges={<ContentBadge badge="obligatorio" overlay />}
            href="/sig"
          />
          <OverlayCard
            src={PLACEHOLDER}
            alt=""
            size="lg"
            eyebrow="Campaña"
            title="Distribución sostenible"
            description="Conoce nuestras metas logísticas para el próximo trimestre."
          />
        </div>
      </Subsection>

      <Subsection label="Banner CTA (ink)">
        <CtaBanner
          eyebrow="Módulo relacionado"
          title="¿Necesitas gestionar tus vacaciones?"
          description="Programa y consulta tus días desde el módulo de solicitudes."
        >
          <JdhButton variant="primary-on-ink" size="sm">
            Ir a solicitudes
            <ArrowRight />
          </JdhButton>
        </CtaBanner>
      </Subsection>
    </Section>
  )
}
