"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/intranet/components/ui/alert"
import { cn } from "@/intranet/lib/utils"

/**
 * Feedback alert with a subtle semantic tint (DESIGN.md exception, approved:
 * see ARCHITECTURE.md). Type is always carried by icon + title too — never by
 * color alone — via a colored left accent + very light tinted background.
 */
const alertTint = cva("border", {
  variants: {
    variant: {
      info: "border-border border-l-2 border-l-[var(--color-info)] bg-[var(--color-info-subtle)]",
      success:
        "border-border border-l-2 border-l-[var(--color-success)] bg-[var(--color-success-subtle)]",
      warning:
        "border-border border-l-2 border-l-[var(--color-warning)] bg-[var(--color-warning-subtle)]",
      error:
        "border-border border-l-2 border-l-[var(--color-error)] bg-[var(--color-error-subtle)]",
    },
  },
  defaultVariants: { variant: "info" },
})

// `!` beats the ui/alert base rule that forces child svgs to text-current.
const iconConfig = {
  info: { Icon: Info, color: "text-[var(--color-info)]!" },
  success: { Icon: CircleCheck, color: "text-[var(--color-success)]!" },
  warning: { Icon: TriangleAlert, color: "text-[var(--color-warning)]!" },
  error: { Icon: CircleAlert, color: "text-[var(--color-error)]!" },
} as const

export interface JdhAlertProps extends VariantProps<typeof alertTint> {
  title: string
  children?: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

export function JdhAlert({
  variant,
  title,
  children,
  dismissible,
  onDismiss,
  className,
}: JdhAlertProps) {
  const [visible, setVisible] = React.useState(true)
  const resolved = variant ?? "info"
  const { Icon, color } = iconConfig[resolved]

  if (!visible) return null

  const dismiss = () => {
    setVisible(false)
    onDismiss?.()
  }

  return (
    <Alert
      className={cn(alertTint({ variant }), dismissible && "pr-10", className)}
    >
      <Icon className={color} />
      <AlertTitle>{title}</AlertTitle>
      {children ? <AlertDescription>{children}</AlertDescription> : null}
      {dismissible ? (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar"
          className="absolute top-2 right-2 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </Alert>
  )
}
