"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"

const EASE = [0.2, 0, 0, 1] as const // mirrors --ease-standard

/** Fade + rise on mount. Passthrough (no animation) under reduced motion. */
export function FadeIn({
  delay = 0,
  y = 12,
  className,
  children,
}: {
  delay?: number
  y?: number
  className?: string
  children: React.ReactNode
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}
