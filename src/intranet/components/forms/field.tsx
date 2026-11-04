"use client"

import * as React from "react"
import { CircleAlert } from "lucide-react"

import { InfoTooltip } from "@/intranet/components/common/info-tooltip"
import { Label } from "@/intranet/components/ui/label"
import { cn } from "@/intranet/lib/utils"

interface FieldContextValue {
  id: string
  invalid: boolean
  describedBy?: string
}

const FieldContext = React.createContext<FieldContextValue | null>(null)

/** Read the enclosing `Field`'s id / invalid / aria-describedby. */
export function useField(): FieldContextValue | null {
  return React.useContext(FieldContext)
}

/**
 * Monochrome error treatment for text-like controls (DESIGN.md §4.5): a 2px
 * foreground border, no colored ring — overrides shadcn's destructive
 * aria-invalid styling in both themes. Error meaning is carried by the visible
 * error text + icon rendered by `Field`, never by color alone.
 */
export const INVALID_CONTROL_CLASSES =
  "border-2 border-foreground aria-invalid:border-foreground aria-invalid:ring-0 dark:aria-invalid:border-foreground dark:aria-invalid:ring-0"

export interface FieldProps {
  label: string
  hint?: string
  /** Aclaración puntual mostrada como un chip (i) junto al label, con tooltip — en vez de texto suelto bajo el control (ver `hint`). */
  tooltip?: string
  error?: string
  required?: boolean
  /** Provide to control the id; otherwise one is generated. */
  id?: string
  className?: string
  children: React.ReactNode
}

/**
 * Vertical form field (label on top) for input/textarea/select. Provides id,
 * invalid state, and aria-describedby to the control via context, and renders
 * the label, hint, and error text. Checkbox/radio/switch lay their label out
 * beside the control themselves and don't need this wrapper.
 */
export function Field({
  label,
  hint,
  tooltip,
  error,
  required,
  id: idProp,
  className,
  children,
}: FieldProps) {
  const generatedId = React.useId()
  const id = idProp ?? generatedId
  const invalid = Boolean(error)
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined

  return (
    <FieldContext.Provider value={{ id, invalid, describedBy }}>
      <div className={cn("group/field flex flex-col gap-2", className)}>
        <div className="flex items-center gap-1.5">
          <Label htmlFor={id}>
            {label}
            {required ? (
              <span aria-hidden className="text-muted-foreground">
                *
              </span>
            ) : null}
          </Label>
          {tooltip ? <InfoTooltip text={tooltip} /> : null}
        </div>

        {children}

        {hint && !error ? (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        ) : null}

        {error ? (
          <p
            id={errorId}
            className="flex items-center gap-1.5 text-sm font-medium text-foreground"
          >
            <CircleAlert className="size-4 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}
