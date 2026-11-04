"use client"

import * as React from "react"

import { Input } from "@/intranet/components/ui/input"
import { cn } from "@/intranet/lib/utils"

import { INVALID_CONTROL_CLASSES, useField } from "./field"

/**
 * Text input at DESIGN.md §4.5 height (40px). When inside a `Field`, wires up
 * id / aria-invalid / aria-describedby and the monochrome error border.
 */
export function JdhInput({
  className,
  id,
  ...props
}: React.ComponentProps<"input">) {
  const field = useField()

  return (
    <Input
      id={id ?? field?.id}
      aria-invalid={field?.invalid || undefined}
      aria-describedby={field?.describedBy}
      className={cn(
        "h-10",
        field?.invalid && INVALID_CONTROL_CLASSES,
        className
      )}
      {...props}
    />
  )
}
