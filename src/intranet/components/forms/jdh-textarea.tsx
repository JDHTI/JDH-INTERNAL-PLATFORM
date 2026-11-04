"use client"

import * as React from "react"

import { Textarea } from "@/intranet/components/ui/textarea"
import { cn } from "@/intranet/lib/utils"

import { INVALID_CONTROL_CLASSES, useField } from "./field"

/**
 * Multi-line text input. When inside a `Field`, wires up id / aria-invalid /
 * aria-describedby and the monochrome error border.
 */
export function JdhTextarea({
  className,
  id,
  ...props
}: React.ComponentProps<"textarea">) {
  const field = useField()

  return (
    <Textarea
      id={id ?? field?.id}
      aria-invalid={field?.invalid || undefined}
      aria-describedby={field?.describedBy}
      className={cn(
        "min-h-24",
        field?.invalid && INVALID_CONTROL_CLASSES,
        className
      )}
      {...props}
    />
  )
}
