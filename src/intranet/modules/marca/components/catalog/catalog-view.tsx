import { AlertsSection } from "./alerts-section"
import { AnnouncementSection } from "./announcement-section"
import { BrandSection } from "./brand-section"
import { ButtonsSection } from "./buttons-section"
import { CardsSection } from "./cards-section"
import { ContentBadgesSection } from "./content-badges-section"
import { DataTableSection } from "./data-table-section"
import { DisplaySection } from "./display-section"
import { FeedbackSection } from "./feedback-section"
import { FormsSection } from "./forms-section"
import { IconsSection } from "./icons-section"
import { ModalsSection } from "./modals-section"
import { MotionSection } from "./motion-section"
import { SectionHeadersSection } from "./section-headers-section"
import { SkeletonsSection } from "./skeletons-section"

/**
 * Referencia viva del sistema de diseño: cada componente compartido renderizado
 * dentro del shell real de la intranet, con su chrome auténtico (y por tanto
 * capturable por boneyard).
 *
 * Antes vivía en `/catalogo-ui` con un guard dev-only. Ahora es contenido de
 * intranet: los colaboradores que producen piezas o revisan interfaces lo
 * necesitan en producción tanto como el manual de marca.
 */
export function CatalogView() {
  return (
    <div className="space-y-16">
      <BrandSection />
      <SectionHeadersSection />
      <ButtonsSection />
      <FormsSection />
      <CardsSection />
      <ContentBadgesSection />
      <DisplaySection />
      <DataTableSection />
      <AlertsSection />
      <AnnouncementSection />
      <ModalsSection />
      <IconsSection />
      <FeedbackSection />
      <SkeletonsSection />
      <MotionSection />
    </div>
  )
}
