import { JdhCard } from "@/intranet/components/cards/jdh-card"
import { Stagger, StaggerItem } from "@/intranet/components/motion/stagger"

import { comunicacionCanales, fotografiaCategorias } from "../../content"
import { SectionBlock, SubBlock } from "../section-block"

/**
 * Comunicación externa/interna y estilo fotográfico.
 *
 * Las categorías de fotografía se describen en texto: el media kit con las
 * imágenes de referencia vive fuera de este repositorio, así que mostrar
 * ejemplos genéricos sería peor que no mostrarlos.
 */
export function ComunicacionSection() {
  return (
    <SectionBlock
      id="comunicacion"
      eyebrow="Aplicación"
      title="Comunicación"
      description="Ambos frentes comparten el mismo tono: entusiasmo, claridad, humanidad y compromiso."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {comunicacionCanales.map((canal) => (
          <JdhCard key={canal.title} className="h-full">
            <JdhCard.Body>
              <JdhCard.Title as="h3">{canal.title}</JdhCard.Title>
              <JdhCard.Description>{canal.description}</JdhCard.Description>
            </JdhCard.Body>
          </JdhCard>
        ))}
      </div>

      <SubBlock label="Estilo fotográfico">
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          «Se usa un estilo fotográfico para generar una mayor sensación de
          cercanía y familiaridad, acorde con nuestro tono comunicacional.» Las
          cuatro categorías siguientes se infieren de piezas reales, no de una
          guía escrita: son un patrón observado, no una regla ratificada.
        </p>
        <Stagger className="grid gap-4 sm:grid-cols-2">
          {fotografiaCategorias.map((categoria) => (
            <StaggerItem key={categoria.title} className="h-full">
              <JdhCard size="sm" variant="dashed" className="h-full">
                <JdhCard.Body>
                  <JdhCard.Title as="h4" className="text-sm">
                    {categoria.title}
                  </JdhCard.Title>
                  <JdhCard.Description>
                    {categoria.description}
                  </JdhCard.Description>
                </JdhCard.Body>
              </JdhCard>
            </StaggerItem>
          ))}
        </Stagger>
        <p className="text-xs text-muted-foreground">
          Patrón transversal: fotografía base + headline corto en bold
          superpuesto, en alto contraste con el fondo.
        </p>
      </SubBlock>
    </SectionBlock>
  )
}
