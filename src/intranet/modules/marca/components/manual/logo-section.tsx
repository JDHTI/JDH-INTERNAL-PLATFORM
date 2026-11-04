import { Ban } from "lucide-react"

import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { Logo, type LogoVariant } from "@/intranet/components/common/logo"
import { Stagger, StaggerItem } from "@/intranet/components/motion/stagger"

import {
  brandCopy,
  logoPillars,
  logoVersiones,
  usosIncorrectos,
} from "../../content"
import { SectionBlock, SubBlock } from "../section-block"

const VARIANTS: { variant: LogoVariant; label: string }[] = [
  { variant: "full", label: "Logotipo general" },
  { variant: "text", label: "Wordmark" },
  { variant: "mark", label: "Isotipo" },
  { variant: "compact", label: "Compacto" },
]

/**
 * Los paneles de logo usan tokens **paper** / **ink** fijos (no semánticos): un
 * logo negro necesita fondo blanco y uno blanco fondo negro en ambos temas. En
 * oscuro el panel ink lleva borde para no fundirse con el fondo.
 */
function LogoPanel({ tone }: { tone: "black" | "white" }) {
  const onPaper = tone === "black"

  return (
    <div
      className={
        onPaper
          ? "grid grid-cols-2 gap-8 rounded-[var(--jdh-radius-md)] border border-[var(--color-paper-border)] bg-[var(--color-paper)] p-8 sm:grid-cols-4"
          : "grid grid-cols-2 gap-8 rounded-[var(--jdh-radius-md)] border border-[var(--color-ink-border)] bg-[var(--color-ink)] p-8 sm:grid-cols-4"
      }
    >
      {VARIANTS.map(({ variant, label }) => (
        <div key={variant} className="flex flex-col items-center gap-3">
          <div className="flex h-12 items-center">
            <Logo
              variant={variant}
              tone={tone}
              height={variant === "mark" ? 40 : 28}
            />
          </div>
          <span
            className={
              onPaper
                ? "text-center font-mono text-[10px] tracking-[0.08em] text-[var(--color-on-paper-muted)] uppercase"
                : "text-center font-mono text-[10px] tracking-[0.08em] text-[var(--color-on-ink-muted)] uppercase"
            }
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * Diagrama del área segura. Es una reconstrucción en CSS del diagrama del
 * manual (P11-12): bandas discontinuas arriba y abajo equivalentes a 1× la
 * altura de la «J» del wordmark. Es proporcional por diseño — no hay un valor
 * en px que reproducir.
 */
function AreaSeguraDiagram() {
  return (
    <div className="rounded-[var(--jdh-radius-md)] border border-[var(--color-paper-border)] bg-[var(--color-paper)] p-8">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <div className="flex h-7 w-full items-center justify-center border-x border-t border-dashed border-[var(--neutral-300)]">
          <span className="font-mono text-[10px] tracking-[0.08em] text-[var(--color-on-paper-muted)] uppercase">
            1× altura de la J
          </span>
        </div>

        <div className="flex w-full items-center justify-center border-x border-dashed border-[var(--neutral-300)] px-6 py-4">
          <Logo variant="lockup" tone="black" height={40} />
        </div>

        <div className="flex h-7 w-full items-center justify-center border-x border-b border-dashed border-[var(--neutral-300)]">
          <span className="font-mono text-[10px] tracking-[0.08em] text-[var(--color-on-paper-muted)] uppercase">
            1× altura de la J
          </span>
        </div>
      </div>
    </div>
  )
}

export function LogoSection() {
  return (
    <SectionBlock
      id="logo"
      eyebrow="Identidad visual"
      title="El isologo"
      description="El logo es el elemento más importante de la marca: su integridad visual no se negocia."
    >
      <SubBlock label="Concepto — el rombo">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          El logo se desarrolla sobre tres pilares de valor, plasmados en tres
          de los cuatro vértices del rombo. El cuarto vértice es una flecha.
        </p>
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {logoPillars.map((pilar) => (
            <StaggerItem key={pilar.title} className="h-full">
              <JdhCard size="sm" className="h-full">
                <JdhCard.Body>
                  <JdhCard.Title as="h4" className="text-sm">
                    {pilar.title}
                  </JdhCard.Title>
                  <JdhCard.Description>{pilar.meaning}</JdhCard.Description>
                </JdhCard.Body>
              </JdhCard>
            </StaggerItem>
          ))}
        </Stagger>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {brandCopy.metaforaUrbana}
        </p>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          El manual lo llama{" "}
          <strong className="font-medium text-foreground">isologo</strong>:
          símbolo y texto son una unidad fusionada, nunca separable.
        </p>
      </SubBlock>

      <SubBlock label="Versiones de aplicación">
        <div className="grid gap-4 md:grid-cols-2">
          {logoVersiones.map((version) => (
            <div key={version.title} className="space-y-1">
              <h4 className="text-sm font-medium">{version.title}</h4>
              <p className="text-sm text-muted-foreground">
                {version.description}
              </p>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <LogoPanel tone="black" />
          <LogoPanel tone="white" />
        </div>
        <p className="text-xs text-muted-foreground">
          Las versiones en escala de grises y sobre fotografía se documentan en
          el PDF del manual (P9-10); no hay assets web para ellas.
        </p>
      </SubBlock>

      <SubBlock label="Área segura">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          El área de respeto garantiza que ningún elemento interfiera con el
          logo. El manual la define de forma proporcional: el margen mínimo
          arriba y abajo equivale a 1× la altura de la «J» del wordmark, así que
          escala correctamente a cualquier tamaño de reproducción.
        </p>
        <AreaSeguraDiagram />
        <p className="text-xs text-muted-foreground">
          La protección lateral (izquierda y derecha) no está confirmada en el
          manual: el diagrama original solo marca arriba y abajo.
        </p>
      </SubBlock>

      <SubBlock label="Usos incorrectos">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {brandCopy.usosIncorrectosIntro}
        </p>
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {usosIncorrectos.map((uso) => (
            <StaggerItem key={uso.title} className="h-full">
              <JdhCard size="sm" className="h-full">
                <JdhCard.Body>
                  <div className="flex items-start gap-3">
                    <Ban
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    />
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">{uso.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {uso.description}
                      </p>
                    </div>
                  </div>
                </JdhCard.Body>
              </JdhCard>
            </StaggerItem>
          ))}
        </Stagger>
      </SubBlock>
    </SectionBlock>
  )
}
