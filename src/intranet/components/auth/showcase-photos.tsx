"use client"

import * as React from "react"
import Image from "next/image"
import { motion, useReducedMotion } from "motion/react"

const EASE = [0.2, 0, 0, 1] as const // mirrors --ease-standard

/** Seconds a photo holds before crossfading to the next. */
const DWELL = 6
const CROSSFADE = 1.2
/** Ken Burns end scale. Deliberately small — DESIGN.md §1.7: nothing bounces. */
const ZOOM = 1.06

/**
 * `objectPosition` per photo because the three sources have very different
 * aspect ratios (16:9, 4:3 and a 3:4 portrait) and the panel is tall and
 * narrow, so `object-cover` crops each one differently. The values keep the
 * subject — faces, the truck — inside the visible crop.
 */
const PHOTOS = [
  { src: "/photos/equipo.webp", objectPosition: "64% 32%" }, // el equipo en bodega
  { src: "/photos/camion-carretera.webp", objectPosition: "50% 55%" }, // camión en carretera
  { src: "/photos/flota-patio.webp", objectPosition: "50% 45%" }, // flota en patio
] as const

/**
 * Crossfading photo stack behind the sign-in showcase, with a very slow Ken
 * Burns push on whichever photo is showing.
 *
 * All three photos are rendered stacked and driven by an `active` index rather
 * than mounted/unmounted through `AnimatePresence` — with a plain crossfade
 * there's no exit choreography to orchestrate, and keeping them mounted means
 * the next photo is already decoded when its turn comes.
 *
 * The photos are decorative: the panel's message lives in the heading, so they
 * carry `alt=""` (same call as `HomeHero`). Rotating alt text would make the
 * carousel chatter at assistive tech for no gain.
 *
 * Under reduced motion: no timer, no zoom, no crossfade — just the first photo,
 * and the indicators are dropped since there's nothing left to indicate.
 */
export function ShowcasePhotos() {
  const reduce = useReducedMotion()
  const [active, setActive] = React.useState(0)

  // Keyed on `active`, so picking a photo by hand restarts a full dwell
  // instead of inheriting whatever was left of a shared interval.
  React.useEffect(() => {
    if (reduce) return
    const id = setTimeout(
      () => setActive((i) => (i + 1) % PHOTOS.length),
      DWELL * 1000
    )
    return () => clearTimeout(id)
  }, [active, reduce])

  if (reduce) {
    return (
      <div className="absolute inset-0 -z-10">
        <Image
          src={PHOTOS[0].src}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
          style={{ objectPosition: PHOTOS[0].objectPosition }}
        />
        <Scrim />
      </div>
    )
  }

  return (
    <div className="absolute inset-0 -z-10">
      {PHOTOS.map((photo, i) => (
        <motion.div
          key={photo.src}
          className="absolute inset-0"
          initial={false}
          animate={{
            opacity: i === active ? 1 : 0,
            scale: i === active ? ZOOM : 1,
          }}
          transition={{
            opacity: { duration: CROSSFADE, ease: EASE },
            // Spans the whole time the photo is on screen, so the push reads
            // as drift rather than as an animation with a start and a stop.
            scale: { duration: DWELL + CROSSFADE, ease: "linear" },
          }}
        >
          <Image
            src={photo.src}
            alt=""
            fill
            priority={i === 0}
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover"
            style={{ objectPosition: photo.objectPosition }}
          />
        </motion.div>
      ))}

      <Scrim />

      {/* Top-right, opposite the lockup: the panel's copy occupies the whole
          bottom-left, so indicators can't live down there. Touch target is the
          padded button (≥44px per DESIGN.md §1.8); the hairline bar inside is
          just the visual. */}
      <div className="absolute top-0 right-0 flex items-center gap-1 p-4 lg:p-8">
        {PHOTOS.map((photo, i) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Ver foto ${i + 1} de ${PHOTOS.length}`}
            aria-current={i === active}
            className="group cursor-pointer px-1 py-4 outline-none"
          >
            <span
              className={
                i === active
                  ? "block h-0.5 w-8 bg-[var(--color-on-ink)] transition-[width,background-color] duration-300"
                  : "block h-0.5 w-4 bg-[var(--overlay-on-dark-16)] transition-[width,background-color] duration-300 group-hover:bg-[var(--overlay-on-dark-64)] group-focus-visible:bg-[var(--overlay-on-dark-64)]"
              }
            />
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Two-axis ink scrim. The vertical pass is the same ramp `HomeHero`/`OverlayCard`
 * use; the horizontal one is added because this panel sets type along its left
 * edge, and the brightest frame (the truck on the highway) would otherwise not
 * clear AA behind white text.
 */
function Scrim() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)]/85 via-[var(--color-ink)]/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-ink)]/80 via-[var(--color-ink)]/20 to-transparent" />
    </>
  )
}
