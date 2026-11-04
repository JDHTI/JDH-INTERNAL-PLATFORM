"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"

const EASE = [0.2, 0, 0, 1] as const

/**
 * Reveals its children when scrolled into view. Passthrough under reduced
 * motion. Works with Lenis (native scroll) and native scroll alike.
 */
export function ScrollReveal({
  once = true,
  y = 16,
  amount = 0.2,
  className,
  children,
}: {
  once?: boolean
  y?: number
  amount?: number
  className?: string
  children: React.ReactNode
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
