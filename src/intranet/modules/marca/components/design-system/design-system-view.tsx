import { ArrowRight, ExternalLink, FileText } from "lucide-react"

import { ContentBadge } from "@/intranet/components/common/content-badge"
import { FadeIn } from "@/intranet/components/motion/fade-in"
import { brandConfig } from "@/intranet/config/brand.config"

import { BrandDownloads, type BrandResource } from "../downloads-card"
import { SectionBlock } from "../section-block"
import { AntiPatronesSection } from "./anti-patrones-section"
import { PrincipiosSection } from "./principios-section"
import { TokensSection } from "./tokens-section"

const RESOURCES: BrandResource[] = [
  {
    icon: FileText,
    title: "DESIGN.md",
    description:
      "El documento completo: tokens, specs de cada componente compartido y checklist de validación.",
    meta: "Markdown",
    href: brandConfig.designMd,
    kind: "download",
  },
  {
    icon: ExternalLink,
    title: "Knowledge vault de marca",
    description:
      "El sistema de diseño en el vault, incluida la parte específica de presentaciones que no aplica a web.",
    meta: "Repositorio externo",
    href: brandConfig.vaultUrl,
    kind: "external",
  },
  {
    icon: ArrowRight,
    title: "Catálogo de componentes",
    description:
      "Cada componente compartido renderizado en vivo, con sus variantes y estados.",
    href: "/marca/design-system/componentes",
    kind: "internal",
    cta: "Ver catálogo",
  },
]

/**
 * Fundamentos del design system (`/marca/design-system`): qué es, los ocho
 * principios, los tokens en vivo y los anti-patrones.
 */
export function DesignSystemView() {
  return (
    <div className="space-y-16">
      <FadeIn>
        <section className="space-y-4 border-b border-border pb-10">
          <ContentBadge badge="derivado" />
          <p className="max-w-3xl text-lg leading-relaxed text-balance">
            El design system traduce la identidad de JDH a la pantalla: define
            los tokens, los componentes compartidos y las reglas de
            accesibilidad con los que se construye cualquier web o aplicación de
            la compañía.
          </p>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Su alcance es{" "}
            <strong className="font-medium text-foreground">web</strong>: el
            manual de marca gobierna la identidad, y este documento decide cómo
            se aplica en interfaz. Donde ambos se solapan (color, tipografía),
            manda el manual; donde el manual no llega (estados de foco, escalas
            de espacio, movimiento), manda el design system.
          </p>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Estado honesto: es un estándar derivado, definido en la sesión de
            consolidación del 2026-07-16. La colorimetría sale de los neutrales
            oficiales de marca; la arquitectura de tokens y las specs siguen
            estándares públicos de la industria. Queda pendiente la ratificación
            formal del área de marca — no bloqueante.
          </p>
        </section>
      </FadeIn>

      <PrincipiosSection />
      <TokensSection />
      <AntiPatronesSection />

      <SectionBlock
        id="recursos"
        eyebrow="Descargas"
        title="Recursos"
        description="La copia de DESIGN.md se regenera desde la fuente en cada build, así que siempre coincide con lo que rige el código."
      >
        <BrandDownloads resources={RESOURCES} />
      </SectionBlock>
    </div>
  )
}
