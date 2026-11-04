"use client"

import { useState, useTransition } from "react"
import { CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

import { JdhButton } from "@/intranet/components/common/jdh-button"

import { confirmarLectura } from "../server/actions"

/**
 * Bloque de confirmación de lectura (§4 del diseño) — solo se renderiza para
 * comunicados `mandatory`. Mock: `confirmarLectura` no persiste todavía, así
 * que el estado "confirmado" vive únicamente en este componente.
 */
export function ReadConfirmation({
  slug,
  deadlineLabel,
}: {
  slug: string
  deadlineLabel: string
}) {
  const [confirmed, setConfirmed] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await confirmarLectura(slug)
      setConfirmed(true)
      toast.success("Lectura confirmada")
    })
  }

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-6 rounded-[var(--jdh-radius-md)] border-2 border-foreground p-6">
      <div>
        <p className="text-lg font-bold">{deadlineLabel}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Se requiere para mantener tus accesos activos.
        </p>
      </div>
      {confirmed ? (
        <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-foreground">
          <CheckCircle2 className="size-4" />
          Lectura confirmada
        </span>
      ) : (
        <JdhButton
          size="lg"
          loading={isPending}
          onClick={handleConfirm}
          className="shrink-0"
        >
          Confirmar lectura
        </JdhButton>
      )}
    </div>
  )
}
