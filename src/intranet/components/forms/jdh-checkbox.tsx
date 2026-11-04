"use client"

import * as React from "react"

import { Checkbox } from "@/intranet/components/ui/checkbox"
import { Label } from "@/intranet/components/ui/label"
import { cn } from "@/intranet/lib/utils"

export interface JdhCheckboxProps extends React.ComponentProps<
  typeof Checkbox
> {
  label: string
  description?: string
}

/**
 * Checkbox with a side label (and optional description). Row padding keeps the
 * touch target ≥44px (DESIGN.md §4.5). The box fills ink when checked.
 */
export function JdhCheckbox({
  label,
  description,
  id,
  className,
  ...props
}: JdhCheckboxProps) {
  const generatedId = React.useId()
  const checkboxId = id ?? generatedId

  return (
    <div className="flex items-start gap-3 py-1.5">
      <Checkbox
        id={checkboxId}
        className={cn("mt-0.5", className)}
        {...props}
      />
      <div className="grid gap-0.5 leading-none">
        <Label htmlFor={checkboxId}>{label}</Label>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  )
}
