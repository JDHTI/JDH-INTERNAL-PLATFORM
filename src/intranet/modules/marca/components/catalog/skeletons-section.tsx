"use client"

import * as React from "react"
import { Skeleton } from "boneyard-js/react"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import { JdhCard } from "@/intranet/components/cards/jdh-card"

import { Section, Subsection } from "./section"

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='210'%3E%3Crect%20width='400'%20height='210'%20fill='%23D9D9D9'/%3E%3C/svg%3E"

function NewsCard() {
  return (
    <JdhCard mediaPosition="top">
      <JdhCard.Media src={PLACEHOLDER} alt="" height="sm" />
      <JdhCard.Body>
        <JdhCard.Eyebrow>Comunicado</JdhCard.Eyebrow>
        <JdhCard.Title>Título de la noticia de ejemplo</JdhCard.Title>
        <JdhCard.Description>
          Descripción breve de la noticia utilizada para capturar el esqueleto.
        </JdhCard.Description>
        <JdhCard.Meta>12 jul · 3 min de lectura</JdhCard.Meta>
      </JdhCard.Body>
    </JdhCard>
  )
}

/**
 * Hand-authored fallback shown while boneyard has no captured bones yet (before
 * the first `npx boneyard-js build`). Once bones exist, boneyard renders the
 * pixel-perfect skeleton from the captured layout instead of this.
 */
function NewsCardFallback() {
  return (
    <div className="overflow-hidden rounded-[var(--jdh-radius-md)] border border-border">
      <div className="h-[132px] w-full animate-pulse bg-muted" />
      <div className="space-y-3 p-6">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

/**
 * Demonstrates the boneyard integration. `fixture` is what `npx boneyard-js
 * build` snapshots; `fallback` shows until bones are captured; `children` is
 * the real content when not loading. This page
 * (`/marca/design-system/componentes`) is the capture target configured in
 * `boneyard.config.json`.
 */
export function SkeletonsSection() {
  const [loading, setLoading] = React.useState(true)

  return (
    <Section
      title="Skeletons (boneyard)"
      description="Skeletons dinámicos por componente. Ejecuta el servidor de desarrollo y luego `npx boneyard-js build` para capturar los huesos reales desde esta página."
    >
      <Subsection label="card.news — alterna carga / contenido">
        <JdhButton
          variant="secondary"
          size="sm"
          onClick={() => setLoading((value) => !value)}
        >
          {loading ? "Mostrar contenido" : "Mostrar skeleton"}
        </JdhButton>

        <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton
              key={index}
              name="card.news"
              loading={loading}
              fixture={<NewsCard />}
              fallback={<NewsCardFallback />}
            >
              <NewsCard />
            </Skeleton>
          ))}
        </div>
      </Subsection>
    </Section>
  )
}
