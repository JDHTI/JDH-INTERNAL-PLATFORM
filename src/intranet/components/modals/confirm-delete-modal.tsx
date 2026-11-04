"use client"

import * as React from "react"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import { Field } from "@/intranet/components/forms/field"
import { JdhInput } from "@/intranet/components/forms/jdh-input"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/intranet/components/ui/alert-dialog"

export interface ConfirmDeleteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  entityName?: string
  /** If set, the user must type this exact text to enable the confirm button. */
  confirmationText?: string
  onConfirm: () => void | Promise<void>
  confirmLabel?: string
  cancelLabel?: string
}

/**
 * Destructive confirmation on top of AlertDialog (no dismiss-on-overlay). The
 * confirm button is the app's single `--destructive` surface; it shows loading
 * while `onConfirm` runs and closes on success. Optional type-to-confirm guard.
 */
export function ConfirmDeleteModal({
  open,
  onOpenChange,
  title,
  description,
  entityName,
  confirmationText,
  onConfirm,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
}: ConfirmDeleteModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <Body
          title={title}
          description={description}
          entityName={entityName}
          confirmationText={confirmationText}
          onConfirm={onConfirm}
          onOpenChange={onOpenChange}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
        />
      </AlertDialogContent>
    </AlertDialog>
  )
}

function Body({
  title,
  description,
  entityName,
  confirmationText,
  onConfirm,
  onOpenChange,
  confirmLabel,
  cancelLabel,
}: Required<Pick<ConfirmDeleteModalProps, "onConfirm" | "onOpenChange">> &
  Pick<
    ConfirmDeleteModalProps,
    "title" | "description" | "entityName" | "confirmationText"
  > & { confirmLabel: string; cancelLabel: string }) {
  const [typed, setTyped] = React.useState("")
  const [pending, setPending] = React.useState(false)

  const needsConfirmation = Boolean(confirmationText)
  const canConfirm = !needsConfirmation || typed === confirmationText

  const handleConfirm = async () => {
    if (!canConfirm) return
    try {
      setPending(true)
      await onConfirm()
      onOpenChange(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {title ?? `¿Eliminar ${entityName ?? "este elemento"}?`}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {description ?? "Esta acción es permanente y no se puede deshacer."}
        </AlertDialogDescription>
      </AlertDialogHeader>

      {needsConfirmation ? (
        <Field label={`Escribe «${confirmationText}» para confirmar`}>
          <JdhInput
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </Field>
      ) : null}

      <AlertDialogFooter>
        <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
        <JdhButton
          variant="destructive"
          loading={pending}
          disabled={!canConfirm}
          onClick={handleConfirm}
        >
          {confirmLabel}
        </JdhButton>
      </AlertDialogFooter>
    </>
  )
}
