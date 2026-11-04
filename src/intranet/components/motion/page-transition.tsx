"use client"

import * as React from "react"
import { motion, useReducedMotion } from "motion/react"

const EASE = [0.2, 0, 0, 1] as const

/**
 * Page enter animation (fade + slight rise). Mounted from the route groups'
 * `template.tsx`, which Next remounts on every navigation — that remount is
 * what replays the animation, while the surrounding layout (header, nav,
 * footer) stays put. Passthrough under reduced motion.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion()
  if (reduce) return <>{children}</>

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
