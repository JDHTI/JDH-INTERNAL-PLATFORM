"use client"

import * as React from "react"
import Lenis from "lenis"

/**
 * Global smooth scrolling (Lenis). Uses native document scroll, so the sticky
 * header keeps working. Disabled entirely under prefers-reduced-motion (the CSS
 * media query can't stop a JS rAF loop, so we skip instantiation). Scrollable
 * regions that shouldn't be hijacked carry `data-lenis-prevent`; horizontal
 * carousels carry `data-lenis-prevent-horizontal` so vertical wheel over them
 * still scrolls the page smoothly (see globals.css).
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return
    }

    const lenis = new Lenis({ anchors: true })
    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
