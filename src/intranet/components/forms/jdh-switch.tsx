"use client"

import * as React from "react"

import { Label } from "@/intranet/components/ui/label"
import { Switch } from "@/intranet/components/ui/switch"

export interface JdhSwitchProps extends React.ComponentProps<typeof Switch> {
  label: string
  description?: string
}

/**
 * Switch with a label (and optional description) on the left, control on the
 * right. Row padding keeps the touch target ≥44px. Fills ink when on.
 */
export function JdhSwitch({
  label,
  description,
  id,
  ...props
}: JdhSwitchProps) {
  const generatedId = React.useId()
  const switchId = id ?? generatedId

  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div className="grid gap-0.5 leading-none">
        <Label htmlFor={switchId}>{label}</Label>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch id={switchId} {...props} />
    </div>
  )
}
