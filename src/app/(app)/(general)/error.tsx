"use client"

import { CloudOff } from "lucide-react"

import { EmptyState } from "@/intranet/components/common/empty-state"
import { JdhButton } from "@/intranet/components/common/jdh-button"

/** A page of the general view failed to render (usually the API not answering). */
export default function GeneralError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      icon={CloudOff}
      title="No pudimos cargar esta página"
      description="El servicio de la intranet no respondió. Intenta de nuevo en unos segundos; si sigue fallando, avísale a TI."
    >
      <JdhButton variant="secondary" onClick={() => reset()}>
        Reintentar
      </JdhButton>
    </EmptyState>
  )
}
