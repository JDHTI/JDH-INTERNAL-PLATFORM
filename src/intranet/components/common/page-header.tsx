import * as React from "react"

import { SectionHeader } from "./section-header"

interface PageHeaderProps {
  title: string
  description?: string
  /** Optional actions slot (buttons) rendered to the right of the title. */
  children?: React.ReactNode
}

/**
 * Standard page title block. Thin wrapper over `SectionHeader` (compact size) —
 * kept for its existing call sites (module views, showcase). New pages can use
 * `SectionHeader` directly for breadcrumbs / eyebrow / hero variants.
 */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <SectionHeader
      size="compact"
      title={title}
      description={description}
      actions={children}
    />
  )
}
