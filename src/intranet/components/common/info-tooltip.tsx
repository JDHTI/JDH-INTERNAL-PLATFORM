"use client"

import { Info } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/intranet/components/ui/tooltip"

/**
 * Chip de información (i) — reemplaza el texto de ayuda suelto bajo un campo
 * cuando ese texto es más una aclaración puntual que una instrucción
 * permanente. `type="button"` es obligatorio: sin él, dentro de un
 * `<form>` (como `FormModal`) el botón heredaría `type="submit"` y un click
 * enviaría el formulario en vez de abrir el tooltip.
 */
export function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={text}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}
