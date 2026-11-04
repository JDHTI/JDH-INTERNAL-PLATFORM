"use client"

import * as React from "react"

import { Label } from "@/intranet/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/intranet/components/ui/radio-group"
import { cn } from "@/intranet/lib/utils"

import { useField } from "./field"

export interface JdhRadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface JdhRadioGroupProps {
  options: JdhRadioOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  disabled?: boolean
  className?: string
}

/**
 * Radio group with per-option labels/descriptions. When inside a `Field`, the
 * group's label and error text come from the Field; each item's touch row is
 * padded for a ≥44px target. Selected dot fills ink.
 */
export function JdhRadioGroup({
  options,
  className,
  ...props
}: JdhRadioGroupProps) {
  const field = useField()
  const baseId = React.useId()

  return (
    <RadioGroup
      aria-invalid={field?.invalid || undefined}
      aria-describedby={field?.describedBy}
      className={cn("gap-3", className)}
      {...props}
    >
      {options.map((option, index) => {
        const itemId = `${baseId}-${index}`

        return (
          <div key={option.value} className="flex items-start gap-3 py-1">
            <RadioGroupItem
              id={itemId}
              value={option.value}
              disabled={option.disabled}
              className="mt-0.5"
            />
            <div className="grid gap-0.5 leading-none">
              <Label htmlFor={itemId}>{option.label}</Label>
              {option.description ? (
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              ) : null}
            </div>
          </div>
        )
      })}
    </RadioGroup>
  )
}
