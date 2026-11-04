"use client"

import * as React from "react"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import { Field } from "@/intranet/components/forms/field"
import { JdhCheckbox } from "@/intranet/components/forms/jdh-checkbox"
import { JdhDatePicker } from "@/intranet/components/forms/jdh-date-picker"
import { JdhInput } from "@/intranet/components/forms/jdh-input"
import { JdhRadioGroup } from "@/intranet/components/forms/jdh-radio-group"
import { JdhSelect, type JdhSelectOption } from "@/intranet/components/forms/jdh-select"
import { JdhSwitch } from "@/intranet/components/forms/jdh-switch"
import { JdhTextarea } from "@/intranet/components/forms/jdh-textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/intranet/components/ui/dialog"
import { ScrollArea } from "@/intranet/components/ui/scroll-area"
import { cn } from "@/intranet/lib/utils"

export type FormModalValues = Record<string, string | boolean>

type TextLikeType = "text" | "email" | "password" | "number"

export type FieldConfig =
  | {
      type: TextLikeType
      name: string
      label: string
      placeholder?: string
      hint?: string
      /** Chip (i) con tooltip junto al label — alternativa a `hint` para una aclaración puntual. */
      tooltip?: string
      required?: boolean
      defaultValue?: string
      disabled?: boolean
      /** Ocupa las dos columnas cuando `FormModal` usa `columns={2}` — sin efecto en `columns={1}`. */
      fullWidth?: boolean
      validate?: (value: string, values: FormModalValues) => string | undefined
    }
  | {
      type: "textarea"
      name: string
      label: string
      placeholder?: string
      hint?: string
      tooltip?: string
      required?: boolean
      rows?: number
      defaultValue?: string
      disabled?: boolean
      fullWidth?: boolean
      validate?: (value: string, values: FormModalValues) => string | undefined
    }
  | {
      type: "select"
      name: string
      label: string
      options: JdhSelectOption[]
      placeholder?: string
      hint?: string
      tooltip?: string
      required?: boolean
      defaultValue?: string
      disabled?: boolean
      fullWidth?: boolean
    }
  | {
      type: "date"
      name: string
      label: string
      hint?: string
      tooltip?: string
      required?: boolean
      /** ISO `YYYY-MM-DD`. */
      defaultValue?: string
      /** ISO inclusive bounds — ver `JdhDatePicker`. */
      min?: string
      max?: string
      disabled?: boolean
      fullWidth?: boolean
    }
  | {
      type: "radio"
      name: string
      label: string
      options: { value: string; label: string; description?: string }[]
      hint?: string
      tooltip?: string
      required?: boolean
      defaultValue?: string
      disabled?: boolean
      fullWidth?: boolean
    }
  | {
      type: "checkbox"
      name: string
      label: string
      description?: string
      defaultChecked?: boolean
      disabled?: boolean
      fullWidth?: boolean
    }
  | {
      type: "switch"
      name: string
      label: string
      description?: string
      defaultChecked?: boolean
      disabled?: boolean
      fullWidth?: boolean
    }

export interface FormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  fields: FieldConfig[]
  onSubmit: (values: FormModalValues) => void | Promise<void>
  submitLabel?: string
  cancelLabel?: string
  size?: "sm" | "md" | "lg" | "xl"
  /**
   * Cuántas columnas usa la grilla de campos (`1` por defecto — apilados,
   * como hasta ahora). `2` dispone los campos en dos columnas para formularios
   * largos que de otro modo se cortan verticalmente contra la altura del
   * viewport; un campo puede pedir `fullWidth` para ocupar ambas columnas.
   */
  columns?: 1 | 2
}

const sizeClass = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-3xl",
} as const

/**
 * Dynamic form modal — renders a form from a `FieldConfig[]` and reports values
 * on submit. Validation is per-field (`required` + optional `validate`); errors
 * surface through `Field`. Async `onSubmit` drives the submit button's loading
 * state and closes on success. Form state resets each time the modal opens
 * (radix unmounts the content when closed).
 */
export function FormModal({
  open,
  onOpenChange,
  title,
  description,
  fields,
  onSubmit,
  submitLabel = "Guardar",
  cancelLabel = "Cancelar",
  size = "md",
  columns = 1,
}: FormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(sizeClass[size], "flex max-h-[85vh] flex-col")}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <FormBody
          fields={fields}
          columns={columns}
          onSubmit={onSubmit}
          onOpenChange={onOpenChange}
          submitLabel={submitLabel}
          cancelLabel={cancelLabel}
        />
      </DialogContent>
    </Dialog>
  )
}

function initialValues(fields: FieldConfig[]): FormModalValues {
  const values: FormModalValues = {}
  for (const field of fields) {
    if (field.type === "checkbox" || field.type === "switch") {
      values[field.name] = field.defaultChecked ?? false
    } else {
      values[field.name] = field.defaultValue ?? ""
    }
  }
  return values
}

function FormBody({
  fields,
  columns,
  onSubmit,
  onOpenChange,
  submitLabel,
  cancelLabel,
}: {
  fields: FieldConfig[]
  columns: 1 | 2
  onSubmit: (values: FormModalValues) => void | Promise<void>
  onOpenChange: (open: boolean) => void
  submitLabel: string
  cancelLabel: string
}) {
  const [values, setValues] = React.useState<FormModalValues>(() =>
    initialValues(fields)
  )
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [pending, setPending] = React.useState(false)

  const setValue = (name: string, value: string | boolean) =>
    setValues((current) => ({ ...current, [name]: value }))

  const validate = () => {
    const next: Record<string, string> = {}
    for (const field of fields) {
      if (field.type === "checkbox" || field.type === "switch") continue
      if (field.disabled) continue
      const value = String(values[field.name] ?? "")
      if (field.required && !value.trim()) {
        next[field.name] = "Este campo es obligatorio."
        continue
      }
      if ("validate" in field && field.validate) {
        const message = field.validate(value, values)
        if (message) next[field.name] = message
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    try {
      setPending(true)
      await onSubmit(values)
      onOpenChange(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col gap-4"
      noValidate
    >
      <ScrollArea className="min-h-0 flex-1">
        <div
          className={cn(
            "px-1 py-1 pr-4",
            columns === 2
              ? "grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2"
              : "space-y-4"
          )}
        >
          {fields.map((field) => (
            <div
              key={field.name}
              className={field.fullWidth ? "sm:col-span-2" : undefined}
            >
              <FieldRenderer
                field={field}
                values={values}
                setValue={setValue}
                error={errors[field.name]}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
      <DialogFooter>
        <JdhButton
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
        >
          {cancelLabel}
        </JdhButton>
        <JdhButton type="submit" loading={pending}>
          {submitLabel}
        </JdhButton>
      </DialogFooter>
    </form>
  )
}

function FieldRenderer({
  field,
  values,
  setValue,
  error,
}: {
  field: FieldConfig
  values: FormModalValues
  setValue: (name: string, value: string | boolean) => void
  error?: string
}) {
  switch (field.type) {
    case "textarea":
      return (
        <Field
          label={field.label}
          hint={field.hint}
          tooltip={field.tooltip}
          error={error}
          required={field.required}
        >
          <JdhTextarea
            rows={field.rows}
            placeholder={field.placeholder}
            value={String(values[field.name] ?? "")}
            onChange={(e) => setValue(field.name, e.target.value)}
            disabled={field.disabled}
          />
        </Field>
      )
    case "select":
      return (
        <Field
          label={field.label}
          hint={field.hint}
          tooltip={field.tooltip}
          error={error}
          required={field.required}
        >
          <JdhSelect
            options={field.options}
            placeholder={field.placeholder}
            value={String(values[field.name] ?? "")}
            onValueChange={(value) => setValue(field.name, value)}
            disabled={field.disabled}
          />
        </Field>
      )
    case "date":
      return (
        <Field
          label={field.label}
          hint={field.hint}
          tooltip={field.tooltip}
          error={error}
          required={field.required}
        >
          <JdhDatePicker
            value={String(values[field.name] ?? "")}
            onValueChange={(value) => setValue(field.name, value)}
            min={field.min}
            max={field.max}
            disabled={field.disabled}
          />
        </Field>
      )
    case "radio":
      return (
        <Field
          label={field.label}
          hint={field.hint}
          tooltip={field.tooltip}
          error={error}
          required={field.required}
        >
          <JdhRadioGroup
            options={field.options}
            value={String(values[field.name] ?? "")}
            onValueChange={(value) => setValue(field.name, value)}
            disabled={field.disabled}
          />
        </Field>
      )
    case "checkbox":
      return (
        <JdhCheckbox
          label={field.label}
          description={field.description}
          checked={Boolean(values[field.name])}
          onCheckedChange={(checked) => setValue(field.name, checked === true)}
          disabled={field.disabled}
        />
      )
    case "switch":
      return (
        <JdhSwitch
          label={field.label}
          description={field.description}
          checked={Boolean(values[field.name])}
          onCheckedChange={(checked) => setValue(field.name, checked)}
          disabled={field.disabled}
        />
      )
    default:
      return (
        <Field
          label={field.label}
          hint={field.hint}
          tooltip={field.tooltip}
          error={error}
          required={field.required}
        >
          <JdhInput
            type={field.type}
            placeholder={field.placeholder}
            value={String(values[field.name] ?? "")}
            onChange={(e) => setValue(field.name, e.target.value)}
            disabled={field.disabled}
          />
        </Field>
      )
  }
}
