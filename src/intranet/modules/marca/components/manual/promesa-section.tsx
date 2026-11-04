import { brandCopy } from "../../content"
import { Quote, SectionBlock, SubBlock } from "../section-block"

/**
 * Promesa de marca (manual P3) y storytelling (manual P5): los dos textos que
 * definen qué prometemos y cómo lo contamos.
 */
export function PromesaSection() {
  return (
    <SectionBlock
      id="promesa"
      eyebrow="Qué prometemos"
      title="Promesa de marca y storytelling"
    >
      <div className="grid gap-10 md:grid-cols-2">
        <SubBlock label="Promesa de marca">
          <Quote cite="Manual de Marca, P3">{brandCopy.promesa}</Quote>
        </SubBlock>

        <SubBlock label="Storytelling">
          <Quote cite="Manual de Marca, P5">{brandCopy.storytelling}</Quote>
        </SubBlock>
      </div>
    </SectionBlock>
  )
}
