"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"

const EASE = [0.2, 0, 0, 1] as const // mirrors --ease-standard

type WordRevealTag = "h1" | "h2" | "h3" | "p" | "span"

/**
 * Reveals a phrase word by word, each word rising out from behind a mask.
 * The gesture used by Apple/Stripe/Linear for headlines: legible, calm, and
 * only animating `transform`/`opacity` as DESIGN.md §2.8 requires.
 *
 * Accessibility: the animated words are `aria-hidden` and the full phrase is
 * duplicated in an `sr-only` span, so assistive tech announces one sentence
 * instead of a stream of words. That's done with a real text node rather than
 * `aria-label` because `aria-label` on a roleless element (`span`) isn't
 * reliably announced — this works for every tag the component accepts.
 *
 * Passthrough (plain text, no spans) under reduced motion.
 */
export function WordReveal({
  text,
  as: Tag = "span",
  delay = 0,
  stagger = 0.07,
  duration = 0.6,
  className,
}: {
  text: string
  as?: WordRevealTag
  /** Seconds before the first word starts. */
  delay?: number
  /** Seconds between consecutive words. */
  stagger?: number
  duration?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <Tag className={className}>{text}</Tag>

  const words = text.split(" ")

  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <React.Fragment key={`${word}-${i}`}>
            {/* The mask. `pb`/`-mb` keep descenders (j, p, g) from being
                clipped by `overflow-hidden` without shifting the baseline. */}
            <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
              <motion.span
                className="inline-block"
                initial={{ y: "110%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration,
                  ease: EASE,
                  delay: delay + i * stagger,
                }}
              >
                {word}
              </motion.span>
            </span>
            {/* Real space between words so the phrase still wraps naturally. */}
            {i < words.length - 1 ? " " : null}
          </React.Fragment>
        ))}
      </span>
    </Tag>
  )
}
