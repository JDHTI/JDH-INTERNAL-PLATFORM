import { ArrowRight, ExternalLink, FileDown } from "lucide-react"

import { brandConfig } from "@/intranet/config/brand.config"

import { BrandDownloads, type BrandResource } from "../downloads-card"
import { SectionBlock } from "../section-block"
import { ColoresSection } from "./colores-section"
import { ComunicacionSection } from "./comunicacion-section"
import { HeroMarca } from "./hero-marca"
import { HistoriaSection } from "./historia-section"
import { LogoSection } from "./logo-section"
import { MisionVisionSection } from "./mision-vision-section"
import { PromesaSection } from "./promesa-section"
import { TipografiaSection } from "./tipografia-section"
import { TonoVozSection } from "./tono-voz-section"
import { ValoresSection } from "./valores-section"

const RESOURCES: BrandResource[] = [
  {
    icon: FileDown,
    title: "Manual de Imagen JDH 2026",
    description:
      "El documento maestro completo, con los diagramas y ejemplos visuales que esta página resume.",
    meta: `PDF · ${brandConfig.manualPdfSize}`,
    href: brandConfig.manualPdf,
    kind: "download",
  },
  {
    icon: ExternalLink,
    title: "Knowledge vault de marca",
    description:
      "Las notas fuente de las que se transcribió este contenido, con su estado documental y trazabilidad.",
    meta: "Repositorio externo",
    href: brandConfig.vaultUrl,
    kind: "external",
  },
  {
    icon: ArrowRight,
    title: "Design system web",
    description:
      "Cómo se traduce esta identidad a la interfaz: tokens, principios y componentes.",
    href: "/marca/design-system",
    kind: "internal",
    cta: "Ver design system",
  },
]

/**
 * Vista del Manual de marca (`/marca`). Compone las secciones en el orden en
 * que el manual las presenta: primero quiénes somos, luego cómo hablamos, y al
 * final cómo nos vemos.
 */
export function ManualMarcaView() {
  return (
    <div className="space-y-16">
      <HeroMarca />
      <HistoriaSection />
      <MisionVisionSection />
      <PromesaSection />
      <ValoresSection />
      <TonoVozSection />
      <LogoSection />
      <ColoresSection />
      <TipografiaSection />
      <ComunicacionSection />

      <SectionBlock
        id="recursos"
        eyebrow="Descargas"
        title="Recursos"
        description="Esta página es un resumen navegable. Para producción (impresión, piezas gráficas, co-branding), el PDF sigue siendo el documento de referencia."
      >
        <BrandDownloads resources={RESOURCES} />
      </SectionBlock>
    </div>
  )
}
