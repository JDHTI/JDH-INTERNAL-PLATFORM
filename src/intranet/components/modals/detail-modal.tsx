"use client"

import * as React from "react"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/intranet/components/ui/dialog"
import { cn } from "@/intranet/lib/utils"

export interface DetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  eyebrow?: string
  /** ContentBadge(s) beside the title. */
  badges?: React.ReactNode
  /** Meta row under the title (author / date / sede). */
  meta?: React.ReactNode
  /** Footer actions; defaults to a single "Cerrar" button. */
  footer?: React.ReactNode
  size?: "md" | "lg"
  children: React.ReactNode
}

const sizeClass = {
  md: "sm:max-w-lg",
  lg: "sm:max-w-3xl",
} as const

/**
 * Read-only detail / preview modal with a fixed header and footer and a
 * scrollable body (`data-lenis-prevent` so Lenis doesn't hijack it).
 */
export function DetailModal({
  open,
  onOpenChange,
  title,
  eyebrow,
  badges,
  meta,
  footer,
  size = "md",
  children,
}: DetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("flex max-h-[85vh] flex-col gap-0 p-0", sizeClass[size])}
      >
        <DialogHeader className="border-b border-border p-4 pr-12">
          {eyebrow ? (
            <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
              {eyebrow}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{title}</DialogTitle>
            {badges}
          </div>
          {meta ? (
            <div className="text-xs text-muted-foreground">{meta}</div>
          ) : null}
        </DialogHeader>

        <div data-lenis-prevent className="flex-1 overflow-y-auto p-4 text-sm">
          {children}
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-4">
          {footer ?? (
            <DialogClose asChild>
              <JdhButton variant="secondary">Cerrar</JdhButton>
            </DialogClose>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
